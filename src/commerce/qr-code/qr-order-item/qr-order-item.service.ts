//src/qr-code/qr-order-item/qr-order-item.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QROrderItem } from './entity/qr-order-item.entity';
import { Product } from 'src/inventory/products-inventory/products/entities/product.entity';
import { Variant } from 'src/inventory/products-inventory/variants/entities/variant.entity';
import { QRMenuItem } from '../qr-menu-item/entity/qr-menu-item.entity';
import { QROrder } from '../qr-order/entity/qr-order.entity';
import { OneQROrderItemResponseDto } from './dto/qr-order-item-response.dto';
import { CreateQROrderItemDto } from './dto/create-qr-order-item.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { Repository, In } from 'typeorm';
import { QueryQROrderItemDto } from './dto/query-qr-order-item.dto';
import { PaginatedQROrderItemResponseDto } from './dto/paginated-qr-order-item-response.dto';
import { UpdateQrOrderItemDto } from './dto/update-qr-order-item.dto';

@Injectable()
export class QROrderItemService {
  constructor(
    @InjectRepository(QROrderItem)
    private readonly qrOrderItemRepository: Repository<QROrderItem>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(QROrder)
    private readonly qrOrderRepository: Repository<QROrder>,

    @InjectRepository(Variant)
    private readonly variantRepository: Repository<Variant>,

    @InjectRepository(QRMenuItem)
    private readonly qrMenuItemRepository: Repository<QRMenuItem>,
  ) {}

  /** `where` fragment that keeps merchant users inside their merchant (none for portal users). */
  private ownedBy(scopedMerchantId?: number) {
    return scopedMerchantId != null
      ? { qrOrder: { merchant: { id: scopedMerchantId } } }
      : {};
  }

  /** For merchant users, every id the DTO references must belong to their merchant. */
  private async assertReferencesOwned(
    dto: {
      qrOrder?: number;
      qr_order_id?: number;
      product?: number;
      product_id?: number;
      variant?: number;
      variant_id?: number;
      qrMenuItem?: number;
      qr_menu_item_id?: number;
    },
    scopedMerchantId?: number,
  ): Promise<void> {
    if (scopedMerchantId == null) return;
    const orderId = dto.qrOrder ?? dto.qr_order_id;
    const productId = dto.product ?? dto.product_id;
    const variantId = dto.variant ?? dto.variant_id;
    const menuItemId = dto.qrMenuItem ?? dto.qr_menu_item_id;

    if (orderId != null) {
      const owned = await this.qrOrderRepository.exists({
        where: { id: orderId, merchant: { id: scopedMerchantId } },
      });
      if (!owned) ErrorHandler.differentMerchant();
    }
    if (productId != null) {
      const owned = await this.productRepository.exists({
        where: { id: productId, merchantId: scopedMerchantId },
      });
      if (!owned) ErrorHandler.differentMerchant();
    }
    if (variantId != null) {
      const owned = await this.variantRepository.exists({
        where: { id: variantId, product: { merchantId: scopedMerchantId } },
      });
      if (!owned) ErrorHandler.differentMerchant();
    }
    if (menuItemId != null) {
      const owned = await this.qrMenuItemRepository.exists({
        where: {
          id: menuItemId,
          qrMenuSection: { qrMenu: { merchant: { id: scopedMerchantId } } },
        },
      });
      if (!owned) ErrorHandler.differentMerchant();
    }
  }

