import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { And, In, IsNull, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { GetReservationStatusHistoryQueryDto } from './dto/get-reservation-status-history-query.dto';
import { ReservationStatusHistory } from './entities/reservation-status-history.entity';
import { Reservation } from '../reservation/entities/reservation.entity';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { AllPaginatedReservationStatusHistory } from './dto/all-paginated-reservation-status-history.dto';
import {
  OneReservationStatusHistoryResponse,
  ReservationStatusHistoryResponseDto,
} from './dto/reservation-status-history-response.dto';
import { resolveLocalDateRange } from '../utils/local-date-range.util';

type PreviousEntry = Pick<ReservationStatusHistory, 'status' | 'changed_at'>;

@Injectable()
export class ReservationStatusHistoryService {
  constructor(
    @InjectRepository(ReservationStatusHistory)
    private readonly historyRepository: Repository<ReservationStatusHistory>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
  ) {}

  /**
   * Ciclo de vida de UNA reserva. Una reserva inexistente, borrada o de otro comercio es un
   * 404: antes devolvía 200 con una lista vacía, indistinguible de "aún no ha cambiado".
   */
  async findAll(
    reservationId: number,
    merchantId: number,
    page = 1,
    limit = 10,
  ): Promise<AllPaginatedReservationStatusHistory> {
    const exists = await this.reservationRepository.exists({
      where: { id: reservationId, merchant_id: merchantId, is_active: true },
    });
    if (!exists) {
      ErrorHandler.notFound('Reservation not found');
    }

    return this.findAllGlobal(merchantId, {
      reservation_id: reservationId,
      page,
      limit,
    });
  }

  async findAllGlobal(
    merchantId: number,
    queryDto: GetReservationStatusHistoryQueryDto,
  ): Promise<AllPaginatedReservationStatusHistory> {
    const {
      page = 1,
      limit = 10,
      reservation_id,
      status,
      date,
      date_from,
      date_to,
      changed_by,
      automated,
    } = queryDto;
    const skip = (page - 1) * limit;

    // `reservation.is_active`: el borrado de una reserva es LÓGICO, así que su histórico no
    // desaparece por la FK en cascada (que sólo actúa en un DELETE físico). Se oculta aquí en
    // vez de marcar las filas, porque el histórico no se modifica nunca.
    const where: any = {
      is_active: true,
      reservation: { merchant_id: merchantId, is_active: true },
    };

    if (reservation_id) where.reservation_id = reservation_id;
    if (status) where.status = status;
    if (automated) where.changed_by = IsNull();
    else if (changed_by != null) where.changed_by = changed_by;

    // "Hoy" es el día en que se REGISTRÓ el cambio (changed_at), no el día de la reserva:
    // una confirmación hecha hoy para la cena del sábado es actividad de hoy.
    const range = resolveLocalDateRange(date, date_from, date_to);
    if (range) {
      where.changed_at = And(MoreThanOrEqual(range.start), LessThan(range.end));
    }

    const [data, total] = await this.historyRepository.findAndCount({
      where,
      relations: ['reservation', 'reservation.guests', 'reservation.customer'],
      skip,
      take: limit,
      // Dos cambios en el mismo instante (alta + confirmación de un script) se desempatan por
      // id, que es el orden de inserción: sin esto el orden entre ellos no está garantizado.
      order: { changed_at: 'DESC', id: 'DESC' },
    });

    const previousById = await this.resolvePreviousEntries(data);
    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'All merchant status history retrieved successfully',
      data: data.map((h) => this.mapToResponseDto(h, previousById.get(h.id))),
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
  ): Promise<OneReservationStatusHistoryResponse> {
    const history = await this.historyRepository.findOne({
      where: { id, is_active: true },
      relations: ['reservation', 'reservation.guests', 'reservation.customer'],
    });

    if (
      !history ||
      history.reservation.merchant_id !== merchantId ||
      !history.reservation.is_active
    ) {
      ErrorHandler.notFound('Status history entry not found');
    }

    const previousById = await this.resolvePreviousEntries([history]);

    return {
      statusCode: 200,
      message: 'Status history entry retrieved successfully',
      data: this.mapToResponseDto(history, previousById.get(history.id)),
    };
  }

  /**
   * Entrada anterior de cada fila, dentro de SU reserva.
   *
   * Se resuelve contra el histórico completo de las reservas de la página y no contra la
   * página misma: con un filtro de día o de estado, la entrada anterior casi nunca está en
   * el mismo resultado (el alta PENDING se hizo ayer; el filtro deja fuera los SEATED). Es
   * una sola consulta indexada por (reservation_id, changed_at).
   */
  private async resolvePreviousEntries(
    rows: ReservationStatusHistory[],
  ): Promise<Map<number, PreviousEntry>> {
    const previousById = new Map<number, PreviousEntry>();
    const reservationIds = [...new Set(rows.map((r) => r.reservation_id))];
    if (reservationIds.length === 0) return previousById;

    const lifecycle = await this.historyRepository.find({
      where: { reservation_id: In(reservationIds), is_active: true },
      select: ['id', 'reservation_id', 'status', 'changed_at'],
      order: { reservation_id: 'ASC', changed_at: 'ASC', id: 'ASC' },
    });

    let previous: ReservationStatusHistory | null = null;
    for (const entry of lifecycle) {
      if (previous && previous.reservation_id === entry.reservation_id) {
        previousById.set(entry.id, {
          status: previous.status,
          changed_at: previous.changed_at,
        });
      }
      previous = entry;
    }
    return previousById;
  }

  private mapToResponseDto(
    history: ReservationStatusHistory,
    previous?: PreviousEntry,
  ): ReservationStatusHistoryResponseDto {
    const reservation = history.reservation;
    const dto: ReservationStatusHistoryResponseDto = {
      id: history.id,
      reservation_id: history.reservation_id,
      status: history.status,
      previous_status: previous?.status ?? null,
      previous_changed_at: previous?.changed_at ?? null,
      changed_at: history.changed_at,
      changed_by: history.changed_by ?? null,
      is_active: history.is_active,
    };

    if (reservation) {
      const guests = (reservation.guests ?? []).filter((g) => g.is_active);
      const primary = guests.find((g) => g.is_primary) ?? guests[0];
      dto.reservation = {
        id: reservation.id,
        reservation_date: reservation.reservation_date,
        duration_minutes: reservation.duration_minutes,
        seated_at: reservation.seated_at ?? null,
        party_size: reservation.party_size,
        status: reservation.status,
        guest_name: reservation.customer?.name ?? primary?.name ?? null,
      };
    }
    return dto;
  }
}
