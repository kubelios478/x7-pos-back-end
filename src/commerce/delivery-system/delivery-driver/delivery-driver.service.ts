//src/commerce/delivery-system/delivery-driver/delivery-driver.service.ts
//
// Un repartidor pertenece al comercio del JWT (antes se tomaba del cuerpo y `findAll`
// listaba los de todos). `on_delivery` sólo lo pone/quita el flujo de asignaciones; aquí
// los cambios de estado usan UPDATE condicionales para no pisar una asignación simultánea.
import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { DeliveryDriver } from './entity/delivery-driver.entity';
import { CreateDeliveryDriverDto } from './dto/create-delivery-driver.dto';
import { OneDeliveryDriverResponseDto } from './dto/delivery-driver-response.dto';
import { QueryDeliveryDriverDto } from './dto/query-delivery-driver.dto';
import { PaginatedDeliveryDriverResponseDto } from './dto/paginated-delivery-driver-response.dto';
import { UpdateDeliveryDriverDto } from './dto/update-delivery-driver.dto';
import { DeliveryRealtimeService } from '../realtime/delivery-realtime.service';
import {
  DriverStatus,
  LIVE_DRIVER_STATUSES,
} from './constants/delivery-driver.constants';
import {
  normalizePhone,
  vehicleAliasKeys,
} from './utils/delivery-driver-normalize.util';

export interface DeliveryDriverSummaryResult {
  total: number;
  available: number;
  en_route: number;
  unavailable: number;
}

@Injectable()
export class DeliveryDriverService {
  constructor(
    @InjectRepository(DeliveryDriver)
    private readonly deliveryDriverRepository: Repository<DeliveryDriver>,

    private readonly realtime: DeliveryRealtimeService,
  ) {}

  /** La pantalla de flota y el tablero de despacho se refrescan solos al cambiar un estado. */
  private announce(merchantId: number, driver: DeliveryDriver): void {
    this.realtime.driverStatusChanged({
      merchantId,
      driverId: driver.id,
      status: driver.status,
    });
  }

  private assertMerchant(merchantId: number): void {
    if (!Number.isInteger(merchantId) || merchantId <= 0) {
      ErrorHandler.forbidden('You must be associated with a merchant');
    }
  }

