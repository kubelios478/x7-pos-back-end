import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePurchaseOrderItemDto } from './dto/create-purchase-order-item.dto';
import { UpdatePurchaseOrderItemDto } from './dto/update-purchase-order-item.dto';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { PurchaseOrder } from '../purchase-order/entities/purchase-order.entity';
import { Product } from '../products/entities/product.entity';
import { Variant } from '../variants/entities/variant.entity';
import { GetPurchaseOrdersItemsQueryDto } from './dto/get-purchase-order-item-query.dto';
import { AllPaginatedPurchaseOrdersItems } from './dto/all-paginated-purchase-order-item.dto';
import {
  OnePurchaseOrderItemResponse,
  PurchaseOrderItemResponseDto,
} from './dto/purchase-order-item-response.dto';

@Injectable()
export class PurchaseOrderItemService {
  constructor(
    @InjectRepository(PurchaseOrderItem)
    private readonly purchaseOrderItemRepository: Repository<PurchaseOrderItem>,
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Variant)
    private readonly variantRepository: Repository<Variant>,
  ) {}

  async create(
    createPurchaseOrderItemDto: CreatePurchaseOrderItemDto,
  ): Promise<PurchaseOrderItem> {
    const { purchaseOrderId, productId, variantId, quantity, unitPrice } =
      createPurchaseOrderItemDto;

    const purchaseOrder = await this.purchaseOrderRepository.findOneBy({
      id: purchaseOrderId,
      isActive: true,
    });
    if (!purchaseOrder) {
      ErrorHandler.notFound(ErrorMessage.PURCHASE_ORDER_NOT_FOUND);
    }

    const product = await this.productRepository.findOneBy({
      id: productId,
      isActive: true,
    });
    if (!product) {
      ErrorHandler.notFound(ErrorMessage.PRODUCT_NOT_FOUND);
    }

    let variant: Variant | null = null;
    if (variantId) {
      variant = await this.variantRepository.findOneBy({
        id: variantId,
        isActive: true,
      });
      if (!variant) {
        ErrorHandler.notFound(ErrorMessage.VARIANT_NOT_FOUND);
      }
    }

    const totalPrice = quantity * unitPrice;

    try {
      const newPurchaseOrderItem = this.purchaseOrderItemRepository.create({
        purchaseOrderId,
        productId,
        variantId,
        quantity,
        unitPrice,
        totalPrice,
      });

      return await this.purchaseOrderItemRepository.save(newPurchaseOrderItem);
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
      console.log(error);
    }
  }

  async findAll(
    query: GetPurchaseOrdersItemsQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedPurchaseOrdersItems> {
    // 1. Configure pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // 4. Build query with filters
    const queryBuilder = this.purchaseOrderItemRepository
      .createQueryBuilder('purchaseOrderItem')
      .leftJoinAndSelect('purchaseOrderItem.purchaseOrder', 'purchaseOrder')
      .leftJoinAndSelect('purchaseOrderItem.product', 'product')
      .leftJoinAndSelect('purchaseOrderItem.variant', 'variant')
      .leftJoinAndSelect('purchaseOrder.merchant', 'merchant')
      .where('purchaseOrder.merchantId = :merchantId', { merchantId })
      .andWhere('purchaseOrderItem.isActive = :isActive', { isActive: true });

    // 5. Apply optional filters
    if (query.product) {
      queryBuilder.andWhere('LOWER(product.name) LIKE LOWER(:productName)', {
        productName: `%${query.product}%`,
      });
    }

    // 6. Get total records
    const total = await queryBuilder.getCount();

    // 7. Apply pagination and sorting
    const purchaseOrderItems = await queryBuilder
      .orderBy('purchaseOrderItem.product', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    // 8. Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const data: PurchaseOrderItemResponseDto[] = await Promise.all(
      purchaseOrderItems.map((purchaseOrderItem) => {
        const result: PurchaseOrderItemResponseDto = {
          id: purchaseOrderItem.id,
          quantity: purchaseOrderItem.quantity,
          unitPrice: purchaseOrderItem.unitPrice,
          totalPrice: purchaseOrderItem.totalPrice,
          product: purchaseOrderItem.product
            ? {
                id: purchaseOrderItem.product.id,
                name: purchaseOrderItem.product.name,
              }
            : null,
          variant: purchaseOrderItem.variant
            ? {
                id: purchaseOrderItem.variant.id,
                name: purchaseOrderItem.variant.name,
              }
            : null,
          purchaseOrder: purchaseOrderItem.purchaseOrder
            ? {
                id: purchaseOrderItem.purchaseOrder.id,
                orderDate: purchaseOrderItem.purchaseOrder.orderDate,
                status: purchaseOrderItem.purchaseOrder.status,
              }
            : null,
        };
        return result;
      }),
    );

    return {
      statusCode: 200,
      message: 'Purchase Orders retrieved successfully',
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
    merchantId?: number,
    createdUpdateDelete?: string,
  ): Promise<OnePurchaseOrderItemResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Purchase Order Item ID incorrect');
    }
    const whereCondition: {
      id: number;
      merchantId?: number;
      isActive: boolean;
    } = {
      id,
      isActive: createdUpdateDelete === 'Deleted' ? false : true,
    };
    if (merchantId !== undefined) {
      whereCondition.merchantId = merchantId;
    }

    const purchaseOrderItem = await this.purchaseOrderItemRepository.findOne({
      where: whereCondition,
      relations: [
        'product',
        'variant',
        'purchaseOrder',
        'purchaseOrder.merchant',
        'purchaseOrder.supplier',
      ],
    });

    if (!purchaseOrderItem)
      ErrorHandler.notFound(ErrorMessage.PURCHASE_ORDER_ITEM_NOT_FOUND);

    const result: PurchaseOrderItemResponseDto = {
      id: purchaseOrderItem.id,
      quantity: purchaseOrderItem.quantity,
      unitPrice: purchaseOrderItem.unitPrice,
      totalPrice: purchaseOrderItem.totalPrice,
      product: purchaseOrderItem.product
        ? {
            id: purchaseOrderItem.product.id,
            name: purchaseOrderItem.product.name,
          }
        : null,
      variant: purchaseOrderItem.variant
        ? {
            id: purchaseOrderItem.variant.id,
            name: purchaseOrderItem.variant.name,
          }
        : null,
      purchaseOrder: purchaseOrderItem.purchaseOrder
        ? {
            id: purchaseOrderItem.purchaseOrder.id,
            orderDate: purchaseOrderItem.purchaseOrder.orderDate,
            status: purchaseOrderItem.purchaseOrder.status,
          }
        : null,
    };

    let response: OnePurchaseOrderItemResponse;

    switch (createdUpdateDelete) {
      case 'Created':
        response = {
          statusCode: 201,
          message: `Purchase Order Item ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      case 'Updated':
        response = {
          statusCode: 201,
          message: `Purchase Order Item ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 201,
          message: `Purchase Order Item ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      default:
        response = {
          statusCode: 200,
          message: 'Purchase Order Item retrieved successfully',
          data: result,
        };
        break;
    }
    return response;
  }

  async update(
    id: number,
    updatePurchaseOrderItemDto: UpdatePurchaseOrderItemDto,
  ): Promise<PurchaseOrderItem> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Purchase Order Item ID incorrect');
    }

    const purchaseOrderItem = await this.purchaseOrderItemRepository.findOneBy({
      id,
      isActive: true,
    });
    if (!purchaseOrderItem) {
      ErrorHandler.notFound(ErrorMessage.PURCHASE_ORDER_ITEM_NOT_FOUND);
    }

    // Check if quantity or unitPrice are being updated
    const newQuantity =
      updatePurchaseOrderItemDto.quantity !== undefined
        ? updatePurchaseOrderItemDto.quantity
        : purchaseOrderItem.quantity;
    const newUnitPrice =
      updatePurchaseOrderItemDto.unitPrice !== undefined
        ? updatePurchaseOrderItemDto.unitPrice
        : purchaseOrderItem.unitPrice;

    // Recalculate totalPrice if quantity or unitPrice changed
    let newTotalPrice = purchaseOrderItem.totalPrice;
    if (
      newQuantity !== purchaseOrderItem.quantity ||
      newUnitPrice !== purchaseOrderItem.unitPrice
    ) {
      newTotalPrice = newQuantity * newUnitPrice;
    }

    // If totalPrice is provided in DTO, validate it against the calculated value
    if (
      updatePurchaseOrderItemDto.totalPrice !== undefined &&
      Math.abs(updatePurchaseOrderItemDto.totalPrice - newTotalPrice) > 0.001
    ) {
      throw new BadRequestException(
        `Total price (${updatePurchaseOrderItemDto.totalPrice}) does not match the calculated price (${newTotalPrice.toFixed(2)} = quantity * unit price).`,
      );
    }

    Object.assign(purchaseOrderItem, {
      ...updatePurchaseOrderItemDto,
      totalPrice: newTotalPrice, // Always use the calculated or validated totalPrice
    });

    try {
      return await this.purchaseOrderItemRepository.save(purchaseOrderItem);
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
      console.log(error);
    }
  }

  async remove(id: number): Promise<void> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Purchase Order Item ID incorrect');
    }

    const purchaseOrderItem = await this.purchaseOrderItemRepository.findOneBy({
      id,
      isActive: true,
    });
    if (!purchaseOrderItem) {
      ErrorHandler.notFound(ErrorMessage.PURCHASE_ORDER_ITEM_NOT_FOUND);
    }

    purchaseOrderItem.isActive = false;
    try {
      await this.purchaseOrderItemRepository.save(purchaseOrderItem);
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
      console.log(error);
    }
  }
}
