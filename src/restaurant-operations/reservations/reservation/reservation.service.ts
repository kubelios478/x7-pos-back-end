import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository, In } from 'typeorm';
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
import { resolveLocalDateRange } from '../utils/local-date-range.util';
import { ReservationCapacityService } from '../reservation-capacity/reservation-capacity.service';
import { ManagerOverrideDto } from '../reservation-capacity/dto/manager-override.dto';

/**
 * Estados en los que una reserva pasa por la guarda de aforo al darse de alta. SEATED no: un
 * walk-in que ya está sentado es un hecho físico, y bloquearlo sólo obligaría a mentir en el
 * sistema. La lista de espera es, por definición, lo que no cabe.
 */
const CAPACITY_GUARDED_ON_CREATE: ReservationStatus[] = [
  ReservationStatus.PENDING,
  ReservationStatus.CONFIRMED,
];

/** Duración por defecto de la columna `duration_minutes` (la de la entidad). */
const DEFAULT_DURATION_MINUTES = 90;

@Injectable()
export class ReservationService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(ReservationTable)
    private readonly reservationTableRepository: Repository<ReservationTable>,
    @InjectRepository(ReservationGuest)
    private readonly guestRepository: Repository<ReservationGuest>,
    @InjectRepository(ReservationNote)
    private readonly noteRepository: Repository<ReservationNote>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    private readonly dataSource: DataSource,
    private readonly capacityService: ReservationCapacityService,
  ) {}

  /**
   * Pasa la guarda de aforo y ritmo DENTRO de la transacción y, si la franja se forzó con
   * override, deja en la reserva quién lo autorizó y cuándo.
   */
  private async applyCapacityGuard(
    manager: EntityManager,
    merchantId: number,
    reservation: Reservation,
    override?: ManagerOverrideDto,
    excludeReservationId?: number,
  ): Promise<void> {
    const decision = await this.capacityService.assertBookable(
      manager,
      merchantId,
      {
        start: new Date(reservation.reservation_date),
        durationMinutes: reservation.duration_minutes || DEFAULT_DURATION_MINUTES,
        partySize: reservation.party_size,
        excludeReservationId,
      },
      override,
    );
    if (decision.overrideBy != null) {
      reservation.capacity_override_by = decision.overrideBy;
      reservation.capacity_override_at = new Date();
    }
  }

  /**
   * Apunta una transición en el histórico de estados DENTRO de la transacción que cambia el
   * estado. Por separado, un fallo del INSERT dejaba la reserva en su nuevo estado sin rastro
   * en el histórico, y el histórico es precisamente la prueba de auditoría de quién hizo qué.
   *
   * `changedBy` es el usuario del JWT; `null` queda reservado a los procesos automáticos
   * (el marcado de no-show por vencimiento), que es como la UI distingue "Automated System".
   */
  private logStatusChange(
    manager: EntityManager,
    reservationId: number,
    status: ReservationStatus,
    changedBy?: number,
  ): Promise<ReservationStatusHistory> {
    const history = manager.getRepository(ReservationStatusHistory);
    return history.save(
      history.create({
        reservation_id: reservationId,
        status,
        changed_by: changedBy ?? null,
      }),
    );
  }

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
    const { table_ids, manager_override, ...reservationData } =
      createReservationDto;

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

      // Reserva, mesas y primera entrada del histórico van juntas: una reserva sin su
      // estado inicial registrado rompería el cálculo de tiempos del histórico.
      const savedReservation = await this.dataSource.transaction(
        async (manager) => {
          if (CAPACITY_GUARDED_ON_CREATE.includes(newReservation.status)) {
            newReservation.duration_minutes ??= DEFAULT_DURATION_MINUTES;
            await this.applyCapacityGuard(
              manager,
              merchantId,
              newReservation,
              manager_override,
            );
          }

          const saved = await manager
            .getRepository(Reservation)
            .save(newReservation);

          if (table_ids && table_ids.length > 0) {
            const tables = await manager.getRepository(Table).findBy({
              id: In(table_ids),
              merchant_id: merchantId,
            });

            const links = manager.getRepository(ReservationTable);
            await links.save(
              tables.map((table) =>
                links.create({
                  reservation_id: saved.id,
                  table_id: table.id,
                }),
              ),
            );
          }

          await this.logStatusChange(
            manager,
            saved.id,
            saved.status,
            createdByUserId,
          );
          return saved;
        },
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
    const range = resolveLocalDateRange(date, date_from, date_to);
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

    const { manager_override, ...changes } = updateReservationDto;

    // La guarda de aforo se repite al CONFIRMAR (la PENDING aún no ocupaba sillas) y al mover
    // la franja o el tamaño de una reserva viva. Se compara contra el valor previo para no
    // exigir override por reenviar el mismo formulario sin cambios.
    const previousStart = new Date(reservation.reservation_date).getTime();
    const windowChanged =
      (changes.reservation_date != null &&
        new Date(changes.reservation_date).getTime() !== previousStart) ||
      (changes.duration_minutes != null &&
        changes.duration_minutes !== reservation.duration_minutes) ||
      (changes.party_size != null && changes.party_size !== reservation.party_size);
    const nextStatus = changes.status ?? oldStatus;
    const enteringConfirmed =
      nextStatus === ReservationStatus.CONFIRMED &&
      oldStatus !== ReservationStatus.CONFIRMED;
    const needsCapacityGuard =
      enteringConfirmed ||
      (windowChanged && CAPACITY_GUARDED_ON_CREATE.includes(nextStatus));

    Object.assign(reservation, changes);

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
      await this.dataSource.transaction(async (manager) => {
        if (needsCapacityGuard) {
          await this.applyCapacityGuard(
            manager,
            merchantId,
            reservation,
            manager_override,
            id,
          );
        }

        await manager.getRepository(Reservation).save(reservation);

        if (
          updateReservationDto.status &&
          updateReservationDto.status !== oldStatus
        ) {
          await this.logStatusChange(
            manager,
            id,
            updateReservationDto.status,
            changedByUserId,
          );
        }
      });

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

  /**
   * Anulación. Pasa por la MISMA guarda de ciclo de vida que el PATCH: sin ella, una reserva
   * ya COMPLETED o NO_SHOW se podía "anular" y el histórico acababa con un CANCELLED detrás
   * de un estado terminal. Y firma con el usuario del JWT — antes no firmaba, así que cada
   * anulación hecha por un camarero se leía en la auditoría como "Automated System".
   */
  async cancel(
    id: number,
    merchantId: number,
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

    this.assertLegalTransition(reservation.status, ReservationStatus.CANCELLED);

    try {
      reservation.status = ReservationStatus.CANCELLED;
      await this.dataSource.transaction(async (manager) => {
        await manager.getRepository(Reservation).save(reservation);
        await this.logStatusChange(
          manager,
          id,
          ReservationStatus.CANCELLED,
          changedByUserId,
        );
      });

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
      capacity_override_by: reservation.capacity_override_by ?? null,
      capacity_override_at: reservation.capacity_override_at ?? null,
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
