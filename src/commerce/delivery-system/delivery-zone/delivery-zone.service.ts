//src/commerce/delivery-system/delivery-zone/delivery-zone.service.ts
//
// Todas las operaciones van acotadas al comercio del JWT: antes `findAll` devolvía las zonas
// de TODOS los comercios y `create` se fiaba del `merchant` del cuerpo.
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeliveryZone } from './entity/delivery-zone.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Repository, In } from 'typeorm';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { OneDeliveryZoneResponseDto } from './dto/delivery-zone-response.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { QueryDeliveryZoneDto } from './dto/query-delivery-zone.dto';
import { PaginatedDeliveryZoneResponseDto } from './dto/paginated-delivery-zone-response.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';
import {
  DELIVERY_ZONE_STATUSES,
  ORDERABLE_ZONE_STATUS,
} from './constants/delivery-zone.constants';
import {
  circleZonePolygon,
  parseZoneGeoJson,
  pointInZone,
  readStoredGeometry,
  vertexCount,
  ZoneGeometry,
} from './utils/zone-geojson.util';
import { RadiusPolygonDto } from './dto/radius-polygon.dto';

export interface ZoneLocateMatch {
  id: number;
  name: string;
  status: string;
}

export interface ZoneLocateResult {
  lat: number;
  lng: number;
  /** Hay al menos una zona ACTIVA que cubre el punto: se puede repartir. */
  covered: boolean;
  zones: ZoneLocateMatch[];
  /** Zonas que cubren el punto pero no aceptan pedidos (inactive / maintenance). */
  blocked_zones: ZoneLocateMatch[];
}

export interface ZoneCoverageResult {
  delivery_orders: number;
  matched_orders: number;
  /** null cuando todavía no hay pedidos de reparto (0/0 no es un 0 %). */
  coverage_pct: number | null;
  active_zones: number;
  /** Zonas vivas (no borradas) sin perímetro GeoJSON: ningún pedido se puede geocercar en ellas. */
  zones_without_geojson: number;
}

@Injectable()
export class DeliveryZoneService {
  constructor(
    @InjectRepository(DeliveryZone)
    private readonly deliveryZoneRepository: Repository<DeliveryZone>,

    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
  ) {}

  /** `undefined` = no tocar; `null` = borrar el perímetro; objeto/cadena = validar. */
  private normalizeGeoJson(input: unknown): ZoneGeometry | null | undefined {
    if (input === undefined) return undefined;
    if (input === null || input === '') return null;
    const result = parseZoneGeoJson(input);
    if (!result.ok) {
      ErrorHandler.badRequest(`Invalid geojson: ${result.error}`);
    }
    return result.geometry;
  }

  private assertMerchant(merchantId: number): void {
    if (!Number.isInteger(merchantId) || merchantId <= 0) {
      ErrorHandler.forbidden('You must be associated with a merchant');
    }
  }

