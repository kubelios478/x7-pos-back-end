//src/commerce/delivery-system/delivery-tracking/delivery-tracking.service.ts
//
// Un ping pertenece al comercio del pedido de su asignación: todas las operaciones se
// acotan por `deliveryAssignment.order.merchant_id` del JWT (antes cualquier comercio podía
// leer, mover o borrar las posiciones de los repartidores de otro).
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { DeliveryAssignment } from '../delivery-assignment/entity/delivery-assignment.entity';
import { DeliveryTracking } from './entity/delivery-tracking.entity';
import { OneDeliveryTrackingResponseDto } from './dto/delivery-tracking-response.dto';
import { CreateDeliveryTrackingDto } from './dto/create-delivery-tracking.dto';
import { QueryDeliveryTrackingDto } from './dto/query-delivery-tracking.dto';
import { PaginatedDeliveryTrackingResponseDto } from './dto/paginated-delivery-tracking-response.dto';
import { UpdateDeliveryTrackingDto } from './dto/update-delivery-tracking.dto';
import {
  LIVE_ASSIGNMENT_STATUSES,
  ROUTE_MAX_POINTS,
  SIGNAL_LOST_AFTER_MS,
  TelemetryStatus,
  TERMINAL_ASSIGNMENT_STATUSES,
  TRACKING_STATUSES,
} from './constants/delivery-tracking.constants';
import { QueryLiveTrackingDto } from './dto/query-live-tracking.dto';
import { DeliveryRealtimeService } from '../realtime/delivery-realtime.service';
import { DELIVERY_DELAY_THRESHOLD_MINUTES } from '../delivery-assignment/constants/delivery-assignment.constants';

export interface RoutePoint {
  id: number;
  lat: number;
  lng: number;
  recorded_at: Date | null;
}

export interface DeliveryRouteResult {
  delivery_assignment_id: number;
  delivery_status: string;
  driver: { id: number; name: string } | null;
  points: RoutePoint[];
  truncated: boolean;
}

export interface LiveTrackingEntry {
  delivery_assignment_id: number;
  delivery_status: string;
  driver: { id: number; name: string; vehicle_type: string | null } | null;
  /** Último ping vivo; null si el reparto aún no ha emitido ninguno. */
  tracking_id: number | null;
  lat: number | null;
  lng: number | null;
  recorded_at: Date | null;
  seconds_since_update: number | null;
  telemetry_status: TelemetryStatus;
  /** Minutos desde que se asignó; null si aún no tiene `assigned_at`. */
  minutes_since_assigned: number | null;
  /** Mismo umbral que el contador de "retrasados" de asignaciones. */
  on_time: boolean | null;
}

export interface TelemetrySummaryResult {
  live_deliveries: number;
  active_sessions: number;
  signal_lost: number;
  inactive: number;
  signal_lost_after_seconds: number;
  /** % de repartos rastreados (con algún ping) dentro del umbral; null si no hay ninguno. */
  on_time_ratio_pct: number | null;
  on_time_threshold_minutes: number;
}

interface LiveRow {
  assignment_id: number;
  delivery_status: string;
  assigned_at: Date | null;
  driver_id: number | null;
  driver_name: string | null;
  vehicle_type: string | null;
  tracking_id: number | null;
  latitude: string | null;
  longitude: string | null;
  recorded_at: Date | null;
  tracking_status: string | null;
}

/**
 * `inactive` si el último ping cerró el seguimiento; `signal_lost` si no hay ping o el
 * último es más viejo que el umbral; si no, `active`.
 */
export function telemetryStatusOf(
  trackingStatus: string | null,
  recordedAt: Date | null,
  now: number,
): TelemetryStatus {
  if (trackingStatus === 'inactive') return 'inactive';
  if (!recordedAt) return 'signal_lost';
  return now - new Date(recordedAt).getTime() > SIGNAL_LOST_AFTER_MS
    ? 'signal_lost'
    : 'active';
}

@Injectable()
export class DeliveryTrackingService {
  constructor(
    @InjectRepository(DeliveryAssignment)
    private readonly deliveryAssignmentRepository: Repository<DeliveryAssignment>,

    @InjectRepository(DeliveryTracking)
    private readonly deliveryTrackingRepository: Repository<DeliveryTracking>,

    private readonly realtime: DeliveryRealtimeService,
  ) {}

  private assertMerchant(merchantId: number): void {
    if (!Number.isInteger(merchantId) || merchantId <= 0) {
      ErrorHandler.forbidden('You must be associated with a merchant');
    }
  }

