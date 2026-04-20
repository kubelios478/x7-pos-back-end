import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { CreateReservationGuestDto } from './dto/create-reservation-guest.dto';
import { UpdateReservationGuestDto } from './dto/update-reservation-guest.dto';
import { ReservationGuest } from './entities/reservation-guest.entity';
import { Reservation } from 'src/restaurant-operations/reservations/reservation/entities/reservation.entity';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { AllPaginatedReservationGuests } from './dto/all-paginated-reservation-guests.dto';
import { OneReservationGuestResponse, ReservationGuestResponseDto } from './dto/reservation-guest-response.dto';
import { GetReservationGuestsQueryDto } from './dto/get-reservation-guests-query.dto';

@Injectable()
export class ReservationGuestService {
  constructor(
    @InjectRepository(ReservationGuest)
    private readonly guestRepository: Repository<ReservationGuest>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
  ) { }

  async create(createGuestDto: CreateReservationGuestDto, merchantId: number): Promise<OneReservationGuestResponse> {
    await this.validateReservationOwnership(createGuestDto.reservation_id, merchantId);

    try {
      const guest = this.guestRepository.create(createGuestDto);
      const saved = await this.guestRepository.save(guest);
      return {
        statusCode: 201,
        message: 'Guest added successfully',
        data: this.mapToResponseDto(saved),
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findAll(reservationId: number, merchantId: number, page = 1, limit = 10): Promise<AllPaginatedReservationGuests> {
    return this.findAllGlobal(merchantId, { reservation_id: reservationId, page, limit });
  }

  async findAllGlobal(merchantId: number, queryDto: GetReservationGuestsQueryDto): Promise<AllPaginatedReservationGuests> {
    const { page = 1, limit = 10, reservation_id, name } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      is_active: true,
      reservation: { merchant_id: merchantId }
    };

    if (reservation_id) where.reservation_id = reservation_id;
    if (name) where.name = ILike(`%${name}%`);

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
      data: guests,
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async findOne(id: number, merchantId: number, action?: string): Promise<OneReservationGuestResponse> {
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

  async update(id: number, updateGuestDto: UpdateReservationGuestDto, merchantId: number): Promise<OneReservationGuestResponse> {
    await this.findOne(id, merchantId);
    const guest = await this.guestRepository.findOneBy({ id });

    if (!guest) {
      ErrorHandler.notFound('Guest not found');
    }

    Object.assign(guest, updateGuestDto);
    try {
      const saved = await this.guestRepository.save(guest);
      return {
        statusCode: 200,
        message: 'Guest updated successfully',
        data: this.mapToResponseDto(saved),
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(id: number, merchantId: number): Promise<OneReservationGuestResponse> {
    const guestRes = await this.findOne(id, merchantId);
    const guest = await this.guestRepository.findOneBy({ id });

    if (!guest) {
      ErrorHandler.notFound('Guest not found');
    }

    guest.is_active = false;
    await this.guestRepository.save(guest);
    return {
      statusCode: 200,
      message: 'Guest removed successfully',
      data: guestRes.data,
    };
  }

  private mapToResponseDto(guest: ReservationGuest): ReservationGuestResponseDto {
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

  private async validateReservationOwnership(reservationId: number, merchantId: number) {
    const reservation = await this.reservationRepository.findOneBy({
      id: reservationId,
      merchant_id: merchantId,
      is_active: true,
    });

    if (!reservation) {
      ErrorHandler.notFound('Reservation not found or does not belong to your merchant');
    }
  }
}
