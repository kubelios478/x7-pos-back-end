import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Not, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Reservation } from '../reservation/entities/reservation.entity';
import { Table } from 'src/restaurant-operations/dining-system/tables/entities/table.entity';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { ReservationSettings } from './entities/reservation-settings.entity';
import {
  CAPACITY_LOCK_NAMESPACE,
  CAPACITY_OVERRIDE_REQUIRED,
  DEFAULT_SHIFTS,
  DEFAULT_SLOT_INTERVAL_MINUTES,
  NON_SEATING_TABLE_STATUSES,
  SEAT_HOLDING_STATUSES,
  type ServiceShift,
} from './constants/capacity.constants';
import {
  buildAvailability,
  capacityConflictMessage,
  evaluateBooking,
  shiftWindow,
  type BookingEvaluation,
  type CapacityBooking,
  type CapacityRules,
} from './capacity.engine';
import { UpdateReservationSettingsDto } from './dto/update-reservation-settings.dto';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { ManagerOverrideDto } from './dto/manager-override.dto';

const MINUTE_MS = 60_000;

export interface EffectiveSettings {
  seat_capacity: number | null;
  /** Aforo efectivo: el ajuste o, si no hay, la suma de sillas de las mesas activas. */
  effective_seat_capacity: number;
  capacity_source: 'settings' | 'tables';
  slot_interval_minutes: number;
  max_covers_per_slot: number | null;
  shifts: ServiceShift[];
  updated_at: Date | null;
}

export interface BookingRequest {
  start: Date;
  durationMinutes: number;
  partySize: number;
  /** La reserva que se edita no cuenta contra sí misma. */
  excludeReservationId?: number;
}

export interface CapacityDecision {
  evaluation: BookingEvaluation;
  /** Usuario (MERCHANT_ADMIN) que autorizó forzar la franja; null si no hizo falta. */
  overrideBy: number | null;
}