  async create(
    dto: CreateQROrderItemDto,
    scopedMerchantId?: number,
  ): Promise<OneQROrderItemResponseDto> {
    await this.assertReferencesOwned(dto, scopedMerchantId);

    const orderId = dto.qrOrder ?? dto.qr_order_id;
    const menuItemId = dto.qrMenuItem ?? dto.qr_menu_item_id;

    if (orderId && !Number.isInteger(orderId)) {
      ErrorHandler.invalidId('QR Order ID must be a positive integer');
    }
    if (menuItemId && !Number.isInteger(menuItemId)) {
      ErrorHandler.invalidId('QR MENU ITEM ID must be positive integer');
    }
    if (dto.product && !Number.isInteger(dto.product)) {
      ErrorHandler.invalidId('Product ID must be a positive integer');
    }
    if (dto.variant && !Number.isInteger(dto.variant)) {
      ErrorHandler.invalidId('Variant ID must be a positive integer');
    }

    let qrOrder: QROrder | null = null;
    let qrMenuItem: QRMenuItem | null = null;
    let product: Product | null = null;
    let variant: Variant | null = null;

    if (orderId) {
      qrOrder = await this.qrOrderRepository.findOne({
        where: { id: orderId },
      });
      if (!qrOrder) ErrorHandler.qrOrderNotFound();
    }

    if (menuItemId) {
      qrMenuItem = await this.qrMenuItemRepository.findOne({
        where: { id: menuItemId },
        relations: ['product', 'variant'],
      });
    }

    const productId = dto.product ?? dto.product_id ?? qrMenuItem?.product?.id;
    const variantId = dto.variant ?? dto.variant_id ?? qrMenuItem?.variant?.id;

    if (productId) {
      product = await this.productRepository.findOne({
        where: { id: productId },
      });
    }
    if (variantId) {
      variant = await this.variantRepository.findOne({
        where: { id: variantId },
      });
    }

    const rawPrice =
      dto.price ??
      dto.unit_price ??
      qrMenuItem?.price ??
      product?.basePrice ??
      0.0;
    const itemPrice =
      typeof rawPrice === 'number'
        ? rawPrice
        : parseFloat(String(rawPrice || 0));
    const itemTotal = dto.quantity * itemPrice;

    const qrOrderItem = this.qrOrderItemRepository.create({
      qrOrder,
      qrMenuItem,
      product,
      variant,
      quantity: dto.quantity,
      price: itemPrice,
      total_price: itemTotal,
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
      merchant_id,
      qr_order_id,
      page = 1,
      limit = 100,
      sortBy = 'id',
      sortOrder = 'DESC',
    } = query;

    if (page < 1 || limit < 1) {
      ErrorHandler.invalidInput('Page and limit must be positive integers');
    }

    const qb = this.qrOrderItemRepository
      .createQueryBuilder('qrOrderItem')
      .leftJoin('qrOrderItem.qrOrder', 'qrOrder')
      .leftJoin('qrOrderItem.qrMenuItem', 'qrMenuItem')
      .leftJoin('qrOrderItem.product', 'product')
      .leftJoin('qrOrderItem.variant', 'variant')
      .select([
        'qrOrderItem',
        'qrOrder.id',
        'qrOrder.status',
        'qrOrder.notes',
        'qrOrder.total_amount',
        'qrMenuItem.id',
        'qrMenuItem.name',
        'qrMenuItem.price',
        'qrMenuItem.description',
        'qrMenuItem.image_url',
        'product.id',
        'product.name',
        'product.basePrice',
        'product.sku',
        'variant.id',
        'variant.name',
        'variant.price',
        'variant.sku',
      ]);

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
        statuses: ['active', 'inactive', 'served', 'cancelled'],
      });
    }

    if (qr_order_id) {
      qb.andWhere('qrOrder.id = :qrOrderId', { qrOrderId: qr_order_id });
    }

    if (merchant_id) {
      qb.leftJoin('qrOrder.merchant', 'merchant').andWhere(
        'merchant.id = :merchantId',
        { merchantId: merchant_id },
      );
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
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('QR Order Item ID must be a positive integer');
    }
    const qrOrderItem = await this.qrOrderItemRepository.findOne({
      where: {
        ...this.ownedBy(scopedMerchantId),
        id,
        status: In(['active', 'inactive']),
      },
      relations: ['qrOrder', 'product', 'variant', 'qrMenuItem'],
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
    dto: UpdateQrOrderItemDto,
    scopedMerchantId?: number,
  ): Promise<OneQROrderItemResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('QR Order Item ID must be a positive integer');
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

    const updatedQrOrderItem =
      await this.qrOrderItemRepository.save(qrOrderItem);
    return {
      statusCode: 200,
      message: 'QR Order Item updated successfully',
      data: updatedQrOrderItem,
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
    await this.qrOrderItemRepository.save(qrOrderItem);
    return {
      statusCode: 200,
      message: 'QR Order Item removed successfully',
      data: qrOrderItem,
    };
  }
}
