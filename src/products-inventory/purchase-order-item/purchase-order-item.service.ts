import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePurchaseOrderItemDto } from './dto/create-purchase-order-item.dto';
import { UpdatePurchaseOrderItemDto } from './dto/update-purchase-order-item.dto';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { PurchaseOrder } from '../purchase-order/entities/purchase-order.entity';
import { GetPurchaseOrdersItemsQueryDto } from './dto/get-purchase-order-item-query.dto';
import { AllPaginatedPurchaseOrdersItems } from './dto/all-paginated-purchase-order-item.dto';
import {
  OnePurchaseOrderItemResponse,
  PurchaseOrderItemResponseDto,
} from './dto/purchase-order-item-response.dto';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { ProductsService } from '../products/products.service';
import { VariantsService } from '../variants/variants.service';
import { Product } from '../products/entities/product.entity';
import { Variant } from '../variants/entities/variant.entity';

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
    private readonly productsService: ProductsService,
    private readonly variantsService: VariantsService,
  ) {}

  async create(
    user: AuthenticatedUser,
    createPurchaseOrderDto: CreatePurchaseOrderItemDto,
  ): Promise<OnePurchaseOrderItemResponse> {
    const { productId, variantId, purchaseOrderId, ...purchaseOrderItemData } =
      createPurchaseOrderDto;

    const [product, variant, purchaseOrder] = await Promise.all([
      this.productRepository.findOneBy({
        id: productId,
        merchantId: user.merchant.id,
        isActive: true,
      }),
      this.variantRepository.findOneBy({
        id: variantId,
        productId,
        product: { merchantId: user.merchant.id },
        isActive: true,
      }),
      this.purchaseOrderRepository.findOneBy({
        id: purchaseOrderId,
        merchantId: user.merchant.id,
        isActive: true,
      }),
    ]);

    if (!product) ErrorHandler.notFound(ErrorMessage.PRODUCT_NOT_FOUND);

    if (!variant) ErrorHandler.notFound(ErrorMessage.VARIANT_NOT_FOUND);

    if (!purchaseOrder) {
      ErrorHandler.notFound(ErrorMessage.PURCHASE_ORDER_NOT_FOUND);
    }

    if (product.merchantId !== user.merchant.id) {
      ErrorHandler.differentMerchant();
    }

    try {
      const newPurchaseOrderItem = this.purchaseOrderItemRepository.create({
        purchaseOrderId,
        productId,
        variantId,
        totalPrice:
          purchaseOrderItemData.unitPrice * purchaseOrderItemData.quantity,
        ...purchaseOrderItemData,
      });

      const savedPurchaseOrderItem =
        await this.purchaseOrderItemRepository.save(newPurchaseOrderItem);

      return this.findOne(savedPurchaseOrderItem.id, undefined, 'Created');
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
      message: 'Purchase Orders Items retrieved successfully',
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
      isActive: boolean;
      purchaseOrder?: { merchantId: number }; // Filter through purchaseOrder relation
    } = {
      id,
      isActive: createdUpdateDelete === 'Deleted' ? false : true,
    };

    if (merchantId !== undefined) {
      whereCondition.purchaseOrder = { merchantId };
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
    user: AuthenticatedUser,
    id: number,
    updatePurchaseOrderItemDto: UpdatePurchaseOrderItemDto,
  ): Promise<OnePurchaseOrderItemResponse> {
    const { ...updateData } = updatePurchaseOrderItemDto;

    const purchaseOrderItem = await this.purchaseOrderItemRepository.findOneBy({
      id,
      isActive: true,
    });

    if (!purchaseOrderItem)
      ErrorHandler.notFound(ErrorMessage.PURCHASE_ORDER_ITEM_NOT_FOUND);

    const [product, variant, purchaseOrder] = await Promise.all([
      this.productRepository.findOneBy({
        id: updateData.productId,
        merchantId: user.merchant.id,
        isActive: true,
      }),
      this.variantRepository.findOneBy({
        id: updateData.variantId,
        productId: updateData.productId,
        product: { merchantId: user.merchant.id },
        isActive: true,
      }),
      this.purchaseOrderRepository.findOneBy({
        id: updateData.purchaseOrderId,
        merchantId: user.merchant.id,
        isActive: true,
      }),
    ]);

    if (!purchaseOrder) {
      ErrorHandler.notFound(ErrorMessage.PURCHASE_ORDER_NOT_FOUND);
    }
    if (!product) {
      ErrorHandler.notFound(ErrorMessage.PRODUCT_NOT_FOUND);
    }
    if (!variant) {
      ErrorHandler.notFound(ErrorMessage.VARIANT_NOT_FOUND);
    }

    if (product.merchantId !== user.merchant.id) {
      ErrorHandler.differentMerchant();
    }

    Object.assign(purchaseOrderItem, {
      ...updateData,
      totalPrice:
        (updateData.unitPrice || purchaseOrderItem.unitPrice) *
        (updateData.quantity || purchaseOrderItem.quantity),
    });
    try {
      await this.purchaseOrderItemRepository.save(purchaseOrderItem);
      return this.findOne(id, undefined, 'Updated');
    } catch (error) {
      console.log(error);
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(
    user: AuthenticatedUser,
    id: number,
  ): Promise<OnePurchaseOrderItemResponse> {
    const purchaseOrderItem = await this.purchaseOrderItemRepository.findOne({
      where: { id, isActive: true },
      relations: ['purchaseOrder'],
    });

    if (!purchaseOrderItem)
      ErrorHandler.notFound(ErrorMessage.PURCHASE_ORDER_ITEM_NOT_FOUND);

    if (!purchaseOrderItem.purchaseOrder) {
      ErrorHandler.notFound(ErrorMessage.PURCHASE_ORDER_NOT_FOUND);
    }

    if (purchaseOrderItem.purchaseOrder.merchantId !== user.merchant.id)
      ErrorHandler.differentMerchant();

    try {
      purchaseOrderItem.isActive = false;
      await this.purchaseOrderItemRepository.save(purchaseOrderItem); // Corregir el repositorio
      return this.findOne(id, undefined, 'Deleted');
    } catch (error) {
      console.log(error);
      ErrorHandler.handleDatabaseError(error);
    }
  }
}
