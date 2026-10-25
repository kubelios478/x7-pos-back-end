//src/qr-code/qr-order-item/qr-order-item.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QROrderItem } from './entity/qr-order-item.entity';
import { Repository, In } from 'typeorm';
import { QROrder } from '../qr-order/entity/qr-order.entity';
import { Product } from 'src/inventory/products-inventory/products/entities/product.entity';
import { Variant } from 'src/inventory/products-inventory/variants/entities/variant.entity';
import { CreateQROrderItemDto } from './dto/create-qr-order-item.dto';
import { OneQROrderItemResponseDto } from './dto/qr-order-item-response.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { QueryQROrderItemDto } from './dto/query-qr-order-item.dto';
import { PaginatedQROrderItemResponseDto } from './dto/paginated-qr-order-item-response.dto';

@Injectable()
export class QROrderItemService {
  constructor(
    @InjectRepository(QROrderItem)
    private readonly qrOrderItemRepository: Repository<QROrderItem>,

    @InjectRepository(QROrder)
    private readonly qrOrderRepository: Repository<QROrder>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(Variant)
    private readonly variantRepository: Repository<Variant>,
  ) {}

  /** `where` fragment that keeps merchant users inside their merchant (none for portal users). */
  private ownedBy(scopedMerchantId?: number) {
    return scopedMerchantId != null
      ? { qrOrder: { merchant: { id: scopedMerchantId } } }
      : {};
  }

  /** For merchant users, every id the DTO references must belong to their merchant. */
  private async assertReferencesOwned(
    dto: { qrOrder?: number; product?: number; variant?: number },
    scopedMerchantId?: number,
  ): Promise<void> {
    if (scopedMerchantId == null) return;
    if (dto.qrOrder != null) {
      const owned = await this.qrOrderRepository.exists({
        where: { id: dto.qrOrder, merchant: { id: scopedMerchantId } },
      });
      if (!owned) ErrorHandler.differentMerchant();
    }
    if (dto.product != null) {
      const owned = await this.productRepository.exists({
        where: { id: dto.product, merchantId: scopedMerchantId },
      });
      if (!owned) ErrorHandler.differentMerchant();
    }
    if (dto.variant != null) {
      const owned = await this.variantRepository.exists({
        where: { id: dto.variant, product: { merchantId: scopedMerchantId } },
      });
      if (!owned) ErrorHandler.differentMerchant();
    }
  }

