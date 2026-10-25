//src/commerce/delivery-system/delivery-fee/delivery-fee.service.ts
//
// Una tarifa pertenece al comercio de su zona: todas las operaciones se acotan por
// `deliveryZone.merchant` del JWT (antes `findAll` listaba las tarifas de todos).
import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeliveryFee } from './entity/delivery-fee.entity';
import { DeliveryZone } from '../delivery-zone/entity/delivery-zone.entity';
import { Repository, In, Not } from 'typeorm';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { CreateDeliveryFeeDto } from './dto/create-delivery-fee.dto';
import { OneDeliveryFeeResponseDto } from './dto/delivery-fee-response.dto';
import { QueryDeliveryFeeDto } from './dto/query-delivery-fee.dto';
import { PaginatedDeliveryFeeResponseDto } from './dto/paginated-delivery-fee-response.dto';
import { UpdateDeliveryFeeDto } from './dto/update-delivery-fee.dto';
import { QuoteDeliveryFeeDto } from './dto/quote-delivery-fee.dto';
import {
  computeDeliveryFee,
  FeeQuote,
} from './utils/delivery-fee-calculator.util';
import {
  DELIVERY_ZONE_STATUSES,
  ORDERABLE_ZONE_STATUS,
} from '../delivery-zone/constants/delivery-zone.constants';

const LIVE_FEE_STATUSES = ['active', 'inactive'];

export type QuoteBlockReason =
  | 'zone_not_accepting_orders'
  | 'no_active_fee'
  | 'below_min_order';

export interface DeliveryFeeQuoteResult extends FeeQuote {
  delivery_zone_id: number;
  zone_name: string;
  zone_status: string;
  delivery_fee_id: number | null;
  subtotal: number;
  min_order_amount: number | null;
  free_above: number | null;
  reason: QuoteBlockReason | null;
  message: string;
}

export interface DeliveryFeeSummaryResult {
  active_zones: number;
  active_fees: number;
  avg_base_fee: number | null;
  free_shipping_zones: number;
  zones_without_fee_count: number;
  zones_without_fee: Array<{ id: number; name: string }>;
}

const money = (value: number) => `$${value.toFixed(2)}`;

@Injectable()
export class DeliveryFeeService {
  constructor(
    @InjectRepository(DeliveryZone)
    private readonly deliveryZoneRepository: Repository<DeliveryZone>,

    @InjectRepository(DeliveryFee)
    private readonly deliveryFeeRepository: Repository<DeliveryFee>,
  ) {}

  private assertMerchant(merchantId: number): void {
    if (!Number.isInteger(merchantId) || merchantId <= 0) {
      ErrorHandler.forbidden('You must be associated with a merchant');
    }
  }

  private async findZone(
    zoneId: number,
    merchantId: number,
  ): Promise<DeliveryZone> {
    const zone = await this.deliveryZoneRepository.findOne({
      where: {
        id: zoneId,
        merchant: { id: merchantId },
        status: In([...DELIVERY_ZONE_STATUSES]),
      },
    });
    if (!zone) {
      ErrorHandler.deliveryZoneNotFound();
    }
    return zone;
  }