  private async findScoped(
    id: number,
    merchantId: number,
  ): Promise<DeliveryDriver> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('ID must be a positive integer');
    }
    const driver = await this.deliveryDriverRepository.findOne({
      where: {
        id,
        merchant: { id: merchantId },
        status: In([...LIVE_DRIVER_STATUSES]),
      },
    });
    if (!driver) {
      ErrorHandler.deliveryDriverNotFound();
    }
    return driver;
  }

  /** Un mismo teléfono no puede estar en dos repartidores vivos del comercio. */
  private async assertUniquePhone(
    merchantId: number,
    phone: string,
    excludeId?: number,
  ): Promise<void> {
    const clash = await this.deliveryDriverRepository.findOne({
      where: {
        merchant: { id: merchantId },
        phone,
        status: Not(DriverStatus.DELETED),
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
      loadEagerRelations: false,
    });
    if (clash) {
      throw new ConflictException(
        `Another delivery driver of this merchant already uses phone ${phone} (#${clash.id})`,
      );
    }
  }

  // El índice único parcial opcional (scripts/delivery-assignment-driver-lifecycle.sql) es
  // el respaldo ante dos altas simultáneas con el mismo teléfono.
  private async guardPhone<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') {
        throw new ConflictException(
          'Another delivery driver of this merchant already uses this phone',
        );
      }
      throw error;
    }
  }

  async create(
    dto: CreateDeliveryDriverDto,
    merchantId: number,
  ): Promise<OneDeliveryDriverResponseDto> {
    this.assertMerchant(merchantId);
    const phone = normalizePhone(dto.phone) as string;
    await this.assertUniquePhone(merchantId, phone);

    const deliveryDriver = this.deliveryDriverRepository.create({
      merchant: { id: merchantId } as Merchant,
      name: dto.name,
      phone,
      vehicleType: dto.vehicleType,
      status: dto.status ?? DriverStatus.ACTIVE,
    });
    const saved = await this.guardPhone(() =>
      this.deliveryDriverRepository.save(deliveryDriver),
    );
    this.announce(merchantId, saved);

    return {
      statusCode: 201,
      message: 'Delivery Driver created successfully',
      data: saved,
    };
  }

  async findAll(
    query: QueryDeliveryDriverDto,
    merchantId: number,
  ): Promise<PaginatedDeliveryDriverResponseDto> {
    this.assertMerchant(merchantId);
    const {
      status,
      vehicleType,
      search,
      page = 1,
      limit = 10,
      sortBy = 'id',
      sortOrder = 'DESC',
    } = query;

    if (page < 1 || limit < 1) {
      ErrorHandler.invalidInput('Page and limit must be positive integers');
    }

    const qb = this.deliveryDriverRepository
      .createQueryBuilder('deliveryDriver')
      .innerJoin('deliveryDriver.merchant', 'merchant')
      .select(['deliveryDriver', 'merchant.id', 'merchant.name'])
      .where('merchant.id = :merchantId', { merchantId });

    qb.andWhere('deliveryDriver.status IN (:...statuses)', {
      statuses: status?.length ? status : [...LIVE_DRIVER_STATUSES],
    });
    if (vehicleType?.length) {
      // Compara sobre la forma normalizada para incluir filas antiguas ('Car', 'E-Scooter'…).
      qb.andWhere(
        `LOWER(REGEXP_REPLACE(deliveryDriver.vehicleType, '[[:space:]_-]', '', 'g')) IN (:...vehicleKeys)`,
        { vehicleKeys: vehicleAliasKeys(vehicleType) },
      );
    }
    const term = search?.trim();
    if (term) {
      const escaped = term.replace(/[\\%_]/g, (c) => `\\${c}`);
      // El teléfono se guarda normalizado: se busca también con el término normalizado
      // para que "809-555" encuentre "+18095551234".
      const phoneTerm = String(normalizePhone(term)).replace(
        /[\\%_]/g,
        (c) => `\\${c}`,
      );
      qb.andWhere(
        '(deliveryDriver.name ILIKE :term OR deliveryDriver.phone ILIKE :term OR deliveryDriver.phone ILIKE :phoneTerm)',
        { term: `%${escaped}%`, phoneTerm: `%${phoneTerm}%` },
      );
    }

    qb.orderBy(`deliveryDriver.${sortBy}`, sortOrder);
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      statusCode: 200,
      message: 'Delivery Drivers retrieved successfully',
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
  ): Promise<OneDeliveryDriverResponseDto> {
    this.assertMerchant(merchantId);
    const deliveryDriver = await this.findScoped(id, merchantId);
    return {
      statusCode: 200,
      message: 'Delivery Driver retrieved successfully',
      data: deliveryDriver,
    };
  }

  async update(
    id: number,
    dto: UpdateDeliveryDriverDto,
    merchantId: number,
  ): Promise<OneDeliveryDriverResponseDto> {
    this.assertMerchant(merchantId);
    const driver = await this.findScoped(id, merchantId);

    const changes: Partial<DeliveryDriver> = {};
    if (dto.name !== undefined) changes.name = dto.name;
    if (dto.vehicleType !== undefined) changes.vehicleType = dto.vehicleType;
    if (dto.phone !== undefined) {
      changes.phone = normalizePhone(dto.phone) as string;
      await this.assertUniquePhone(merchantId, changes.phone, driver.id);
    }
    if (dto.status !== undefined) changes.status = dto.status;

    if (Object.keys(changes).length) {
      // UPDATE parcial (no `save` de la entidad entera): un `save` reescribiría el `status`
      // leído aquí aunque una asignación lo acabase de pasar a on_delivery.
      const qb = this.deliveryDriverRepository
        .createQueryBuilder()
        .update(DeliveryDriver)
        .set(changes)
        .where('id = :id', { id: driver.id });
      if (changes.status !== undefined) {
        qb.andWhere('status <> :onDelivery', {
          onDelivery: DriverStatus.ON_DELIVERY,
        });
      }
      const result = await this.guardPhone(() => qb.execute());
      if (!result.affected) {
        throw new ConflictException(
          `Delivery driver #${driver.id} is on a delivery; its status is managed by the assignment until it finishes`,
        );
      }
    }

    const updated = await this.findScoped(driver.id, merchantId);
    if (changes.status !== undefined) this.announce(merchantId, updated);
    return {
      statusCode: 200,
      message: 'Delivery Driver updated successfully',
      data: updated,
    };
  }

  /**
   * Interruptor de turno: active ↔ off_duty. Se rechaza (409) si está on_delivery (la
   * asignación en curso manda) o inactive (dado de baja: hay que reactivarlo con PATCH).
   */
  async setShift(
    id: number,
    onShift: boolean,
    merchantId: number,
  ): Promise<OneDeliveryDriverResponseDto> {
    this.assertMerchant(merchantId);
    const driver = await this.findScoped(id, merchantId);
    const next = onShift ? DriverStatus.ACTIVE : DriverStatus.OFF_DUTY;

    const result = await this.deliveryDriverRepository
      .createQueryBuilder()
      .update(DeliveryDriver)
      .set({ status: next })
      .where('id = :id', { id: driver.id })
      .andWhere('status IN (:...togglable)', {
        togglable: [DriverStatus.ACTIVE, DriverStatus.OFF_DUTY],
      })
      .execute();

    if (!result.affected) {
      const current = (await this.findScoped(driver.id, merchantId)).status;
      throw new ConflictException(
        current === DriverStatus.ON_DELIVERY
          ? `Delivery driver #${driver.id} is on a delivery; the shift can be changed once it finishes`
          : `Delivery driver #${driver.id} is '${current}'; reactivate it before toggling the shift`,
      );
    }

    const updated = await this.findScoped(driver.id, merchantId);
    this.announce(merchantId, updated);
    return {
      statusCode: 200,
      message: onShift
        ? 'Delivery Driver is now on shift'
        : 'Delivery Driver is now off duty',
      data: updated,
    };
  }

  async remove(
    id: number,
    merchantId: number,
  ): Promise<OneDeliveryDriverResponseDto> {
    this.assertMerchant(merchantId);
    const driver = await this.findScoped(id, merchantId);

    const result = await this.deliveryDriverRepository
      .createQueryBuilder()
      .update(DeliveryDriver)
      .set({ status: DriverStatus.DELETED })
      .where('id = :id', { id: driver.id })
      .andWhere('status <> :onDelivery', {
        onDelivery: DriverStatus.ON_DELIVERY,
      })
      .execute();
    if (!result.affected) {
      throw new ConflictException(
        `Delivery driver #${driver.id} is on a delivery and cannot be deleted`,
      );
    }

    driver.status = DriverStatus.DELETED;
    this.announce(merchantId, driver);
    return {
      statusCode: 200,
      message: 'Delivery Driver deleted successfully',
      data: driver,
    };
  }

  /** KPI de la flota (no cuenta los borrados). */
  async summary(merchantId: number): Promise<{
    statusCode: number;
    message: string;
    data: DeliveryDriverSummaryResult;
  }> {
    this.assertMerchant(merchantId);
    const rows: Array<{ status: string; count: number | string }> =
      await this.deliveryDriverRepository.query(
        `SELECT status, COUNT(*)::int AS count
           FROM delivery_drivers
          WHERE merchant_id = $1
            AND status <> $2
       GROUP BY status`,
        [merchantId, DriverStatus.DELETED],
      );

    const by = (s: DriverStatus) =>
      Number(rows.find((r) => r.status === s)?.count ?? 0);
    return {
      statusCode: 200,
      message: 'Delivery driver summary retrieved successfully',
      data: {
        total: rows.reduce((sum, r) => sum + Number(r.count), 0),
        available: by(DriverStatus.ACTIVE),
        en_route: by(DriverStatus.ON_DELIVERY),
        unavailable: by(DriverStatus.OFF_DUTY) + by(DriverStatus.INACTIVE),
      },
    };
  }
}