  async create(
    dto: CreateQROrderItemDto,
    scopedMerchantId?: number,
  ): Promise<OneQROrderItemResponseDto> {
    await this.assertReferencesOwned(dto, scopedMerchantId);
    if (dto.qrOrder && !Number.isInteger(dto.qrOrder)) {
      ErrorHandler.invalidId('QR Order ID must be a positive integer');
    }
    if (dto.product && !Number.isInteger(dto.product)) {
      ErrorHandler.invalidId('Product ID must be a positive integer');
    }
    if (dto.variant && !Number.isInteger(dto.variant)) {
      ErrorHandler.invalidId('Variant ID must be a positive integer');
    }

    let qrOrder: QROrder | null = null;
    let product: Product | null = null;
    let variant: Variant | null = null;

    if (dto.qrOrder) {
      qrOrder = await this.qrOrderRepository.findOne({
        where: { id: dto.qrOrder },
      });
      if (!qrOrder) {
        ErrorHandler.qrOrderNotFound();
      }
    }
    if (dto.product) {
      product = await this.productRepository.findOne({
        where: { id: dto.product },
      });
      if (!product) {
        ErrorHandler.productNotFound();
      }
    }
    if (dto.variant) {
      variant = await this.variantRepository.findOne({
        where: { id: dto.variant },
      });
      if (!variant) {
        ErrorHandler.variantNotFound();
      }
    }

    const totalPrice = dto.quantity * dto.price;

    const qrOrderItem = this.qrOrderItemRepository.create({
      qrOrder: qrOrder,
      product: product,
      variant: variant,
      quantity: dto.quantity,
      price: dto.price,
      total_price: totalPrice,
      notes: dto.notes ?? null,
      status: dto.status,
    } as Partial<QROrderItem>);

    const savedQROrderItem = await this.qrOrderItemRepository.save(qrOrderItem);
    return {
      statusCode: 201,
      message: 'QR Order Item created successfully',
      data: savedQROrderItem,
    };
  }
  async findAll(
    query: QueryQROrderItemDto,
    scopedMerchantId?: number,
  ): Promise<PaginatedQROrderItemResponseDto> {
    const {
      status,
      page = 1,
      limit = 10,
      sortBy = 'id',
      sortOrder = 'DESC',
    } = query;

    if (page < 1 || limit < 1) {
      ErrorHandler.invalidInput('Page and limit must be positive integers');
    }

    const qb = this.qrOrderItemRepository
      .createQueryBuilder('qrOrderItem')
      .leftJoin('qrOrderItem.qrOrder', 'qrOrder')
      .leftJoin('qrOrderItem.product', 'product')
      .leftJoin('qrOrderItem.variant', 'variant')
      .select(['qrOrderItem', 'qrOrder.id', 'product.id', 'variant.id']);

    if (scopedMerchantId != null) {
      qb.innerJoin('qrOrder.merchant', 'scopeMerchant').andWhere(
        'scopeMerchant.id = :scopedMerchantId',
        { scopedMerchantId },
      );
    }

    if (status) {
      qb.andWhere('qrOrderItem.status = :status', { status });
    } else {
      qb.andWhere('qrOrderItem.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.andWhere('qrOrderItem.status != :deleted', {
      deleted: 'deleted',
    });

    qb.orderBy(`qrOrderItem.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      statusCode: 200,
      message: 'QR Order Items retrieved successfully',
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
    scopedMerchantId?: number,
  ): Promise<OneQROrderItemResponseDto> {
    if (!Number.isInteger(id) || id < 1) {
      ErrorHandler.invalidInput('ID must be a positive integer');
    }

    const qrOrderItem = await this.qrOrderItemRepository.findOne({
      where: {
        ...this.ownedBy(scopedMerchantId),
        id,
        status: In(['active', 'inactive']),
      },
      relations: ['qrOrder', 'product', 'variant'],
    });
    if (!qrOrderItem) {
      ErrorHandler.qrOrderItemNotFound();
    }
    return {
      statusCode: 200,
      message: 'QR Order Item retrieved successfully',
      data: qrOrderItem,
    };
  }

  async update(
    id: number,
    dto: CreateQROrderItemDto,
    scopedMerchantId?: number,
  ): Promise<OneQROrderItemResponseDto> {
    if (!Number.isInteger(id) || id < 1) {
      ErrorHandler.invalidInput('ID must be a positive integer');
    }

    const qrOrderItem = await this.qrOrderItemRepository.findOne({
      where: { ...this.ownedBy(scopedMerchantId), id },
      relations: ['qrOrder', 'product', 'variant'],
    });
    if (!qrOrderItem) {
      ErrorHandler.qrOrderItemNotFound();
    }
    await this.assertReferencesOwned(dto, scopedMerchantId);

    Object.assign(qrOrderItem, dto);

    qrOrderItem.total_price = qrOrderItem.quantity * qrOrderItem.price;

    const updatedQROrderItem =
      await this.qrOrderItemRepository.save(qrOrderItem);
    return {
      statusCode: 200,
      message: 'QR Order Item updated successfully',
      data: updatedQROrderItem,
    };
  }

  async remove(
    id: number,
    scopedMerchantId?: number,
  ): Promise<OneQROrderItemResponseDto> {
    if (!Number.isInteger(id) || id < 1) {
      ErrorHandler.invalidInput('ID must be a positive integer');
    }

    const qrOrderItem = await this.qrOrderItemRepository.findOne({
      where: { ...this.ownedBy(scopedMerchantId), id },
      relations: ['qrOrder', 'product', 'variant'],
    });
    if (!qrOrderItem) {
      ErrorHandler.qrOrderItemNotFound();
    }

    qrOrderItem.status = 'deleted';
    const deletedQROrderItem =
      await this.qrOrderItemRepository.save(qrOrderItem);
    return {
      statusCode: 200,
      message: 'QR Order Item deleted successfully',
      data: deletedQROrderItem,
    };
  }
}
