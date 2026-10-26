//src/commerce/delivery-system/delivery-assignment/delivery-assignment.service.ts
//
// Una asignación pertenece al comercio de su pedido (`orders.merchant_id`): todas las
// operaciones se acotan por el merchant del JWT. El ciclo de vida, los timestamps y el
// estado del repartidor los controla el servidor; el cliente sólo pide transiciones.
import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Not, Repository } from 'typeorm';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { DeliveryAssignment } from './entity/delivery-assignment.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { OrderType } from 'src/restaurant-operations/pos/orders/constants/order-type.enum';
import { OrderStatus } from 'src/restaurant-operations/pos/orders/constants/order-status.enum';
import { KitchenStatus } from 'src/restaurant-operations/pos/orders/constants/kitchen-status.enum';
import { OrderBusinessStatus } from 'src/restaurant-operations/pos/orders/constants/order-business-status.enum';
import { DeliveryDriver } from '../delivery-driver/entity/delivery-driver.entity';
import { DriverStatus } from '../delivery-driver/constants/delivery-driver.constants';
import { DeliveryZone } from '../delivery-zone/entity/delivery-zone.entity';
import { CreateDeliveryAssignmentDto } from './dto/create-delivery-assignment.dto';
import { OneDeliveryAssignmentResponseDto } from './dto/delivery-assignment-response.dto';
import { QueryDeliveryAssignmentDto } from './dto/query-delivery-assignment.dto';
import { PaginatedDeliveryAssignmentResponseDto } from './dto/paginated-delivery-assignment-response.dto';
import { UpdateDeliveryAssignmentDto } from './dto/update-delivery-assignment.dto';
import {
  ExternalDispatchDto,
  ExternalQuoteDto,
} from './dto/external-delivery.dto';
import { DeliveryStatus } from './constants/delivery-status.enum';
import { DeliveryStatus as OrderDeliveryStatus } from 'src/restaurant-operations/pos/orders/constants/delivery-status.enum';
import { DeliveryRealtimeService } from '../realtime/delivery-realtime.service';
import {
  AssignmentType,
  isDspAssignment,
} from './constants/assignment-type.enum';
import {
  AVG_COMPLETION_WINDOW_HOURS,
  DELIVERY_DELAY_THRESHOLD_MINUTES,
  DELIVERY_STATUS_PROGRESS,
  DELIVERY_STATUS_TRANSITIONS,
  DISPATCHED_DELIVERY_STATUSES,
  LIVE_RECORD_STATUSES,
  OPEN_DELIVERY_STATUSES,
  canTransition,
  isTerminalStatus,
} from './constants/delivery-assignment.constants';
import {
  DSP_DISPATCH_PROVIDER,
  DspDispatchProvider,
  DspQuote,
} from './dsp/dsp-dispatch.provider';

export interface DeliveryAssignmentSummaryResult {
  pending_dispatch: number;
  pending_assignments: number;
  in_transit: number;
  avg_completion_minutes: number | null;
  delayed: number;
  delay_threshold_minutes: number;
  live_assignments: number;
  in_house_share_pct: number | null;
  dsp_share_pct: number | null;
  dsp_fee_today: number;
}

/** Eventos genéricos de webhook → estado destino. */
export const PROVIDER_EVENT_STATUS: Record<string, DeliveryStatus> = {
  dasher_assigned: DeliveryStatus.ASSIGNED,
  picked_up: DeliveryStatus.PICKED_UP,
  delivered: DeliveryStatus.DELIVERED,
};

export type ProviderEventOutcome =
  | 'applied'
  | 'duplicate'
  | 'already_past'
  | 'invalid_transition'
  | 'unknown_delivery'
  | 'unsupported_event';

export interface ProviderEventResult {
  outcome: ProviderEventOutcome;
  assignment_id: number | null;
  delivery_status: DeliveryStatus | null;
}

interface ExternalFields {
  deliveryDriver?: number;
  external_delivery_id?: string;
  external_tracking_url?: string;
  external_dsp_fee?: number;
}

// Valores de enum propios (no entrada del usuario): seguros para incrustar en el SQL.
const sqlList = (values: readonly string[]) =>
  values.map((v) => `'${v}'`).join(', ');
const round = (value: number, decimals: number) =>
  Math.round(value * 10 ** decimals) / 10 ** decimals;

@Injectable()
export class DeliveryAssignmentService {
  private readonly logger = new Logger(DeliveryAssignmentService.name);

