import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, ILike, Not, Repository } from 'typeorm';
import { CreateReservationGuestDto } from './dto/create-reservation-guest.dto';
import { UpdateReservationGuestDto } from './dto/update-reservation-guest.dto';
import { ReservationGuest } from './entities/reservation-guest.entity';
import { Reservation } from 'src/restaurant-operations/reservations/reservation/entities/reservation.entity';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { AllPaginatedReservationGuests } from './dto/all-paginated-reservation-guests.dto';
import {
  OneReservationGuestResponse,
  ReservationGuestResponseDto,
} from './dto/reservation-guest-response.dto';
import { GetReservationGuestsQueryDto } from './dto/get-reservation-guests-query.dto';

@Injectable()
export class ReservationGuestService {
  constructor(
    @InjectRepository(ReservationGuest)
    private readonly guestRepository: Repository<ReservationGuest>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createGuestDto: CreateReservationGuestDto,
    merchantId: number,
  ): Promise<OneReservationGuestResponse> {
    await this.validateReservationOwnership(
      createGuestDto.reservation_id,
      merchantId,
    );

    try {
      // Alta y exclusividad del principal en una transacción: dar de alta a un contacto
      // principal y degradar al anterior son una sola decisión, y dejarlas a medias produce
      // exactamente lo que la regla prohíbe — dos principales en la misma reserva.
      const saved = await this.dataSource.transaction(async (manager) => {
        const guest = manager.create(ReservationGuest, createGuestDto);
        const row = await manager.save(ReservationGuest, guest);

        if (row.is_primary) {
          await this.demoteOtherPrimaries(manager, row.reservation_id, row.id);
        } else {
          // Un roster no puede quedarse sin cabeza: el primer invitado de una reserva es su
          // contacto principal aunque nadie lo haya marcado.
          await this.ensureRosterHasPrimary(manager, row.reservation_id);
        }

        return manager.findOneByOrFail(ReservationGuest, { id: row.id });
      });

      return {
        statusCode: 201,
        message: 'Guest added successfully',
        data: this.mapToResponseDto(saved),
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findAll(
    reservationId: number,
    merchantId: number,
    page = 1,
    limit = 10,
  ): Promise<AllPaginatedReservationGuests> {
    return this.findAllGlobal(merchantId, {
      reservation_id: reservationId,
      page,
      limit,
    });
  }

  async findAllGlobal(
    merchantId: number,
    queryDto: GetReservationGuestsQueryDto,
  ): Promise<AllPaginatedReservationGuests> {
    const { page = 1, limit = 10, reservation_id, name, search } = queryDto;
    const skip = (page - 1) * limit;

    const base: any = {
      is_active: true,
      reservation: { merchant_id: merchantId },
    };

    if (reservation_id) base.reservation_id = reservation_id;
    if (name) base.name = ILike(`%${name}%`);

    // Los tres identificadores con los que un cliente se presenta al teléfono. TypeORM une
    // con OR las condiciones de un array de `where`, así que el ámbito del comercio y el
    // filtro de reserva se repiten en cada rama — quitarlos de una sola filtraría de menos.
    const term = search?.trim();
    const where = term
      ? [
          { ...base, name: ILike(`%${term}%`) },
          { ...base, email: ILike(`%${term}%`) },
          { ...base, phone: ILike(`%${term}%`) },
        ]
      : base;

    const [guests, total] = await this.guestRepository.findAndCount({
      where,
      relations: ['reservation'],
      skip,
      take: limit,
      order: { id: 'DESC' },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'All merchant guests retrieved successfully',
      data: guests.map((guest) => this.mapToResponseDto(guest)),
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async findOne(
    id: number,
    merchantId: number,
    action?: string,
  ): Promise<OneReservationGuestResponse> {
    const guest = await this.guestRepository.findOne({
      where: { id, is_active: true },
      relations: ['reservation'],
    });

    if (!guest || guest.reservation.merchant_id !== merchantId) {
      ErrorHandler.notFound('Guest not found');
    }

    return {
      statusCode: 200,
      message: `Guest ${action || 'retrieved'} successfully`,
      data: this.mapToResponseDto(guest),
    };
  }

  async update(
    id: number,
    updateGuestDto: UpdateReservationGuestDto,
    merchantId: number,
  ): Promise<OneReservationGuestResponse> {
    await this.findOne(id, merchantId);
    const guest = await this.guestRepository.findOneBy({ id });

    if (!guest) {
      ErrorHandler.notFound('Guest not found');
    }

    const wasPrimary = guest.is_primary;
    Object.assign(guest, updateGuestDto);

    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        const row = await manager.save(ReservationGuest, guest);

        if (row.is_primary) {
          await this.demoteOtherPrimaries(manager, row.reservation_id, row.id);
        } else if (wasPrimary) {
          // Renunciar a ser principal (o desactivarse) deja la reserva sin contacto: se
          // eleva al siguiente del roster en vez de dejar a la sala sin a quién llamar.
          await this.ensureRosterHasPrimary(manager, row.reservation_id);
        }

        return manager.findOneByOrFail(ReservationGuest, { id: row.id });
      });

      return {
        statusCode: 200,
        message: 'Guest updated successfully',
        data: this.mapToResponseDto(saved),
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(
    id: number,
    merchantId: number,
  ): Promise<OneReservationGuestResponse> {
    const guestRes = await this.findOne(id, merchantId);
    const guest = await this.guestRepository.findOneBy({ id });

    if (!guest) {
      ErrorHandler.notFound('Guest not found');
    }

    await this.dataSource.transaction(async (manager) => {
      guest.is_active = false;
      guest.is_primary = false;
      await manager.save(ReservationGuest, guest);
      // Quitar al principal promueve al siguiente activo del roster.
      await this.ensureRosterHasPrimary(manager, guest.reservation_id);
    });

    return {
      statusCode: 200,
      message: 'Guest removed successfully',
      data: guestRes.data,
    };
  }

  /**
   * Deja a `keepId` como ÚNICO contacto principal de su reserva.
   *
   * La restricción "exactamente uno" no existe en la base (no hay índice parcial único), así
   * que la sostiene el servicio. Sin esto, marcar a un segundo invitado como principal dejaba
   * dos, y la sala no sabía a cuál de los dos llamar.
   */
  private async demoteOtherPrimaries(
    manager: EntityManager,
    reservationId: number,
    keepId: number,
  ): Promise<void> {
    await manager.update(
      ReservationGuest,
      { reservation_id: reservationId, id: Not(keepId), is_primary: true },
      { is_primary: false },
    );
  }

  /**
   * Garantiza que la reserva conserve un contacto principal.
   *
   * Si ya hay uno activo no toca nada. Si no queda ninguno, eleva al invitado activo más
   * antiguo: es el que se registró primero, casi siempre quien hizo la reserva.
   */
  private async ensureRosterHasPrimary(
    manager: EntityManager,
    reservationId: number,
  ): Promise<void> {
    const current = await manager.findOne(ReservationGuest, {
      where: { reservation_id: reservationId, is_primary: true, is_active: true },
    });
    if (current) return;

    const next = await manager.findOne(ReservationGuest, {
      where: { reservation_id: reservationId, is_active: true },
      order: { id: 'ASC' },
    });
    if (!next) return; // Roster vacío: no hay a quién elevar.

    next.is_primary = true;
    await manager.save(ReservationGuest, next);
  }

  private mapToResponseDto(
    guest: ReservationGuest,
  ): ReservationGuestResponseDto {
    return {
      id: guest.id,
      reservation_id: guest.reservation_id,
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      is_primary: guest.is_primary,
      is_active: guest.is_active,
    };
  }

  private async validateReservationOwnership(
    reservationId: number,
    merchantId: number,
  ) {
    const reservation = await this.reservationRepository.findOneBy({
      id: reservationId,
      merchant_id: merchantId,
      is_active: true,
    });

    if (!reservation) {
      ErrorHandler.notFound(
        'Reservation not found or does not belong to your merchant',
      );
    }
  }
}