  private async findScoped(
    id: number,
    merchantId: number,
  ): Promise<DeliveryZone> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }
    const deliveryZone = await this.deliveryZoneRepository.findOne({
      where: {
        id,
        status: In([...DELIVERY_ZONE_STATUSES]),
        merchant: { id: merchantId },
      },
      relations: ['merchant'],
    });
    if (!deliveryZone) {
      ErrorHandler.deliveryZoneNotFound();
    }
    return deliveryZone;
  }

  async create(
    dto: CreateDeliveryZoneDto,
    merchantId: number,
  ): Promise<OneDeliveryZoneResponseDto> {
    this.assertMerchant(merchantId);
    const merchant = await this.merchantRepository.findOne({
      where: { id: merchantId },
    });
    if (!merchant) {
      ErrorHandler.notFound('Merchant not found');
    }

    const deliveryZone = this.deliveryZoneRepository.create({
      name: dto.name,
      status: dto.status,
      merchant,
      description: dto.description || null,
      geojson: this.normalizeGeoJson(dto.geojson) ?? null,
    } as Partial<DeliveryZone>);

    const savedDeliveryZone =
      await this.deliveryZoneRepository.save(deliveryZone);

    return {
      statusCode: 201,
      message: 'Delivery Zone created successfully',
      data: savedDeliveryZone,
    };
  }

  async findAll(
    query: QueryDeliveryZoneDto,
    merchantId: number,
  ): Promise<PaginatedDeliveryZoneResponseDto> {
    this.assertMerchant(merchantId);
    const {
      status,
      search,
      page = 1,
      limit = 10,
      sortBy = 'id',
      sortOrder = 'DESC',
    } = query;

    if (page < 1 || limit < 1) {
      ErrorHandler.invalidInput('Page and limit must be positive integers');
    }

    const qb = this.deliveryZoneRepository
      .createQueryBuilder('deliveryZone')
      .innerJoin('deliveryZone.merchant', 'merchant')
      .select(['deliveryZone', 'merchant.id', 'merchant.name'])
      .where('merchant.id = :merchantId', { merchantId });

    if (status?.length) {
      qb.andWhere('deliveryZone.status IN (:...statuses)', {
        statuses: status,
      });
    } else {
      qb.andWhere('deliveryZone.status IN (:...statuses)', {
        statuses: [...DELIVERY_ZONE_STATUSES],
      });
    }

    const term = search?.trim();
    if (term) {
      qb.andWhere(
        '(deliveryZone.name ILIKE :term OR deliveryZone.description ILIKE :term)',
        { term: `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%` },
      );
    }

    qb.orderBy(`deliveryZone.${sortBy}`, sortOrder);
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      statusCode: 200,
      message: 'Delivery Zones retrieved successfully',
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
  ): Promise<OneDeliveryZoneResponseDto> {
    this.assertMerchant(merchantId);
    const deliveryZone = await this.findScoped(id, merchantId);
    return {
      statusCode: 200,
      message: 'Delivery Zone retrieved successfully',
      data: deliveryZone,
    };
  }

  async update(
    id: number,
    dto: UpdateDeliveryZoneDto,
    merchantId: number,
  ): Promise<OneDeliveryZoneResponseDto> {
    this.assertMerchant(merchantId);
    const deliveryZone = await this.findScoped(id, merchantId);

    // Campo a campo: el `Object.assign(zone, dto)` de antes metía el número `merchant` en la
    // relación y permitía mover una zona a otro comercio.
    if (dto.name !== undefined) deliveryZone.name = dto.name;
    if (dto.description !== undefined) {
      deliveryZone.description = dto.description || null;
    }
    if (dto.status !== undefined) deliveryZone.status = dto.status;
    const geojson = this.normalizeGeoJson(dto.geojson);
    if (geojson !== undefined) deliveryZone.geojson = geojson;

    const updatedDeliveryZone =
      await this.deliveryZoneRepository.save(deliveryZone);
    return {
      statusCode: 200,
      message: 'Delivery Zone updated successfully',
      data: updatedDeliveryZone,
    };
  }

  async remove(
    id: number,
    merchantId: number,
  ): Promise<OneDeliveryZoneResponseDto> {
    this.assertMerchant(merchantId);
    const deliveryZone = await this.findScoped(id, merchantId);

    deliveryZone.status = 'deleted';
    const deletedDeliveryZone =
      await this.deliveryZoneRepository.save(deliveryZone);
    return {
      statusCode: 200,
      message: 'Delivery Zone deleted successfully',
      data: deletedDeliveryZone,
    };
  }

  /**
   * Geocerca: qué zonas del comercio contienen el punto. El número de zonas de un comercio
   * es pequeño, así que se evalúa en memoria con el mismo algoritmo que usa el frontend.
   */
  async locate(
    lat: number,
    lng: number,
    merchantId: number,
  ): Promise<{ statusCode: number; message: string; data: ZoneLocateResult }> {
    this.assertMerchant(merchantId);
    const zones = await this.deliveryZoneRepository.find({
      where: {
        merchant: { id: merchantId },
        status: In([...DELIVERY_ZONE_STATUSES]),
      },
      relations: ['merchant'],
      select: ['id', 'name', 'status', 'geojson'],
      loadEagerRelations: false,
      order: { id: 'ASC' },
    });

    const containing = zones.filter((zone) => {
      const geometry = readStoredGeometry(zone.geojson);
      return geometry ? pointInZone(lat, lng, geometry) : false;
    });
    const toMatch = (z: DeliveryZone): ZoneLocateMatch => ({
      id: z.id,
      name: z.name,
      status: z.status,
    });
    const active = containing.filter((z) => z.status === ORDERABLE_ZONE_STATUS);
    const blocked = containing.filter(
      (z) => z.status !== ORDERABLE_ZONE_STATUS,
    );

    return {
      statusCode: 200,
      message: active.length
        ? 'Location is inside an active delivery zone'
        : 'Location is outside every active delivery zone',
      data: {
        lat,
        lng,
        covered: active.length > 0,
        zones: active.map(toMatch),
        blocked_zones: blocked.map(toMatch),
      },
    };
  }

  /** Plantilla de perímetro circular; no toca la base, el cliente la guarda con create/update. */
  radiusPolygon(dto: RadiusPolygonDto) {
    const geometry = circleZonePolygon(
      dto.lat,
      dto.lng,
      dto.radius_km,
      dto.segments ?? 64,
    );
    return {
      statusCode: 200,
      message: 'Radius polygon generated successfully',
      data: {
        center: { lat: dto.lat, lng: dto.lng },
        radius_km: dto.radius_km,
        vertex_count: vertexCount(geometry),
        geojson: geometry,
      },
    };
  }

  /**
   * % de pedidos de reparto del comercio que están ligados a una zona CON perímetro. Es el
   * KPI de "cobertura geocercada": un pedido sin zona, o cuya zona no tiene polígono, no se
   * ha podido comprobar contra ningún perímetro.
   */
  async coverage(merchantId: number): Promise<{
    statusCode: number;
    message: string;
    data: ZoneCoverageResult;
  }> {
    this.assertMerchant(merchantId);
    const rows: Array<{ delivery_orders: number; matched_orders: number }> =
      await this.deliveryZoneRepository.query(
        `SELECT COUNT(o.id)::int AS delivery_orders,
                COUNT(z.id)::int AS matched_orders
           FROM orders o
      LEFT JOIN delivery_zones z
             ON z.id = o.delivery_zone_id
            AND z.merchant_id = o.merchant_id
            AND z.geojson IS NOT NULL
            AND z.status <> 'deleted'
          WHERE o.merchant_id = $1
            AND o.type = 'delivery'
            AND o.logical_status = 'active'`,
        [merchantId],
      );
    const zoneRows: Array<{
      active_zones: number;
      zones_without_geojson: number;
    }> = await this.deliveryZoneRepository.query(
      `SELECT COUNT(*) FILTER (WHERE status = $2)::int AS active_zones,
                COUNT(*) FILTER (WHERE geojson IS NULL)::int AS zones_without_geojson
           FROM delivery_zones
          WHERE merchant_id = $1
            AND status = ANY($3)`,
      [merchantId, ORDERABLE_ZONE_STATUS, [...DELIVERY_ZONE_STATUSES]],
    );
    const deliveryOrders = Number(rows[0]?.delivery_orders ?? 0);
    const matchedOrders = Number(rows[0]?.matched_orders ?? 0);
    return {
      statusCode: 200,
      message: 'Delivery coverage retrieved successfully',
      data: {
        delivery_orders: deliveryOrders,
        matched_orders: matchedOrders,
        coverage_pct:
          deliveryOrders > 0
            ? Math.round((matchedOrders / deliveryOrders) * 1000) / 10
            : null,
        active_zones: Number(zoneRows[0]?.active_zones ?? 0),
        zones_without_geojson: Number(zoneRows[0]?.zones_without_geojson ?? 0),
      },
    };
  }
}