  constructor(
    @InjectRepository(DeliveryAssignment)
    private readonly deliveryAssignmentRepository: Repository<DeliveryAssignment>,

    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(DeliveryZone)
    private readonly deliveryZoneRepository: Repository<DeliveryZone>,

    private readonly dataSource: DataSource,

    @Inject(DSP_DISPATCH_PROVIDER)
    private readonly dspProvider: DspDispatchProvider,

    private readonly realtime: DeliveryRealtimeService,
  ) {}

  /**
   * `orders.delivery_status` refleja la asignación para que el TPV y el pedido online
   * enseñen en qué punto está el reparto. El enum de pedidos no tiene `pending` ni `failed`:
   * una asignación pendiente (aún sin repartidor), cancelada o fallida deja el pedido en
   * `unassigned`, que es justo lo que es (falta despacharlo o volver a despacharlo).
   */
  private async syncOrderDeliveryStatus(
    manager: EntityManager,
    orderId: number,
    status: DeliveryStatus,
  ): Promise<void> {
    const mapped: Record<DeliveryStatus, OrderDeliveryStatus> = {
      [DeliveryStatus.PENDING]: OrderDeliveryStatus.UNASSIGNED,
      [DeliveryStatus.ASSIGNED]: OrderDeliveryStatus.ASSIGNED,
      [DeliveryStatus.PICKED_UP]: OrderDeliveryStatus.PICKED_UP,
      [DeliveryStatus.IN_TRANSIT]: OrderDeliveryStatus.IN_TRANSIT,
      [DeliveryStatus.DELIVERED]: OrderDeliveryStatus.DELIVERED,
      [DeliveryStatus.CANCELLED]: OrderDeliveryStatus.UNASSIGNED,
      [DeliveryStatus.FAILED]: OrderDeliveryStatus.UNASSIGNED,
    };
    await manager.update(
      Order,
      { id: orderId },
      { delivery_status: mapped[status] },
    );
  }

  /** Avisos en vivo tras confirmar la transacción (nunca antes: podría deshacerse). */
  private notifyChanges(
    merchantId: number,
    assignment: DeliveryAssignment,
    drivers: Array<{ id: number; status: DriverStatus }> = [],
  ): void {
    this.realtime.assignmentChanged({
      merchantId,
      assignmentId: assignment.id,
      delivery_status: assignment.delivery_status,
      driverId: assignment.deliveryDriver?.id ?? null,
    });
    for (const driver of drivers) {
      this.realtime.driverStatusChanged({
        merchantId,
        driverId: driver.id,
        status: driver.status,
      });
    }
  }

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

  /** IN_HOUSE ↔ repartidor propio; DSP ↔ datos externos. Nunca mezclados. */
  private assertTypeFields(type: AssignmentType, dto: ExternalFields): void {
    if (isDspAssignment(type)) {
      if (dto.deliveryDriver !== undefined) {
        ErrorHandler.badRequest(
          `${type} assignments cannot have a delivery driver; the runner belongs to the provider`,
        );
      }
      return;
    }
    const external = [
      'external_delivery_id',
      'external_tracking_url',
      'external_dsp_fee',
    ].filter((k) => dto[k as keyof ExternalFields] !== undefined);
    if (external.length) {
      ErrorHandler.badRequest(
        `in_house assignments cannot carry external fields (${external.join(', ')})`,
      );
    }
  }

  private assertDeliveryOrder(order: Order): void {
    if (order.type !== OrderType.DELIVERY) {
      ErrorHandler.badRequest(
        `Order #${order.id} is not a delivery order (type: ${order.type})`,
      );
    }
    if (order.status === OrderBusinessStatus.CANCELLED) {
      ErrorHandler.badRequest(`Order #${order.id} is cancelled`);
    }
  }

  private async findScoped(
    id: number,
    merchantId: number,
  ): Promise<DeliveryAssignment> {
    this.assertId(id);
    const assignment = await this.deliveryAssignmentRepository.findOne({
      where: {
        id,
        status: In(LIVE_RECORD_STATUSES),
        order: { merchant_id: merchantId },
      },
      relations: ['order', 'deliveryDriver'],
    });
    if (!assignment) {
      ErrorHandler.deliveryAssignmentNotFound();
    }
    return assignment;
  }

  /**
   * Bloquea la fila del pedido (FOR UPDATE) durante la transacción: dos altas simultáneas
   * para el mismo pedido se serializan y la segunda ve la asignación abierta de la primera.
   */
  private async lockOrder(
    manager: EntityManager,
    orderId: number,
    merchantId: number,
  ): Promise<Order> {
    const order = await manager
      .createQueryBuilder(Order, 'o')
      .setLock('pessimistic_write')
      .where('o.id = :orderId', { orderId })
      .andWhere('o.merchant_id = :merchantId', { merchantId })
      .andWhere('o.logical_status = :active', { active: OrderStatus.ACTIVE })
      .getOne();
    if (!order) {
      ErrorHandler.orderNotFound();
    }
    return order;
  }