  private assertId(id: number): void {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }
  }

  private async findAssignment(
    assignmentId: number,
    merchantId: number,
  ): Promise<DeliveryAssignment> {
    const assignment = await this.deliveryAssignmentRepository.findOne({
      where: {
        id: assignmentId,
        status: Not('deleted'),
        order: { merchant_id: merchantId },
      },
    });
    if (!assignment) {
      ErrorHandler.deliveryAssignmentNotFound();
    }
    return assignment;
  }

  private async findScoped(
    id: number,
    merchantId: number,
  ): Promise<DeliveryTracking> {
    this.assertId(id);
    const tracking = await this.deliveryTrackingRepository.findOne({
      where: {
        id,
        status: In([...TRACKING_STATUSES]),
        deliveryAssignment: { order: { merchant_id: merchantId } },
      },
    });
    if (!tracking) {
      ErrorHandler.deliveryTrackingNotFound();
    }
    return tracking;
  }

  /** Un reparto entregado o cancelado ya no se mueve: un ping tardío ensuciaría su ruta. */
  private assertAcceptsPings(assignment: DeliveryAssignment): void {
    if (TERMINAL_ASSIGNMENT_STATUSES.includes(assignment.delivery_status)) {
      ErrorHandler.badRequest(
        `Delivery assignment ${assignment.id} is ${assignment.delivery_status} and no longer accepts location updates`,
      );
    }
  }

  async create(
    dto: CreateDeliveryTrackingDto,
    merchantId: number,
  ): Promise<OneDeliveryTrackingResponseDto> {
    this.assertMerchant(merchantId);
    const deliveryAssignment = await this.findAssignment(
      dto.deliveryAssignment,
      merchantId,
    );
    this.assertAcceptsPings(deliveryAssignment);

    const deliveryTracking = this.deliveryTrackingRepository.create({
      deliveryAssignment,
      latitude: dto.latitude,
      longitude: dto.longitude,
      recorded_at: dto.recorded_at ?? new Date(),
      status: dto.status ?? 'active',
    } as Partial<DeliveryTracking>);

    const savedDeliveryTracking =
      await this.deliveryTrackingRepository.save(deliveryTracking);

    // El mapa en vivo mueve el marcador al instante, sin esperar al siguiente sondeo.
    this.realtime.locationUpdated({
      merchantId,
      assignmentId: deliveryAssignment.id,
      trackingId: savedDeliveryTracking.id,
      driverId: deliveryAssignment.deliveryDriver?.id ?? null,
      lat: Number(savedDeliveryTracking.latitude),
      lng: Number(savedDeliveryTracking.longitude),
      recorded_at: new Date(savedDeliveryTracking.recorded_at).toISOString(),
      status: savedDeliveryTracking.status,
    });

    return {
      statusCode: 201,
      message: 'Delivery Tracking created successfully',
      data: savedDeliveryTracking,
    };
  }

  async findAll(
    query: QueryDeliveryTrackingDto,
    merchantId: number,
  ): Promise<PaginatedDeliveryTrackingResponseDto> {
    this.assertMerchant(merchantId);
    const {
      status,
      delivery_assignment_id,
      delivery_driver_id,
      page = 1,
      limit = 10,
      sortBy = 'id',
      sortOrder = 'DESC',
    } = query;

    if (page < 1 || limit < 1) {
      ErrorHandler.invalidInput('Page and limit must be positive integers');
    }

    const qb = this.deliveryTrackingRepository
      .createQueryBuilder('deliveryTracking')
      .innerJoin('deliveryTracking.deliveryAssignment', 'deliveryAssignment')
      .innerJoin('deliveryAssignment.order', 'order')
      .leftJoin('deliveryAssignment.deliveryDriver', 'deliveryDriver')
      .select([
        'deliveryTracking',
        'deliveryAssignment.id',
        'deliveryAssignment.delivery_status',
        'deliveryDriver.id',
        'deliveryDriver.name',
      ])
      .where('order.merchant_id = :merchantId', { merchantId });

    if (status?.length) {
      qb.andWhere('deliveryTracking.status IN (:...statuses)', {
        statuses: status,
      });
    } else {
      qb.andWhere('deliveryTracking.status IN (:...statuses)', {
        statuses: [...TRACKING_STATUSES],
      });
    }
    if (delivery_assignment_id) {
      qb.andWhere('deliveryAssignment.id = :assignmentId', {
        assignmentId: delivery_assignment_id,
      });
    }
    if (delivery_driver_id) {
      qb.andWhere('deliveryDriver.id = :driverId', {
        driverId: delivery_driver_id,
      });
    }

    qb.orderBy(`deliveryTracking.${sortBy}`, sortOrder);
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      statusCode: 200,
      message: 'Delivery Trackings retrieved successfully',
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(
    id: number,
    merchantId: number,
  ): Promise<OneDeliveryTrackingResponseDto> {
    this.assertMerchant(merchantId);
    const deliveryTracking = await this.findScoped(id, merchantId);
    return {
      statusCode: 200,
      message: 'Delivery Tracking retrieved successfully',
      data: deliveryTracking,
    };
  }

  async update(
    id: number,
    dto: UpdateDeliveryTrackingDto,
    merchantId: number,
  ): Promise<OneDeliveryTrackingResponseDto> {
    this.assertMerchant(merchantId);
    const deliveryTracking = await this.findScoped(id, merchantId);

    // Campo a campo: el `Object.assign(tracking, dto)` de antes metía el id numérico
    // `deliveryAssignment` en la relación.
    if (dto.deliveryAssignment !== undefined) {
      deliveryTracking.deliveryAssignment = await this.findAssignment(
        dto.deliveryAssignment,
        merchantId,
      );
    }
    if (dto.latitude !== undefined) deliveryTracking.latitude = dto.latitude;
    if (dto.longitude !== undefined) deliveryTracking.longitude = dto.longitude;
    if (dto.recorded_at !== undefined) {
      deliveryTracking.recorded_at = dto.recorded_at;
    }
    if (dto.status !== undefined) deliveryTracking.status = dto.status;

    const updatedDeliveryTracking =
      await this.deliveryTrackingRepository.save(deliveryTracking);
    return {
      statusCode: 200,
      message: 'Delivery Tracking updated successfully',
      data: updatedDeliveryTracking,
    };
  }

  async remove(
    id: number,
    merchantId: number,
  ): Promise<OneDeliveryTrackingResponseDto> {
    this.assertMerchant(merchantId);
    const deliveryTracking = await this.findScoped(id, merchantId);

    deliveryTracking.status = 'deleted';
    const deletedDeliveryTracking =
      await this.deliveryTrackingRepository.save(deliveryTracking);
    return {
      statusCode: 200,
      message: 'Delivery Tracking deleted successfully',
      data: deletedDeliveryTracking,
    };
  }

  /**
   * Rastro de migas de un reparto, en orden cronológico, para aislarlo en el mapa. Sólo
   * coordenadas y hora: el mapa no necesita la asignación entera en cada punto.
   */
  async route(
    assignmentId: number,
    merchantId: number,
  ): Promise<{
    statusCode: number;
    message: string;
    data: DeliveryRouteResult;
  }> {
    this.assertMerchant(merchantId);
    this.assertId(assignmentId);
    const assignment = await this.findAssignment(assignmentId, merchantId);

    const rows = await this.deliveryTrackingRepository
      .createQueryBuilder('deliveryTracking')
      .select([
        'deliveryTracking.id',
        'deliveryTracking.latitude',
        'deliveryTracking.longitude',
        'deliveryTracking.recorded_at',
      ])
      .where('deliveryTracking.delivery_assignment_id = :assignmentId', {
        assignmentId,
      })
      .andWhere('deliveryTracking.status IN (:...statuses)', {
        statuses: [...TRACKING_STATUSES],
      })
      // Si hay que recortar se quedan los MÁS RECIENTES (lo que importa en vivo): se leen
      // al revés, uno de más para saber si sobra, y se devuelven en orden cronológico.
      .orderBy('deliveryTracking.recorded_at', 'DESC', 'NULLS LAST')
      .addOrderBy('deliveryTracking.id', 'DESC')
      .take(ROUTE_MAX_POINTS + 1)
      .getMany();

    const truncated = rows.length > ROUTE_MAX_POINTS;
    const latest = rows.slice(0, ROUTE_MAX_POINTS).reverse();
    const driver = assignment.deliveryDriver;
    return {
      statusCode: 200,
      message: 'Delivery route retrieved successfully',
      data: {
        delivery_assignment_id: assignment.id,
        delivery_status: assignment.delivery_status,
        driver: driver ? { id: driver.id, name: driver.name } : null,
        points: latest.map((r) => ({
          id: r.id,
          lat: Number(r.latitude),
          lng: Number(r.longitude),
          recorded_at: r.recorded_at ?? null,
        })),
        truncated,
      },
    };
  }

  /**
   * Un registro por reparto en curso con su último ping (LATERAL: se lee sólo la fila más
   * reciente de cada asignación, no toda la ruta). Los repartos sin ningún ping también
   * salen, como `signal_lost`: es justo lo que el despachador tiene que ver.
   */
  private async loadLive(
    merchantId: number,
    filters: { driverId?: number; assignmentId?: number } = {},
  ): Promise<LiveTrackingEntry[]> {
    const params: unknown[] = [merchantId, LIVE_ASSIGNMENT_STATUSES];
    let extra = '';
    if (filters.driverId) {
      params.push(filters.driverId);
      extra += ` AND a.delivery_driver_id = $${params.length}`;
    }
    if (filters.assignmentId) {
      params.push(filters.assignmentId);
      extra += ` AND a.id = $${params.length}`;
    }
    const rows: LiveRow[] = await this.deliveryTrackingRepository.query(
      `SELECT a.id AS assignment_id,
              a.delivery_status,
              a.assigned_at,
              d.id AS driver_id,
              d.name AS driver_name,
              d."vehicleType" AS vehicle_type,
              t.id AS tracking_id,
              t.latitude,
              t.longitude,
              t.recorded_at,
              t.status AS tracking_status
         FROM delivery_assignments a
         JOIN orders o ON o.id = a.order_id
    LEFT JOIN delivery_drivers d ON d.id = a.delivery_driver_id
    LEFT JOIN LATERAL (
              SELECT id, latitude, longitude, recorded_at, status
                FROM delivery_tracking
               WHERE delivery_assignment_id = a.id
                 AND status <> 'deleted'
            ORDER BY recorded_at DESC NULLS LAST, id DESC
               LIMIT 1
              ) t ON true
        WHERE o.merchant_id = $1
          AND a.status <> 'deleted'
          AND a.delivery_status::text = ANY($2)${extra}
     ORDER BY a.id ASC`,
      params,
    );

    const now = Date.now();
    return rows.map((r) => {
      const recordedAt = r.recorded_at ? new Date(r.recorded_at) : null;
      const minutesSinceAssigned = r.assigned_at
        ? Math.max(
            0,
            Math.floor((now - new Date(r.assigned_at).getTime()) / 60000),
          )
        : null;
      return {
        delivery_assignment_id: Number(r.assignment_id),
        delivery_status: r.delivery_status,
        driver:
          r.driver_id != null
            ? {
                id: Number(r.driver_id),
                name: r.driver_name ?? '',
                vehicle_type: r.vehicle_type,
              }
            : null,
        tracking_id: r.tracking_id != null ? Number(r.tracking_id) : null,
        lat: r.latitude != null ? Number(r.latitude) : null,
        lng: r.longitude != null ? Number(r.longitude) : null,
        recorded_at: recordedAt,
        seconds_since_update: recordedAt
          ? Math.max(0, Math.floor((now - recordedAt.getTime()) / 1000))
          : null,
        telemetry_status: telemetryStatusOf(r.tracking_status, recordedAt, now),
        minutes_since_assigned: minutesSinceAssigned,
        on_time:
          minutesSinceAssigned === null
            ? null
            : minutesSinceAssigned <= DELIVERY_DELAY_THRESHOLD_MINUTES,
      };
    });
  }

  /** Mapa en vivo: último punto de cada reparto en curso, filtrable por estado de señal. */
  async live(
    query: QueryLiveTrackingDto,
    merchantId: number,
  ): Promise<{
    statusCode: number;
    message: string;
    data: LiveTrackingEntry[];
  }> {
    this.assertMerchant(merchantId);
    const entries = await this.loadLive(merchantId, {
      driverId: query.delivery_driver_id,
      assignmentId: query.delivery_assignment_id,
    });
    const wanted = query.telemetry_status;
    return {
      statusCode: 200,
      message: 'Live tracking retrieved successfully',
      data: wanted?.length
        ? entries.filter((e) => wanted.includes(e.telemetry_status))
        : entries,
    };
  }

  /** KPI de la cabecera de seguimiento, sobre los mismos datos que el mapa en vivo. */
  async summary(merchantId: number): Promise<{
    statusCode: number;
    message: string;
    data: TelemetrySummaryResult;
  }> {
    this.assertMerchant(merchantId);
    const entries = await this.loadLive(merchantId);
    const count = (status: TelemetryStatus) =>
      entries.filter((e) => e.telemetry_status === status).length;
    // "Rastreado" = ha emitido al menos un ping y tiene hora de asignación. No hay ETA por
    // distancia en el modelo, así que el criterio es el mismo umbral de minutos que usa
    // el banner de asignaciones para marcar retrasos: los dos banners cuadran.
    const tracked = entries.filter(
      (e) => e.tracking_id !== null && e.on_time !== null,
    );
    const onTime = tracked.filter((e) => e.on_time).length;
    return {
      statusCode: 200,
      message: 'Telemetry summary retrieved successfully',
      data: {
        live_deliveries: entries.length,
        active_sessions: count('active'),
        signal_lost: count('signal_lost'),
        inactive: count('inactive'),
        signal_lost_after_seconds: SIGNAL_LOST_AFTER_MS / 1000,
        on_time_ratio_pct: tracked.length
          ? Math.round((onTime / tracked.length) * 1000) / 10
          : null,
        on_time_threshold_minutes: DELIVERY_DELAY_THRESHOLD_MINUTES,
      },
    };
  }
}