  private async findScoped(
    id: number,
    merchantId: number,
  ): Promise<DeliveryFee> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }
    const fee = await this.deliveryFeeRepository.findOne({
      where: {
        id,
        status: In(LIVE_FEE_STATUSES),
        deliveryZone: { merchant: { id: merchantId } },
      },
      relations: ['deliveryZone'],
    });
    if (!fee) {
      ErrorHandler.deliveryFeeNotFound();
    }
    return fee;
  }

  /** free_above tiene que quedar ESTRICTAMENTE por encima del pedido mínimo. */
  private assertThresholds(
    minOrder: number | null | undefined,
    freeAbove: number | null | undefined,
  ): void {
    if (minOrder == null || freeAbove == null) return;
    if (Number(freeAbove) <= Number(minOrder)) {
      ErrorHandler.badRequest(
        `free_above (${money(Number(freeAbove))}) must be greater than min_order_amount (${money(Number(minOrder))})`,
      );
    }
  }

  /** Una sola tarifa activa por zona: con dos, el importe cobrado dependería del azar. */
  private async assertSingleActive(
    zoneId: number,
    excludeId?: number,
  ): Promise<void> {
    const clash = await this.deliveryFeeRepository.findOne({
      where: {
        deliveryZone: { id: zoneId },
        status: 'active',
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
      loadEagerRelations: false,
    });
    if (clash) {
      throw new ConflictException(
        `Delivery zone ${zoneId} already has an active fee schedule (#FEE-${clash.id}). Deactivate it first.`,
      );
    }
  }

  // El índice único parcial (scripts/add-delivery-fee-single-active-index.sql) es el
  // respaldo ante dos altas simultáneas que pasen a la vez la comprobación anterior.
  private async saveGuarded(fee: DeliveryFee): Promise<DeliveryFee> {
    try {
      return await this.deliveryFeeRepository.save(fee);
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') {
        throw new ConflictException(
          'This delivery zone already has an active fee schedule.',
        );
      }
      throw error;
    }
  }

  async create(
    dto: CreateDeliveryFeeDto,
    merchantId: number,
  ): Promise<OneDeliveryFeeResponseDto> {
    this.assertMerchant(merchantId);
    const deliveryZone = await this.findZone(dto.deliveryZone, merchantId);
    this.assertThresholds(dto.min_order_amount, dto.free_above);
    if (dto.status === 'active') {
      await this.assertSingleActive(deliveryZone.id);
    }

    const deliveryFee = this.deliveryFeeRepository.create({
      deliveryZone,
      base_fee: dto.base_fee,
      per_km_fee: dto.per_km_fee ?? null,
      min_order_amount: dto.min_order_amount ?? null,
      free_above: dto.free_above ?? null,
      status: dto.status,
    } as Partial<DeliveryFee>);

    const savedDeliveryFee = await this.saveGuarded(deliveryFee);

    return {
      statusCode: 201,
      message: 'Delivery Fee created successfully',
      data: savedDeliveryFee,
    };
  }

  async findAll(
    query: QueryDeliveryFeeDto,
    merchantId: number,
  ): Promise<PaginatedDeliveryFeeResponseDto> {
    this.assertMerchant(merchantId);
    const {
      status,
      delivery_zone_id,
      search,
      page = 1,
      limit = 10,
      sortBy = 'id',
      sortOrder = 'DESC',
    } = query;

    if (page < 1 || limit < 1) {
      ErrorHandler.invalidInput('Page and limit must be positive integers');
    }

    const qb = this.deliveryFeeRepository
      .createQueryBuilder('deliveryFee')
      .innerJoin('deliveryFee.deliveryZone', 'deliveryZone')
      .innerJoin('deliveryZone.merchant', 'merchant')
      .select([
        'deliveryFee',
        'deliveryZone.id',
        'deliveryZone.name',
        'deliveryZone.status',
      ])
      .where('merchant.id = :merchantId', { merchantId })
      // La tarifa de una zona borrada ya no se puede aplicar a nada.
      .andWhere('deliveryZone.status <> :deletedZone', {
        deletedZone: 'deleted',
      });

    if (status?.length) {
      qb.andWhere('deliveryFee.status IN (:...statuses)', { statuses: status });
    } else {
      qb.andWhere('deliveryFee.status IN (:...statuses)', {
        statuses: LIVE_FEE_STATUSES,
      });
    }
    if (delivery_zone_id) {
      qb.andWhere('deliveryZone.id = :zoneId', { zoneId: delivery_zone_id });
    }
    const term = search?.trim();
    if (term) {
      qb.andWhere('deliveryZone.name ILIKE :term', {
        term: `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`,
      });
    }

    qb.orderBy(`deliveryFee.${sortBy}`, sortOrder);
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      statusCode: 200,
      message: 'Delivery Fees retrieved successfully',
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
  ): Promise<OneDeliveryFeeResponseDto> {
    this.assertMerchant(merchantId);
    const deliveryFee = await this.findScoped(id, merchantId);
    return {
      statusCode: 200,
      message: 'Delivery Fee retrieved successfully',
      data: deliveryFee,
    };
  }

  async update(
    id: number,
    dto: UpdateDeliveryFeeDto,
    merchantId: number,
  ): Promise<OneDeliveryFeeResponseDto> {
    this.assertMerchant(merchantId);
    const deliveryFee = await this.findScoped(id, merchantId);

    // Campo a campo: el `Object.assign(fee, dto)` de antes metía el id numérico
    // `deliveryZone` en la relación.
    if (dto.deliveryZone !== undefined) {
      deliveryFee.deliveryZone = await this.findZone(
        dto.deliveryZone,
        merchantId,
      );
    }
    if (dto.base_fee !== undefined) deliveryFee.base_fee = dto.base_fee;
    if (dto.per_km_fee !== undefined) deliveryFee.per_km_fee = dto.per_km_fee;
    if (dto.min_order_amount !== undefined) {
      deliveryFee.min_order_amount = dto.min_order_amount;
    }
    if (dto.free_above !== undefined) deliveryFee.free_above = dto.free_above;
    if (dto.status !== undefined) deliveryFee.status = dto.status;

    // Se valida el resultado FINAL: subir sólo el mínimo por encima de un free_above ya
    // guardado también rompe la regla.
    this.assertThresholds(deliveryFee.min_order_amount, deliveryFee.free_above);
    if (deliveryFee.status === 'active') {
      await this.assertSingleActive(
        deliveryFee.deliveryZone.id,
        deliveryFee.id,
      );
    }

    const updatedDeliveryFee = await this.saveGuarded(deliveryFee);
    return {
      statusCode: 200,
      message: 'Delivery Fee updated successfully',
      data: updatedDeliveryFee,
    };
  }

  async remove(
    id: number,
    merchantId: number,
  ): Promise<OneDeliveryFeeResponseDto> {
    this.assertMerchant(merchantId);
    const deliveryFee = await this.findScoped(id, merchantId);

    deliveryFee.status = 'deleted';
    const deletedDeliveryFee =
      await this.deliveryFeeRepository.save(deliveryFee);
    return {
      statusCode: 200,
      message: 'Delivery Fee deleted successfully',
      data: deletedDeliveryFee,
    };
  }

  /**
   * KPI de la cabecera de tarifas. Sólo cuentan las zonas `active` y su tarifa `active`
   * (hay como mucho una por zona): una zona inactiva o en mantenimiento no cobra nada.
   * `zones_without_fee` son las zonas activas sin tarifa activa, que hoy rechazan
   * cualquier pedido con `no_active_fee`.
   */
  async summary(merchantId: number): Promise<{
    statusCode: number;
    message: string;
    data: DeliveryFeeSummaryResult;
  }> {
    this.assertMerchant(merchantId);
    const rows: Array<{
      id: number;
      name: string;
      base_fee: string | null;
      free_above: string | null;
    }> = await this.deliveryZoneRepository.query(
      `SELECT z.id, z.name, f.base_fee, f.free_above
         FROM delivery_zones z
    LEFT JOIN delivery_fees f
           ON f.delivery_zone_id = z.id
          AND f.status = 'active'
        WHERE z.merchant_id = $1
          AND z.status = $2
     ORDER BY z.name ASC`,
      [merchantId, ORDERABLE_ZONE_STATUS],
    );

    const zoneIds = new Set(rows.map((r) => Number(r.id)));
    const priced = rows.filter((r) => r.base_fee !== null);
    const withoutFee = rows
      .filter((r) => r.base_fee === null)
      .map((r) => ({ id: Number(r.id), name: r.name }));
    const freeShippingZones = new Set(
      priced
        .filter((r) => r.free_above !== null && Number(r.free_above) > 0)
        .map((r) => Number(r.id)),
    );
    const avg =
      priced.length > 0
        ? priced.reduce((sum, r) => sum + Number(r.base_fee), 0) / priced.length
        : null;

    return {
      statusCode: 200,
      message: 'Delivery fee summary retrieved successfully',
      data: {
        active_zones: zoneIds.size,
        active_fees: priced.length,
        avg_base_fee: avg === null ? null : Math.round(avg * 100) / 100,
        free_shipping_zones: freeShippingZones.size,
        zones_without_fee_count: withoutFee.length,
        zones_without_fee: withoutFee,
      },
    };
  }

  /**
   * Tarifa de un pedido. Responde 200 también cuando el reparto NO se puede aceptar
   * (`eligible: false` + `reason`): el TPV necesita el importe que falta para enseñarlo, no
   * sólo un error.
   */
  async quote(
    dto: QuoteDeliveryFeeDto,
    merchantId: number,
  ): Promise<{
    statusCode: number;
    message: string;
    data: DeliveryFeeQuoteResult;
  }> {
    this.assertMerchant(merchantId);
    const zone = await this.findZone(dto.delivery_zone_id, merchantId);
    const fee = await this.deliveryFeeRepository.findOne({
      where: { deliveryZone: { id: zone.id }, status: 'active' },
      relations: ['deliveryZone'],
      loadEagerRelations: false,
    });

    const base = {
      delivery_zone_id: zone.id,
      zone_name: zone.name,
      zone_status: zone.status,
      subtotal: dto.subtotal,
    };

    if (zone.status !== ORDERABLE_ZONE_STATUS || !fee) {
      const reason: QuoteBlockReason =
        zone.status !== ORDERABLE_ZONE_STATUS
          ? 'zone_not_accepting_orders'
          : 'no_active_fee';
      const message =
        reason === 'zone_not_accepting_orders'
          ? `Delivery zone "${zone.name}" is ${zone.status} and is not accepting orders.`
          : `Delivery zone "${zone.name}" has no active fee schedule.`;
      return {
        statusCode: 200,
        message,
        data: {
          ...base,
          ...computeDeliveryFee({ base_fee: 0 }, dto.subtotal, 0),
          eligible: false,
          delivery_fee_id: fee?.id ?? null,
          min_order_amount: fee?.min_order_amount ?? null,
          free_above: fee?.free_above ?? null,
          reason,
          message,
        },
      };
    }

    const result = computeDeliveryFee(fee, dto.subtotal, dto.distance_km ?? 0);
    const message = !result.eligible
      ? `Add ${money(result.shortfall)} more to reach the ${money(Number(fee.min_order_amount))} minimum order for delivery.`
      : result.free_delivery
        ? 'Free delivery applied.'
        : `Delivery fee: ${money(result.fee)}.`;
    return {
      statusCode: 200,
      message,
      data: {
        ...base,
        ...result,
        delivery_fee_id: fee.id,
        min_order_amount: fee.min_order_amount,
        free_above: fee.free_above,
        reason: result.eligible ? null : 'below_min_order',
        message,
      },
    };
  }
}