  private async assertNoOpenAssignment(
    manager: EntityManager,
    orderId: number,
  ): Promise<void> {
    const open = await manager.count(DeliveryAssignment, {
      where: {
        order: { id: orderId },
        delivery_status: In([...OPEN_DELIVERY_STATUSES]),
        status: Not('deleted'),
      },
    });
    if (open > 0) {
      throw new ConflictException(
        `Order #${orderId} already has an open delivery assignment`,
      );
    }
  }

  /** Bloquea la asignación y la relee con sus relaciones ya dentro de la transacción. */
  private async lockAssignment(
    manager: EntityManager,
    id: number,
    merchantId: number,
  ): Promise<DeliveryAssignment> {
    const locked = await manager
      .createQueryBuilder(DeliveryAssignment, 'a')
      .setLock('pessimistic_write')
      .innerJoin('a.order', 'o')
      .where('a.id = :id', { id })
      .andWhere('o.merchant_id = :merchantId', { merchantId })
      .andWhere('a.status IN (:...statuses)', {
        statuses: LIVE_RECORD_STATUSES,
      })
      .getOne();
    if (!locked) {
      ErrorHandler.deliveryAssignmentNotFound();
    }
    return (await manager.findOne(DeliveryAssignment, {
      where: { id },
      relations: ['order', 'deliveryDriver'],
    })) as DeliveryAssignment;
  }

  /**
   * Pasa el repartidor de `active` a `on_delivery` con un UPDATE condicional: es atómico,
   * así que dos asignaciones simultáneas del mismo repartidor no pueden ganar las dos.
   * Sólo los `active` del mismo comercio son asignables (off_duty, inactive y on_delivery no).
   */
  private async claimDriver(
    manager: EntityManager,
    driverId: number,
    merchantId: number,
  ): Promise<DeliveryDriver> {
    const result = await manager
      .createQueryBuilder()
      .update(DeliveryDriver)
      .set({ status: DriverStatus.ON_DELIVERY })
      .where('id = :driverId', { driverId })
      .andWhere('status = :active', { active: DriverStatus.ACTIVE })
      .andWhere('merchant_id = :merchantId', { merchantId })
      .execute();

    if (!result.affected) {
      const driver = await manager.findOne(DeliveryDriver, {
        where: {
          id: driverId,
          merchant: { id: merchantId },
          status: Not(DriverStatus.DELETED),
        },
        loadEagerRelations: false,
      });
      if (!driver) {
        ErrorHandler.deliveryDriverNotFound();
      }
      if (driver.status === DriverStatus.ON_DELIVERY) {
        throw new ConflictException(
          `Delivery driver #${driverId} is already on a delivery`,
        );
      }
      ErrorHandler.badRequest(
        `Delivery driver #${driverId} is '${driver.status}'; only active drivers can be assigned`,
      );
    }

    return (await manager.findOne(DeliveryDriver, {
      where: { id: driverId },
    })) as DeliveryDriver;
  }

  /** Devuelve el repartidor a `active` sólo si seguía `on_delivery` (no pisa un cambio manual). */
  private async releaseDriver(
    manager: EntityManager,
    driverId: number,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(DeliveryDriver)
      .set({ status: DriverStatus.ACTIVE })
      .where('id = :driverId', { driverId })
      .andWhere('status = :onDelivery', {
        onDelivery: DriverStatus.ON_DELIVERY,
      })
      .execute();
  }

  private applyTimestamps(
    assignment: DeliveryAssignment,
    target: DeliveryStatus,
    now: Date,
  ): void {
    if (target === DeliveryStatus.ASSIGNED) assignment.assigned_at = now;
    if (target === DeliveryStatus.PICKED_UP) assignment.picked_up_at = now;
    if (target === DeliveryStatus.DELIVERED) assignment.delivered_at = now;
  }

  /** Validador ÚNICO de transiciones (PATCH manual y webhooks). */
  private assertTransition(from: DeliveryStatus, to: DeliveryStatus): void {
    if (isTerminalStatus(from)) {
      ErrorHandler.badRequest(
        `Delivery assignment is already '${from}'; terminal assignments cannot change status`,
      );
    }
    if (!canTransition(from, to)) {
      ErrorHandler.badRequest(
        `Invalid delivery status transition: '${from}' → '${to}'. Allowed from '${from}': ${DELIVERY_STATUS_TRANSITIONS[from].join(', ')}`,
      );
    }
  }

