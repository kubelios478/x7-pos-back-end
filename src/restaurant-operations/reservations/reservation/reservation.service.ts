import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { Reservation } from './entities/reservation.entity';
import { ReservationTable } from 'src/restaurant-operations/reservations/reservation-table/entities/reservation-table.entity';
import { ReservationStatusHistory } from 'src/restaurant-operations/reservations/reservation-status-history/entities/reservation-status-history.entity';
import { ReservationGuest } from 'src/restaurant-operations/reservations/reservation-guest/entities/reservation-guest.entity';
import { ReservationNote } from 'src/restaurant-operations/reservations/reservation-note/entities/reservation-note.entity';
import { Table } from 'src/restaurant-operations/dining-system/tables/entities/table.entity';
import { GetReservationsQueryDto } from './dto/get-reservations-query.dto';
import {
  OneReservationResponse,
  ReservationResponseDto,
} from './dto/reservation-response.dto';
import { AllPaginatedReservations } from './dto/all-paginated-reservations.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ReservationStatus } from './constants/reservation.constants';

@Injectable()
export class ReservationService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(ReservationTable)
    private readonly reservationTableRepository: Repository<ReservationTable>,
    @InjectRepository(ReservationStatusHistory)
    private readonly statusHistoryRepository: Repository<ReservationStatusHistory>,
    @InjectRepository(ReservationGuest)
    private readonly guestRepository: Repository<ReservationGuest>,
    @InjectRepository(ReservationNote)
    private readonly noteRepository: Repository<ReservationNote>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
  ) {}

  /**
   * Alta de reserva.
   *
   * `createdByUserId` viene del JWT, NO del cuerpo: el DTO no expone `created_by` a propósito
   * — aceptarlo del cliente permitiría firmar la reserva con el id de otro compañero, y el
   * campo existe justamente para auditar quién la tomó.
   */
  async create(
    merchantId: number,
    createReservationDto: CreateReservationDto,
    createdByUserId?: number,
  ): Promise<OneReservationResponse> {
    const { table_ids, ...reservationData } = createReservationDto;

    // Check table availability and existence
    if (table_ids && table_ids.length > 0) {
      const tables = await this.tableRepository.findBy({
        id: In(table_ids),
        merchant_id: merchantId,
      });

      if (tables.length !== table_ids.length) {
        ErrorHandler.notFound(
          'One or more tables not found or do not belong to your merchant',
        );
      }

      await this.checkTableAvailability(
        merchantId,
        table_ids,
        createReservationDto.reservation_date,
        createReservationDto.duration_minutes || 120,
      );
    }

    try {
      const newReservation = this.reservationRepository.create({
        ...reservationData,
        merchant_id: merchantId,
        reservation_date: new Date(createReservationDto.reservation_date),
        status: createReservationDto.status || ReservationStatus.PENDING,
        created_by: createdByUserId,
        // Una reserva que nace ya sentada (walk-in que se acomoda en el momento) sella su
        // hora de llegada aquí; si no, la sella la transición a SEATED.
        seated_at:
          createReservationDto.status === ReservationStatus.SEATED
            ? new Date(createReservationDto.seated_at ?? Date.now())
            : createReservationDto.seated_at
              ? new Date(createReservationDto.seated_at)
              : undefined,
      });

      const savedReservation =
        await this.reservationRepository.save(newReservation);

      // Save associated tables if provided
      if (table_ids && table_ids.length > 0) {
        const tables = await this.tableRepository.findBy({
          id: In(table_ids),
          merchant_id: merchantId,
        });

        const reservationTables = tables.map((table) =>
          this.reservationTableRepository.create({
            reservation_id: savedReservation.id,
            table_id: table.id,
          }),
        );

        await this.reservationTableRepository.save(reservationTables);
      }

      // Initial status history
      await this.statusHistoryRepository.save(
        this.statusHistoryRepository.create({
          reservation_id: savedReservation.id,
          status: savedReservation.status,
          changed_by: createdByUserId,
        }),
      );

      return this.findOne(savedReservation.id, merchantId, 'Created');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findAll(
    queryDto: GetReservationsQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedReservations> {
    const {
      page = 1,
      limit = 10,
      date,
      date_from,
      date_to,
      customer_id,
      status,
      guest_name,
    } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.guests', 'guests')
      .leftJoinAndSelect('reservation.tables', 'tables')
      .leftJoinAndSelect('reservation.notes', 'notes')
      .leftJoinAndSelect('reservation.statusHistory', 'statusHistory')
      .where('reservation.merchant_id = :merchantId', { merchantId })
      .andWhere('reservation.is_active = :isActive', { isActive: true });

    // Rango semiabierto [inicio, fin) en vez de `DATE(reservation_date) = :date`: envolver la
    // columna en una función la vuelve NO sargable, así que Postgres descartaba el índice
    // compuesto @Index(['merchant_id','reservation_date']) y resolvía el calendario con un
    // seq scan sobre toda la tabla de reservas. Comparando la columna desnuda contra dos
    // instantes, el índice se usa tal cual.
    const range = this.resolveDateRange(date, date_from, date_to);
    if (range) {
      queryBuilder.andWhere(
        'reservation.reservation_date >= :rangeStart AND reservation.reservation_date < :rangeEnd',
        { rangeStart: range.start, rangeEnd: range.end },
      );
    }

    if (customer_id) {
      queryBuilder.andWhere('reservation.customer_id = :customer_id', {
        customer_id,
      });
    }

    if (status) {
      queryBuilder.andWhere('reservation.status = :status', { status });
    }

    if (guest_name) {
      queryBuilder.andWhere('LOWER(guests.name) LIKE LOWER(:guestName)', {
        guestName: `%${guest_name}%`,
      });
    }

    const total = await queryBuilder.getCount();
    const reservations = await queryBuilder
      .orderBy('reservation.reservation_date', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const data: ReservationResponseDto[] = reservations.map((reservation) =>
      this.mapToResponseDto(reservation),
    );

    return {
      statusCode: 200,
      message: 'Reservations retrieved successfully',
      data,
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async findOne(
    id: number,
    merchantId: number,
    action?: string,
  ): Promise<OneReservationResponse> {
    const reservation = await this.reservationRepository.findOne({
      where: { id, merchant_id: merchantId, is_active: true },
      relations: [
        'customer',
        'merchant',
        'tables',
        'tables.table',
        'guests',
        'notes',
        'statusHistory',
      ],
    });

    if (!reservation) {
      ErrorHandler.notFound('Reservation not found');
    }

    return {
      statusCode: action === 'Created' ? 201 : 200,
      message: `Reservation ${action || 'retrieved'} successfully`,
      data: this.mapToResponseDto(reservation),
    };
  }

  async update(
    id: number,
    merchantId: number,
    updateReservationDto: UpdateReservationDto,
    changedByUserId?: number,
  ): Promise<OneReservationResponse> {
    const reservation = await this.reservationRepository.findOneBy({
      id,
      merchant_id: merchantId,
      is_active: true,
    });

    if (!reservation) {
      ErrorHandler.notFound('Reservation not found');
    }

    // Check table availability if date or table_ids are updated
    if (
      updateReservationDto.reservation_date ||
      updateReservationDto['table_ids']
    ) {
      const date =
        updateReservationDto.reservation_date ||
        reservation.reservation_date.toISOString();
      const duration =
        updateReservationDto.duration_minutes || reservation.duration_minutes;

      // If table_ids not provided, use current tables
      let tableIds = updateReservationDto['table_ids'];
      if (!tableIds) {
        const currentTables = await this.reservationTableRepository.findBy({
          reservation_id: id,
          is_active: true,
        });
        tableIds = currentTables.map((t) => t.table_id);
      }

      if (tableIds && tableIds.length > 0) {
        await this.checkTableAvailability(
          merchantId,
          tableIds,
          date,
          duration,
          id,
        );
      }
    }

    const oldStatus = reservation.status;

    // Guarda del ciclo de vida: un salto que no esté en el grafo (de CANCELLED a COMPLETED,
    // por ejemplo) deja el histórico en un estado imposible, así que se rechaza aquí y no
    // sólo en la UI — el endpoint es público para cualquier cliente del POS.
    if (
      updateReservationDto.status &&
      updateReservationDto.status !== oldStatus
    ) {
      this.assertLegalTransition(oldStatus, updateReservationDto.status);
    }

    Object.assign(reservation, updateReservationDto);

    if (updateReservationDto.reservation_date) {
      reservation.reservation_date = new Date(
        updateReservationDto.reservation_date,
      );
    }

    // Sello automático de llegada: entrar en SEATED fija seated_at = NOW(). No se reescribe si
    // la reserva ya lo traía — la primera marca es la hora real a la que el grupo se sentó.
    if (
      updateReservationDto.status === ReservationStatus.SEATED &&
      oldStatus !== ReservationStatus.SEATED &&
      !reservation.seated_at
    ) {
      reservation.seated_at = new Date();
    }

    try {
      await this.reservationRepository.save(reservation);

      if (
        updateReservationDto.status &&
        updateReservationDto.status !== oldStatus
      ) {
        await this.statusHistoryRepository.save(
          this.statusHistoryRepository.create({
            reservation_id: id,
            status: updateReservationDto.status,
            changed_by: changedByUserId,
          }),
        );
      }

      return this.findOne(id, merchantId, 'Updated');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(
    id: number,
    merchantId: number,
  ): Promise<OneReservationResponse> {
    const reservation = await this.reservationRepository.findOneBy({
      id,
      merchant_id: merchantId,
      is_active: true,
    });

    if (!reservation) {
      ErrorHandler.notFound('Reservation not found');
    }

    try {
      reservation.is_active = false;
      await this.reservationRepository.save(reservation);

      // Deactivate associated tables
      await this.reservationTableRepository.update(
        { reservation_id: id },
        { is_active: false },
      );

      // Deactivate associated guests
      await this.guestRepository.update(
        { reservation_id: id },
        { is_active: false },
      );

      // Deactivate associated notes
      await this.noteRepository.update(
        { reservation_id: id },
        { is_active: false },
      );

      return {
        statusCode: 200,
        message: 'Reservation deleted successfully',
        data: this.mapToResponseDto(reservation),
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async cancel(
    id: number,
    merchantId: number,
  ): Promise<OneReservationResponse> {
    const reservation = await this.reservationRepository.findOneBy({
      id,
      merchant_id: merchantId,
      is_active: true,
    });

    if (!reservation) {
      ErrorHandler.notFound('Reservation not found');
    }

    try {
      reservation.status = ReservationStatus.CANCELLED;
      await this.reservationRepository.save(reservation);

      // Log status change
      await this.statusHistoryRepository.save(
        this.statusHistoryRepository.create({
          reservation_id: id,
          status: ReservationStatus.CANCELLED,
        }),
      );

      return this.findOne(id, merchantId, 'Cancelled');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  /**
   * Grafo de transiciones legales del ciclo de vida de una reserva.
   *
   * Lo que no aparece aquí es un salto ilegal. COMPLETED, CANCELLED y NO_SHOW son terminales:
   * una reserva anulada no puede "terminar de cenar", y una ausencia no se convierte en un
   * servicio. SEATED sólo avanza a COMPLETED, porque anular una mesa que ya está comiendo no
   * es una operación de sala (para eso está cerrar la comanda).
   */
  private static readonly ALLOWED_TRANSITIONS: Record<
    ReservationStatus,
    ReservationStatus[]
  > = {
    [ReservationStatus.PENDING]: [
      ReservationStatus.CONFIRMED,
      ReservationStatus.SEATED,
      ReservationStatus.CANCELLED,
      ReservationStatus.NO_SHOW,
      ReservationStatus.WAIT_LIST,
    ],
    [ReservationStatus.CONFIRMED]: [
      ReservationStatus.SEATED,
      ReservationStatus.CANCELLED,
      ReservationStatus.NO_SHOW,
    ],
    [ReservationStatus.SEATED]: [ReservationStatus.COMPLETED],
    [ReservationStatus.COMPLETED]: [],
    [ReservationStatus.CANCELLED]: [],
    [ReservationStatus.NO_SHOW]: [],
    [ReservationStatus.WAIT_LIST]: [
      ReservationStatus.PENDING,
      ReservationStatus.CONFIRMED,
      ReservationStatus.CANCELLED,
      ReservationStatus.NO_SHOW,
    ],
  };

  private assertLegalTransition(
    from: ReservationStatus,
    to: ReservationStatus,
  ): void {
    const allowed = ReservationService.ALLOWED_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      ErrorHandler.badRequest(
        `Illegal reservation lifecycle transition: '${from}' cannot become '${to}'.` +
          (allowed.length
            ? ` Allowed from '${from}': ${allowed.join(', ')}.`
            : ` '${from}' is a terminal state.`),
      );
    }
  }

  /**
   * Traduce los filtros de fecha a un rango semiabierto [inicio, fin).
   *
   * `date` es un día de calendario LOCAL del servidor (el reloj del local), no un día UTC:
   * partir el servicio por el meridiano de Greenwich movería las cenas tardías al día
   * siguiente. `date_from`/`date_to` mandan sobre `date` cuando vienen, que es como pide el
   * rango la vista de semana/mes.
   */
  private resolveDateRange(
    date?: string,
    dateFrom?: string,
    dateTo?: string,
  ): { start: Date; end: Date } | null {
    if (dateFrom || dateTo) {
      const start = dateFrom ? new Date(dateFrom) : new Date(0);
      // Sin cierre explícito el rango queda abierto hacia adelante (reservas futuras).
      const end = dateTo ? new Date(dateTo) : new Date(8640000000000000);
      return { start, end };
    }

    if (!date) return null;

    const [year, month, day] = date.split('-').map(Number);
    if (!year || !month || !day) return null;

    return {
      start: new Date(year, month - 1, day, 0, 0, 0, 0),
      end: new Date(year, month - 1, day + 1, 0, 0, 0, 0),
    };
  }

  private async checkTableAvailability(
    merchantId: number,
    tableIds: number[],
    date: string | Date,
    durationMinutes: number,
    excludeReservationId?: number,
  ) {
    const start = new Date(date);
    const end = new Date(start.getTime() + durationMinutes * 60000);

    const query = this.reservationTableRepository
      .createQueryBuilder('resTable')
      .innerJoin('resTable.reservation', 'reservation')
      .where('resTable.table_id IN (:...tableIds)', { tableIds })
      .andWhere('resTable.is_active = :isActive', { isActive: true })
      .andWhere('reservation.merchant_id = :merchantId', { merchantId })
      .andWhere('reservation.is_active = :resActive', { resActive: true })
      .andWhere('reservation.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [
          ReservationStatus.CANCELLED,
          ReservationStatus.NO_SHOW,
        ],
      })
      .andWhere(
        "(reservation.reservation_date < :end AND (reservation.reservation_date + (reservation.duration_minutes || ' minutes')::interval) > :start)",
        { start, end },
      );

    if (excludeReservationId) {
      query.andWhere('reservation.id != :excludeReservationId', {
        excludeReservationId,
      });
    }

    const conflict = await query.getOne();

    if (conflict) {
      ErrorHandler.badRequest(
        `One or more tables are already booked for the selected time range.`,
      );
    }
  }

  private mapToResponseDto(reservation: Reservation): ReservationResponseDto {
    const response: ReservationResponseDto = {
      id: reservation.id,
      merchant_id: reservation.merchant_id,
      customer_id: reservation.customer_id,
      reservation_date: reservation.reservation_date,
      duration_minutes: reservation.duration_minutes,
      seated_at: reservation.seated_at,
      party_size: reservation.party_size,
      status: reservation.status,
      source: reservation.source,
      special_requests: reservation.special_requests,
      created_by: reservation.created_by,
      created_at: reservation.created_at,
    };

    if (reservation.guests) {
      response.guests = reservation.guests
        .filter((guest) => guest.is_active)
        .map((guest) => ({
          id: guest.id,
          reservation_id: guest.reservation_id,
          name: guest.name,
          email: guest.email,
          phone: guest.phone,
          is_primary: guest.is_primary,
          is_active: guest.is_active,
        }));
    }

    if (reservation.tables) {
      response.tables = reservation.tables
        .filter((resTable) => resTable.is_active)
        .map((resTable) => ({
          reservation_id: resTable.reservation_id,
          table_id: resTable.table_id,
          is_active: resTable.is_active,
        }));
    }

    if (reservation.notes) {
      response.notes = reservation.notes
        .filter((note) => note.is_active)
        .map((note) => ({
          id: note.id,
          reservation_id: note.reservation_id,
          note: note.note,
          created_by: note.created_by,
          created_at: note.created_at,
          is_active: note.is_active,
        }));
    }

    if (reservation.statusHistory) {
      response.status_history = reservation.statusHistory;
    }

    return response;
  }
}