@Injectable()
export class ReservationCapacityService {
  constructor(
    @InjectRepository(ReservationSettings)
    private readonly settingsRepository: Repository<ReservationSettings>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ================= Ajustes =================

  async getSettings(
    merchantId: number,
    manager?: EntityManager,
  ): Promise<EffectiveSettings> {
    const settingsRepo = manager
      ? manager.getRepository(ReservationSettings)
      : this.settingsRepository;
    const row = await settingsRepo.findOneBy({ merchant_id: merchantId });

    const tableSeats = await this.tableSeats(merchantId, manager);
    const configured = row?.seat_capacity ?? null;

    return {
      seat_capacity: configured,
      effective_seat_capacity: configured ?? tableSeats,
      capacity_source: configured != null ? 'settings' : 'tables',
      slot_interval_minutes: row?.slot_interval_minutes ?? DEFAULT_SLOT_INTERVAL_MINUTES,
      max_covers_per_slot: row?.max_covers_per_slot ?? null,
      shifts: row?.shifts?.length ? row.shifts : DEFAULT_SHIFTS,
      updated_at: row?.updated_at ?? null,
    };
  }

  async updateSettings(
    merchantId: number,
    dto: UpdateReservationSettingsDto,
    userId: number,
  ): Promise<EffectiveSettings> {
    const row =
      (await this.settingsRepository.findOneBy({ merchant_id: merchantId })) ??
      this.settingsRepository.create({ merchant_id: merchantId });

    // Ausente = no tocar; null = volver al valor por defecto.
    if (dto.seat_capacity !== undefined) row.seat_capacity = dto.seat_capacity;
    if (dto.slot_interval_minutes !== undefined) {
      row.slot_interval_minutes = dto.slot_interval_minutes;
    }
    if (dto.max_covers_per_slot !== undefined) {
      row.max_covers_per_slot = dto.max_covers_per_slot;
    }
    if (dto.shifts !== undefined) {
      row.shifts = dto.shifts?.map((s) => ({ name: s.name.trim(), start: s.start, end: s.end })) ?? null;
    }
    row.updated_by = userId;

    await this.settingsRepository.save(row);
    return this.getSettings(merchantId);
  }

  // ================= Disponibilidad =================

  async availability(merchantId: number, query: AvailabilityQueryDto) {
    const settings = await this.getSettings(merchantId);
    const partySize = query.party_size ?? 2;
    const duration = query.duration_minutes ?? 90;

    const [y, m, d] = query.date.split('-').map(Number);
    const day = new Date(y, m - 1, d, 0, 0, 0, 0);

    // Se cargan las reservas que puedan tocar CUALQUIER franja de CUALQUIER turno: desde el
    // inicio del primer turno hasta el fin del último más la duración de la estancia.
    const windows = settings.shifts
      .map((s) => shiftWindow(day, s))
      .filter((w): w is { start: number; end: number } => w != null);
    const from = Math.min(...windows.map((w) => w.start), day.getTime());
    const to = Math.max(...windows.map((w) => w.end), day.getTime()) + duration * MINUTE_MS;

    const bookings = await this.loadBookings(
      merchantId,
      new Date(from),
      new Date(to),
      query.exclude_reservation_id,
    );

    return {
      statusCode: 200,
      message: 'Availability retrieved successfully',
      data: {
        date: query.date,
        party_size: partySize,
        duration_minutes: duration,
        seat_capacity: settings.effective_seat_capacity,
        capacity_source: settings.capacity_source,
        slot_interval_minutes: settings.slot_interval_minutes,
        max_covers_per_slot: settings.max_covers_per_slot,
        shifts: buildAvailability(
          bookings,
          day,
          settings.shifts,
          partySize,
          duration,
          this.rulesOf(settings),
        ).map((shift) => ({
          name: shift.name,
          start: shift.start,
          end: shift.end,
          occupancy_pct: shift.occupancyPct,
          level: shift.level,
          slots: shift.slots.map((slot) => ({
            time: slot.time,
            start: new Date(slot.slotStart).toISOString(),
            booked_seats: slot.bookedSeats,
            projected_seats: slot.projectedSeats,
            occupancy_pct: slot.occupancyPct,
            level: slot.level,
            arrivals: slot.arrivals,
            fits_capacity: slot.fitsCapacity,
            fits_throttle: slot.fitsThrottle,
            bookable: slot.bookable,
          })),
        })),
      },
    };
  }

  // ================= Guarda =================

  /**
   * Comprueba, DENTRO de la transacción de alta/confirmación, que la reserva cabe en el aforo
   * y respeta el ritmo de llegadas. El cerrojo consultivo por comercio serializa a dos
   * anfitrionas que reservan la última mesa a la vez: la segunda espera y ve la primera.
   *
   * Si no cabe: con override válido se deja pasar y se devuelve quién lo autorizó; sin
   * override, 409 con el código que la UI usa para pedir las credenciales del encargado.
   */
  async assertBookable(
    manager: EntityManager,
    merchantId: number,
    request: BookingRequest,
    override?: ManagerOverrideDto,
  ): Promise<CapacityDecision> {
    await manager.query('SELECT pg_advisory_xact_lock($1, $2)', [
      CAPACITY_LOCK_NAMESPACE,
      merchantId,
    ]);

    const settings = await this.getSettings(merchantId, manager);
    const start = request.start.getTime();
    const bookings = await this.loadBookings(
      merchantId,
      new Date(start - 24 * 60 * MINUTE_MS),
      new Date(start + (request.durationMinutes + 24 * 60) * MINUTE_MS),
      request.excludeReservationId,
      manager,
    );

    const evaluation = evaluateBooking(
      bookings,
      start,
      request.durationMinutes,
      request.partySize,
      this.rulesOf(settings),
    );

    if (evaluation.bookable) return { evaluation, overrideBy: null };

    if (!override) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        code: CAPACITY_OVERRIDE_REQUIRED,
        message: capacityConflictMessage(evaluation, request.partySize),
        seat_capacity: evaluation.seatCapacity,
        booked_seats: evaluation.bookedSeats,
        arrivals: evaluation.arrivals,
        max_covers_per_slot: evaluation.maxCoversPerSlot,
      });
    }

    const overrideBy = await this.verifyManagerOverride(merchantId, override, manager);
    return { evaluation, overrideBy };
  }

  /**
   * Verifica las credenciales del encargado. Un único mensaje para todo fallo (usuario
   * inexistente, contraseña mala, rol insuficiente, otro comercio, cuenta desactivada): no
   * debe servir para averiguar qué correos existen.
   */
  async verifyManagerOverride(
    merchantId: number,
    override: ManagerOverrideDto,
    manager?: EntityManager,
  ): Promise<number> {
    const users = manager ? manager.getRepository(User) : this.userRepository;
    // Misma búsqueda que el login (correo exacto): si el login lo acepta, el override también.
    const user = await users.findOne({ where: { email: override.email.trim() } });

    const valid =
      !!user &&
      user.isActive !== false &&
      user.role === UserRole.MERCHANT_ADMIN &&
      user.merchantId === merchantId &&
      (await bcrypt.compare(override.password, user.password));

    if (!valid) {
      throw new ForbiddenException(
        'Manager override rejected: the credentials do not belong to an active manager (merchant admin) of this restaurant.',
      );
    }
    return user.id;
  }

  // ================= Internos =================

  private rulesOf(settings: EffectiveSettings): CapacityRules {
    return {
      seatCapacity: settings.effective_seat_capacity,
      slotIntervalMinutes: settings.slot_interval_minutes,
      maxCoversPerSlot: settings.max_covers_per_slot,
    };
  }

  private async tableSeats(merchantId: number, manager?: EntityManager): Promise<number> {
    const tables = manager ? manager.getRepository(Table) : this.tableRepository;
    const rows = await tables.find({
      where: { merchant_id: merchantId, status: Not(In(NON_SEATING_TABLE_STATUSES)) },
      select: ['id', 'capacity'],
    });
    return rows.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0);
  }

  /** Reservas que ocupan sillas (CONFIRMED/SEATED, activas) y se solapan con [from, to). */
  private async loadBookings(
    merchantId: number,
    from: Date,
    to: Date,
    excludeReservationId?: number,
    manager?: EntityManager,
  ): Promise<CapacityBooking[]> {
    const repo = manager ? manager.getRepository(Reservation) : this.reservationRepository;
    const query = repo
      .createQueryBuilder('reservation')
      .select([
        'reservation.id',
        'reservation.reservation_date',
        'reservation.duration_minutes',
        'reservation.party_size',
      ])
      .where('reservation.merchant_id = :merchantId', { merchantId })
      .andWhere('reservation.is_active = true')
      .andWhere('reservation.status IN (:...statuses)', { statuses: SEAT_HOLDING_STATUSES })
      .andWhere('reservation.reservation_date < :to', { to })
      .andWhere(
        "reservation.reservation_date + (reservation.duration_minutes * INTERVAL '1 minute') > :from",
        { from },
      );
    if (excludeReservationId) {
      query.andWhere('reservation.id != :excludeId', { excludeId: excludeReservationId });
    }

    const rows = await query.getMany();
    return rows.map((r) => {
      const start = new Date(r.reservation_date).getTime();
      return {
        id: r.id,
        start,
        end: start + (Number(r.duration_minutes) || 0) * MINUTE_MS,
        party_size: Number(r.party_size) || 0,
      };
    });
  }
}