  // El índice único (assignment_type, external_delivery_id) es el respaldo ante dos altas
  // con el mismo id externo.
  private async runGuarded<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') {
        throw new ConflictException(
          'This external delivery is already linked to another assignment.',
        );
      }
      throw error;
    }
  }

  async create(
    dto: CreateDeliveryAssignmentDto,
    merchantId: number,
  ): Promise<OneDeliveryAssignmentResponseDto> {
    this.assertMerchant(merchantId);
    const type = dto.assignment_type ?? AssignmentType.IN_HOUSE;
    this.assertTypeFields(type, dto);
    const now = new Date();

    const saved = await this.runGuarded(() =>
      this.dataSource.transaction(async (manager) => {
        const order = await this.lockOrder(manager, dto.order, merchantId);
        this.assertDeliveryOrder(order);
        await this.assertNoOpenAssignment(manager, order.id);

        // IN_HOUSE con repartidor → ASSIGNED; sin él queda PENDING (pendiente de despacho).
        // Un DSP empieza siempre PENDING: el evento `dasher_assigned` (o un PATCH) lo asigna.
        const driver =
          type === AssignmentType.IN_HOUSE && dto.deliveryDriver
            ? await this.claimDriver(manager, dto.deliveryDriver, merchantId)
            : null;

        const assignment = manager.create(DeliveryAssignment, {
          order,
          deliveryDriver: driver,
          assignment_type: type,
          delivery_status: driver
            ? DeliveryStatus.ASSIGNED
            : DeliveryStatus.PENDING,
          assigned_at: driver ? now : null,
          picked_up_at: null,
          delivered_at: null,
          external_delivery_id: dto.external_delivery_id ?? null,
          external_tracking_url: dto.external_tracking_url ?? null,
          external_dsp_fee: dto.external_dsp_fee ?? null,
          status: dto.status ?? 'active',
        });
        const created = await manager.save(assignment);
        await this.syncOrderDeliveryStatus(
          manager,
          order.id,
          created.delivery_status,
        );
        return created;
      }),
    );

    this.notifyChanges(
      merchantId,
      saved,
      saved.deliveryDriver
        ? [{ id: saved.deliveryDriver.id, status: DriverStatus.ON_DELIVERY }]
        : [],
    );
    return {
      statusCode: 201,
      message: 'Delivery Assignment created successfully',
      data: saved,
    };
  }

  async findAll(
    query: QueryDeliveryAssignmentDto,
    merchantId: number,
  ): Promise<PaginatedDeliveryAssignmentResponseDto> {
    this.assertMerchant(merchantId);
    const {
      status,
      delivery_status,
      assignment_type,
      search,
      page = 1,
      limit = 10,
      sortBy = 'id',
      sortOrder = 'DESC',
    } = query;

    if (page < 1 || limit < 1) {
      ErrorHandler.invalidInput('Page and limit must be positive integers');
    }

    const qb = this.deliveryAssignmentRepository
      .createQueryBuilder('deliveryAssignment')
      .innerJoin('deliveryAssignment.order', 'order')
      .leftJoin('deliveryAssignment.deliveryDriver', 'deliveryDriver')
      .select([
        'deliveryAssignment',
        'order.id',
        'order.order_number',
        'order.delivery_address',
        'order.kitchen_status',
        'order.ready_at',
        'deliveryDriver.id',
        'deliveryDriver.name',
        'deliveryDriver.phone',
        'deliveryDriver.status',
        // El tablero pinta el icono del vehículo sin otra llamada a la flota.
        'deliveryDriver.vehicleType',
      ])
      .where('order.merchant_id = :merchantId', { merchantId });

    qb.andWhere('deliveryAssignment.status IN (:...statuses)', {
      statuses: status?.length ? status : LIVE_RECORD_STATUSES,
    });
    if (delivery_status?.length) {
      qb.andWhere(
        'deliveryAssignment.delivery_status IN (:...deliveryStatuses)',
        {
          deliveryStatuses: delivery_status,
        },
      );
    }
    if (assignment_type?.length) {
      qb.andWhere('deliveryAssignment.assignment_type IN (:...types)', {
        types: assignment_type,
      });
    }
    const term = search?.trim();
    if (term) {
      qb.andWhere(
        `(deliveryDriver.name ILIKE :term
          OR CAST(order.id AS TEXT) ILIKE :term
          OR order.order_number ILIKE :term
          OR order.delivery_address ILIKE :term)`,
        { term: `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%` },
      );
    }

    qb.orderBy(`deliveryAssignment.${sortBy}`, sortOrder);
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      statusCode: 200,
      message: 'Delivery Assignments retrieved successfully',
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
  ): Promise<OneDeliveryAssignmentResponseDto> {
    this.assertMerchant(merchantId);
    const deliveryAssignment = await this.findScoped(id, merchantId);
    return {
      statusCode: 200,
      message: 'Delivery Assignment retrieved successfully',
      data: deliveryAssignment,
    };
  }

  async update(
    id: number,
    dto: UpdateDeliveryAssignmentDto,
    merchantId: number,
  ): Promise<OneDeliveryAssignmentResponseDto> {
    this.assertMerchant(merchantId);
    this.assertId(id);
    const now = new Date();
    const driverChanges: Array<{ id: number; status: DriverStatus }> = [];

    const saved = await this.runGuarded(() =>
      this.dataSource.transaction(async (manager) => {
        const assignment = await this.lockAssignment(manager, id, merchantId);
        const type = assignment.assignment_type;
        this.assertTypeFields(type, dto);

        const from = assignment.delivery_status;
        let target = dto.delivery_status ?? from;

        if (
          dto.deliveryDriver !== undefined &&
          dto.deliveryDriver !== assignment.deliveryDriver?.id
        ) {
          // Cambiar de repartidor sólo tiene sentido antes de la recogida.
          if (
            from !== DeliveryStatus.PENDING &&
            from !== DeliveryStatus.ASSIGNED
          ) {
            ErrorHandler.badRequest(
              `The driver can only be changed while the assignment is pending or assigned (current: '${from}')`,
            );
          }
          if (target !== from && target !== DeliveryStatus.ASSIGNED) {
            ErrorHandler.badRequest(
              'Change the driver and move the delivery forward in separate requests',
            );
          }
          const driver = await this.claimDriver(
            manager,
            dto.deliveryDriver,
            merchantId,
          );
          if (assignment.deliveryDriver) {
            await this.releaseDriver(manager, assignment.deliveryDriver.id);
            driverChanges.push({
              id: assignment.deliveryDriver.id,
              status: DriverStatus.ACTIVE,
            });
          }
          driverChanges.push({
            id: driver.id,
            status: DriverStatus.ON_DELIVERY,
          });
          assignment.deliveryDriver = driver;
          assignment.assigned_at = now;
          target = DeliveryStatus.ASSIGNED;
        }

        if (target !== from) {
          this.assertTransition(from, target);
          if (target === DeliveryStatus.ASSIGNED) {
            const hasRunner =
              type === AssignmentType.IN_HOUSE
                ? !!assignment.deliveryDriver
                : !!(
                    dto.external_delivery_id ?? assignment.external_delivery_id
                  );
            if (!hasRunner) {
              ErrorHandler.badRequest(
                type === AssignmentType.IN_HOUSE
                  ? 'An active deliveryDriver is required to move to assigned'
                  : 'external_delivery_id is required to move a DSP assignment to assigned',
              );
            }
          }
          this.applyTimestamps(assignment, target, now);
          assignment.delivery_status = target;

          // DELIVERED, CANCELLED y también FAILED liberan al repartidor: el reparto terminó
          // y, si falló, el repartidor vuelve libre a la tienda. Los DSP no tocan repartidores.
          if (
            isTerminalStatus(target) &&
            type === AssignmentType.IN_HOUSE &&
            assignment.deliveryDriver
          ) {
            await this.releaseDriver(manager, assignment.deliveryDriver.id);
            assignment.deliveryDriver.status = DriverStatus.ACTIVE;
            driverChanges.push({
              id: assignment.deliveryDriver.id,
              status: DriverStatus.ACTIVE,
            });
          }
        }
        const statusChanged = target !== from;

        // Los datos externos se pueden corregir incluso tras cerrar (conciliación del coste).
        if (dto.external_delivery_id !== undefined) {
          assignment.external_delivery_id = dto.external_delivery_id;
        }
        if (dto.external_tracking_url !== undefined) {
          assignment.external_tracking_url = dto.external_tracking_url;
        }
        if (dto.external_dsp_fee !== undefined) {
          assignment.external_dsp_fee = dto.external_dsp_fee;
        }
        if (dto.status !== undefined) assignment.status = dto.status;

        const updated = await manager.save(assignment);
        if (statusChanged) {
          await this.syncOrderDeliveryStatus(
            manager,
            assignment.order.id,
            updated.delivery_status,
          );
        }
        return updated;
      }),
    );

    this.notifyChanges(merchantId, saved, driverChanges);
    return {
      statusCode: 200,
      message: 'Delivery Assignment updated successfully',
      data: saved,
    };
  }

  async remove(
    id: number,
    merchantId: number,
  ): Promise<OneDeliveryAssignmentResponseDto> {
    this.assertMerchant(merchantId);
    this.assertId(id);

    const released: Array<{ id: number; status: DriverStatus }> = [];
    const deleted = await this.dataSource.transaction(async (manager) => {
      const assignment = await this.lockAssignment(manager, id, merchantId);
      // Borrar una asignación abierta equivale a cancelarla: si no, el repartidor se
      // quedaría `on_delivery` para siempre.
      if (!isTerminalStatus(assignment.delivery_status)) {
        assignment.delivery_status = DeliveryStatus.CANCELLED;
        if (
          assignment.assignment_type === AssignmentType.IN_HOUSE &&
          assignment.deliveryDriver
        ) {
          await this.releaseDriver(manager, assignment.deliveryDriver.id);
          released.push({
            id: assignment.deliveryDriver.id,
            status: DriverStatus.ACTIVE,
          });
        }
        await this.syncOrderDeliveryStatus(
          manager,
          assignment.order.id,
          DeliveryStatus.CANCELLED,
        );
      }
      assignment.status = 'deleted';
      return manager.save(assignment);
    });

    this.notifyChanges(merchantId, deleted, released);
    return {
      statusCode: 200,
      message: 'Delivery Assignment deleted successfully',
      data: deleted,
    };
  }

  /**
   * KPI del tablero de despacho.
   * - pending_dispatch: pedidos `delivery` activos, no cancelados, con `kitchen_status = ready`
   *   (cocina terminó, listos para recoger) y SIN asignación abierta. Los que ya tienen una
   *   asignación PENDING salen aparte en `pending_assignments` para no contarlos dos veces.
   * - in_transit: asignaciones PICKED_UP o IN_TRANSIT.
   * - avg_completion_minutes: media assigned_at → delivered_at de las entregadas en las
   *   últimas AVG_COMPLETION_WINDOW_HOURS horas (null si no hay ninguna).
   * - delayed: asignadas/en curso cuyo assigned_at supera DELIVERY_DELAY_THRESHOLD_MINUTES
   *   (no existe hora estimada de entrega en el modelo).
   * - in_house_share_pct / dsp_share_pct: reparto de las asignaciones abiertas (null si 0).
   * - dsp_fee_today: suma de external_dsp_fee de hoy. El comercio no tiene zona horaria, así
   *   que "hoy" es desde la medianoche de la hora local del SERVIDOR.
   * Los cortes de fecha se calculan en JS y van como parámetro: así se comparan igual que
   * se guardaron (TypeORM escribe `new Date()` en columnas `timestamp` sin zona).
   */
  async summary(merchantId: number): Promise<{
    statusCode: number;
    message: string;
    data: DeliveryAssignmentSummaryResult;
  }> {
    this.assertMerchant(merchantId);
    const now = Date.now();
    const delayCutoff = new Date(
      now - DELIVERY_DELAY_THRESHOLD_MINUTES * 60_000,
    );
    const completionCutoff = new Date(
      now - AVG_COMPLETION_WINDOW_HOURS * 3_600_000,
    );
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const open = sqlList(OPEN_DELIVERY_STATUSES);
    const dispatched = sqlList(DISPATCHED_DELIVERY_STATUSES);
    const rows: Array<{
      pending_dispatch: number | string;
      pending_assignments: number | string;
      in_transit: number | string;
      delayed: number | string;
      avg_completion_minutes: number | string | null;
      live_in_house: number | string;
      live_dsp: number | string;
      dsp_fee_today: number | string | null;
    }> = await this.deliveryAssignmentRepository.query(
      `SELECT
         (SELECT COUNT(*)::int
            FROM orders o
           WHERE o.merchant_id = $1
             AND o.type = $2
             AND o.logical_status = $3
             AND o.kitchen_status = $4
             AND o.status <> $5
             AND NOT EXISTS (
               SELECT 1 FROM delivery_assignments x
                WHERE x.order_id = o.id
                  AND x.status <> 'deleted'
                  AND x.delivery_status IN (${open}))
         ) AS pending_dispatch,
         COUNT(*) FILTER (WHERE a.delivery_status = '${DeliveryStatus.PENDING}')::int AS pending_assignments,
         COUNT(*) FILTER (WHERE a.delivery_status IN ('${DeliveryStatus.PICKED_UP}', '${DeliveryStatus.IN_TRANSIT}'))::int AS in_transit,
         COUNT(*) FILTER (WHERE a.delivery_status IN (${dispatched}) AND a.assigned_at < $6)::int AS delayed,
         AVG(EXTRACT(EPOCH FROM (a.delivered_at - a.assigned_at)) / 60)
           FILTER (WHERE a.delivery_status = '${DeliveryStatus.DELIVERED}'
                     AND a.assigned_at IS NOT NULL
                     AND a.delivered_at >= $7) AS avg_completion_minutes,
         COUNT(*) FILTER (WHERE a.delivery_status IN (${open}) AND a.assignment_type = '${AssignmentType.IN_HOUSE}')::int AS live_in_house,
         COUNT(*) FILTER (WHERE a.delivery_status IN (${open}) AND a.assignment_type <> '${AssignmentType.IN_HOUSE}')::int AS live_dsp,
         COALESCE(SUM(a.external_dsp_fee)
           FILTER (WHERE a.assignment_type <> '${AssignmentType.IN_HOUSE}'
                     AND COALESCE(a.assigned_at, a.created_at) >= $8), 0) AS dsp_fee_today
       FROM delivery_assignments a
       JOIN orders ao ON ao.id = a.order_id
      WHERE ao.merchant_id = $1
        AND a.status <> 'deleted'`,
      [
        merchantId,
        OrderType.DELIVERY,
        OrderStatus.ACTIVE,
        KitchenStatus.READY,
        OrderBusinessStatus.CANCELLED,
        delayCutoff,
        completionCutoff,
        startOfToday,
      ],
    );

    const row = rows[0] ?? ({} as (typeof rows)[number]);
    const num = (v: unknown) => Number(v ?? 0);
    const liveInHouse = num(row.live_in_house);
    const liveDsp = num(row.live_dsp);
    const live = liveInHouse + liveDsp;
    const inHouseShare = live > 0 ? round((liveInHouse / live) * 100, 1) : null;

    return {
      statusCode: 200,
      message: 'Delivery assignment summary retrieved successfully',
      data: {
        pending_dispatch: num(row.pending_dispatch),
        pending_assignments: num(row.pending_assignments),
        in_transit: num(row.in_transit),
        avg_completion_minutes:
          row.avg_completion_minutes === null ||
          row.avg_completion_minutes === undefined
            ? null
            : round(Number(row.avg_completion_minutes), 1),
        delayed: num(row.delayed),
        delay_threshold_minutes: DELIVERY_DELAY_THRESHOLD_MINUTES,
        live_assignments: live,
        in_house_share_pct: inHouseShare,
        // Complementario para que ambos sumen exactamente 100.
        dsp_share_pct:
          inHouseShare === null ? null : round(100 - inHouseShare, 1),
        dsp_fee_today: round(num(row.dsp_fee_today), 2),
      },
    };
  }

  private assertProviderConfigured(provider: AssignmentType): void {
    if (!this.dspProvider.isConfigured(provider)) {
      throw new ServiceUnavailableException(
        `Delivery provider '${provider}' is not configured. No quote or runner can be requested; record the external delivery manually instead.`,
      );
    }
  }

  private async findDeliveryOrder(
    orderId: number,
    merchantId: number,
  ): Promise<{ order: Order; zone: DeliveryZone | null }> {
    const order = await this.orderRepository.findOne({
      where: {
        id: orderId,
        merchant_id: merchantId,
        logical_status: OrderStatus.ACTIVE,
      },
    });
    if (!order) {
      ErrorHandler.orderNotFound();
    }
    this.assertDeliveryOrder(order);
    const zone = order.delivery_zone_id
      ? await this.deliveryZoneRepository.findOne({
          where: { id: order.delivery_zone_id, merchant: { id: merchantId } },
        })
      : null;
    return { order, zone };
  }

  /** Cotización de un DSP. Sin proveedor configurado → 503; nunca se inventa un precio. */
  async externalQuote(
    dto: ExternalQuoteDto,
    merchantId: number,
  ): Promise<{ statusCode: number; message: string; data: DspQuote }> {
    this.assertMerchant(merchantId);
    const { order, zone } = await this.findDeliveryOrder(
      dto.order_id,
      merchantId,
    );
    this.assertProviderConfigured(dto.provider);
    const quote = await this.dspProvider.quote({
      provider: dto.provider,
      order,
      zone,
    });
    return {
      statusCode: 200,
      message: 'Delivery quote retrieved successfully',
      data: quote,
    };
  }

  /**
   * Acepta la cotización: pide el repartidor al DSP y crea la asignación (sin repartidor
   * propio, con los datos externos). La llamada externa se hace con el pedido bloqueado para
   * que dos clics no encarguen dos repartidores.
   */
  async externalDispatch(
    dto: ExternalDispatchDto,
    merchantId: number,
  ): Promise<OneDeliveryAssignmentResponseDto> {
    this.assertMerchant(merchantId);
    this.assertProviderConfigured(dto.provider);
    const { zone } = await this.findDeliveryOrder(dto.order_id, merchantId);

    const saved = await this.runGuarded(() =>
      this.dataSource.transaction(async (manager) => {
        const order = await this.lockOrder(manager, dto.order_id, merchantId);
        await this.assertNoOpenAssignment(manager, order.id);
        const runner = await this.dspProvider.requestRunner({
          provider: dto.provider,
          order,
          zone,
          quote_id: dto.quote_id,
        });
        const assignment = manager.create(DeliveryAssignment, {
          order,
          deliveryDriver: null,
          assignment_type: dto.provider,
          delivery_status: DeliveryStatus.PENDING,
          assigned_at: null,
          picked_up_at: null,
          delivered_at: null,
          external_delivery_id: runner.external_delivery_id,
          external_tracking_url: runner.external_tracking_url,
          external_dsp_fee: runner.fee,
          status: 'active',
        });
        const created = await manager.save(assignment);
        await this.syncOrderDeliveryStatus(
          manager,
          order.id,
          created.delivery_status,
        );
        return created;
      }),
    );

    this.notifyChanges(merchantId, saved);
    return {
      statusCode: 201,
      message: 'External delivery dispatched successfully',
      data: saved,
    };
  }

  /**
   * Evento de webhook de un DSP (firma YA verificada por el controlador). Idempotente: un
   * evento repetido o ya superado no cambia nada; un salto inválido se registra y se ignora.
   * Siempre se responde OK para que el proveedor no reintente indefinidamente.
   */
  async handleProviderEvent(
    provider: AssignmentType,
    event: { event: string; external_delivery_id: string },
  ): Promise<ProviderEventResult> {
    const target = PROVIDER_EVENT_STATUS[event.event];
    if (!target) {
      this.logger.warn(
        `Ignoring unsupported ${provider} event '${event.event}'`,
      );
      return {
        outcome: 'unsupported_event',
        assignment_id: null,
        delivery_status: null,
      };
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const assignment = await manager
        .createQueryBuilder(DeliveryAssignment, 'a')
        .setLock('pessimistic_write')
        .where('a.assignment_type = :provider', { provider })
        .andWhere('a.external_delivery_id = :externalId', {
          externalId: event.external_delivery_id,
        })
        .andWhere('a.status <> :deleted', { deleted: 'deleted' })
        .getOne();

      if (!assignment) {
        this.logger.warn(
          `Ignoring ${provider} event '${event.event}' for unknown delivery '${event.external_delivery_id}'`,
        );
        return {
          outcome: 'unknown_delivery' as const,
          assignment_id: null,
          delivery_status: null,
        };
      }

      const from = assignment.delivery_status;
      const base = { assignment_id: assignment.id, delivery_status: from };
      if (from === target) return { outcome: 'duplicate' as const, ...base };
      if (
        isTerminalStatus(from) ||
        DELIVERY_STATUS_PROGRESS.indexOf(from) >
          DELIVERY_STATUS_PROGRESS.indexOf(target)
      ) {
        return { outcome: 'already_past' as const, ...base };
      }
      if (!canTransition(from, target)) {
        this.logger.warn(
          `Ignoring ${provider} event '${event.event}' for assignment #${assignment.id}: invalid transition '${from}' → '${target}'`,
        );
        return { outcome: 'invalid_transition' as const, ...base };
      }

      this.applyTimestamps(assignment, target, new Date());
      assignment.delivery_status = target;
      await manager.save(assignment);
      // El QueryBuilder con bloqueo no trae relaciones: se relee para saber pedido y comercio.
      const full = await manager.findOne(DeliveryAssignment, {
        where: { id: assignment.id },
        relations: ['order', 'deliveryDriver'],
      });
      if (full?.order) {
        await this.syncOrderDeliveryStatus(manager, full.order.id, target);
      }
      return {
        outcome: 'applied' as const,
        assignment_id: assignment.id,
        delivery_status: target,
        merchant_id: full?.order?.merchant_id ?? null,
        assignment: full,
      };
    });

    if (
      result.outcome === 'applied' &&
      result.merchant_id &&
      result.assignment
    ) {
      this.notifyChanges(result.merchant_id, result.assignment);
    }
    return {
      outcome: result.outcome,
      assignment_id: result.assignment_id,
      delivery_status: result.delivery_status,
    };
  }
}
