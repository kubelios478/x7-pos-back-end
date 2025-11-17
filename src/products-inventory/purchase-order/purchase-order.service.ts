import { Injectable } from '@nestjs/common';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { GetPurchaseOrdersQueryDto } from './dto/get-purchase-orders-query.dto';
import { AllPaginatedPurchaseOrders } from './dto/all-paginated-products.dto';
import { PurchaseOrder } from './entities/purchase-order.entity';
import {
  OnePurchaseOrderResponse,
  PurchaseOrderResponseDto,
} from './dto/purchase-order-response.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Merchant } from 'src/merchants/entities/merchant.entity';

@Injectable()
export class PurchaseOrderService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}

  async create(
    user: AuthenticatedUser,
    createPurchaseOrderDto: CreatePurchaseOrderDto,
  ): Promise<OnePurchaseOrderResponse> {
    const { merchantId, supplierId, ...purchaseOrderData } =
      createPurchaseOrderDto;

    if (merchantId !== user.merchant.id) ErrorHandler.differentMerchant();

    const [merchant, supplier] = await Promise.all([
      this.merchantRepository.findOneBy({ id: merchantId }),
      supplierId
        ? this.supplierRepository.findOneBy({
            id: supplierId,
          })
        : Promise.resolve(null),
    ]);

    if (!merchant) ErrorHandler.notFound(ErrorMessage.MERCHANT_NOT_FOUND);
    if (!supplier) ErrorHandler.notFound(ErrorMessage.SUPPLIER_NOT_FOUND);

    try {
      const newPurchaseOrder = this.purchaseOrderRepository.create({
        status: purchaseOrderData.status,
        totalAmount: purchaseOrderData.totalAmount,
        merchantId,
        supplierId,
      });

      const savedPurchaseOrder =
        await this.purchaseOrderRepository.save(newPurchaseOrder);

      return this.findOne(savedPurchaseOrder.id, undefined, 'Created');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
      console.log(error);
    }
  }

  async findAll(
    query: GetPurchaseOrdersQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedPurchaseOrders> {
    // 1. Configure pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // 4. Build query with filters
    const queryBuilder = this.purchaseOrderRepository
      .createQueryBuilder('purchaseOrder')
      .leftJoinAndSelect('purchaseOrder.merchant', 'merchant')
      .leftJoinAndSelect('purchaseOrder.supplier', 'supplier')
      .where('purchaseOrder.merchantId = :merchantId', { merchantId })
      .andWhere('purchaseOrder.isActive = :isActive', { isActive: true });

    // 5. Apply optional filters
    if (query.name) {
      queryBuilder.andWhere('LOWER(purchaseOrder.name) LIKE LOWER(:name)', {
        name: `%${query.name}%`,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('purchaseOrder.status = :status', {
        status: query.status,
      });
    }

    // 6. Get total records
    const total = await queryBuilder.getCount();

    // 7. Apply pagination and sorting
    const purchaseOrders = await queryBuilder
      .orderBy('purchaseOrder.status', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    // 8. Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const data: PurchaseOrderResponseDto[] = await Promise.all(
      purchaseOrders.map((purchaseOrder) => {
        const result: PurchaseOrderResponseDto = {
          id: purchaseOrder.id,
          status: purchaseOrder.status,
          totalAmount: purchaseOrder.totalAmount,
          orderDate: purchaseOrder.orderDate,
          merchant: purchaseOrder.merchant
            ? {
                id: purchaseOrder.merchant.id,
                name: purchaseOrder.merchant.name,
              }
            : null,
          supplier: purchaseOrder.supplier
            ? {
                id: purchaseOrder.supplier.id,
                name: purchaseOrder.supplier.name,
                contactInfo: purchaseOrder.supplier.contactInfo,
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
  ): Promise<OnePurchaseOrderResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Purchase Order ID incorrect');
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

    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: whereCondition,
      relations: ['merchant', 'supplier'],
    });

    if (!purchaseOrder)
      ErrorHandler.notFound(ErrorMessage.PURCHASE_ORDER_NOT_FOUND);

    const result: PurchaseOrderResponseDto = {
      id: purchaseOrder.id,
      status: purchaseOrder.status,
      totalAmount: purchaseOrder.totalAmount,
      orderDate: purchaseOrder.orderDate,
      merchant: purchaseOrder.merchant
        ? {
            id: purchaseOrder.merchant.id,
            name: purchaseOrder.merchant.name,
          }
        : null,
      supplier: purchaseOrder.supplier
        ? {
            id: purchaseOrder.supplier.id,
            name: purchaseOrder.supplier.name,
            contactInfo: purchaseOrder.supplier.contactInfo,
          }
        : null,
    };

    let response: OnePurchaseOrderResponse;

    switch (createdUpdateDelete) {
      case 'Created':
        response = {
          statusCode: 201,
          message: `Purchase Order ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      case 'Updated':
        response = {
          statusCode: 201,
          message: `Purchase Order ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 201,
          message: `Purchase Order ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      default:
        response = {
          statusCode: 200,
          message: 'Purchase Order retrieved successfully',
          data: result,
        };
        break;
    }
    return response;
  }

  async update(
    user: AuthenticatedUser,
    id: number,
    updateProductDto: UpdatePurchaseOrderDto,
  ): Promise<OnePurchaseOrderResponse> {
    const { merchantId, supplierId, ...updateData } = updateProductDto;

    const purchaseOrder = await this.purchaseOrderRepository.findOneBy({
      id,
      isActive: true,
    });

    if (!purchaseOrder)
      ErrorHandler.notFound(ErrorMessage.PURCHASE_ORDER_NOT_FOUND);

    if (purchaseOrder.merchantId !== user.merchant.id)
      ErrorHandler.differentMerchant();

    if (merchantId && merchantId !== purchaseOrder.merchantId)
      ErrorHandler.changedMerchant();

    if (supplierId && supplierId !== purchaseOrder.supplierId) {
      const supplier = await this.supplierRepository.findOneBy({
        id: supplierId,
      });
      if (!supplier) ErrorHandler.notFound(ErrorMessage.SUPPLIER_NOT_FOUND);
    }

    if (updateData.status && updateData.status !== purchaseOrder.status) {
      purchaseOrder.orderDate = new Date();
    }

    Object.assign(purchaseOrder, {
      ...updateData,
      supplierId,
    });
    try {
      await this.purchaseOrderRepository.save(purchaseOrder);
      return this.findOne(id, undefined, 'Updated');
    } catch (error) {
      console.log(error);
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(
    user: AuthenticatedUser,
    id: number,
  ): Promise<OnePurchaseOrderResponse> {
    const purchaseOrder = await this.purchaseOrderRepository.findOneBy({
      id,
      isActive: true,
    });

    if (!purchaseOrder)
      ErrorHandler.notFound(ErrorMessage.PURCHASE_ORDER_NOT_FOUND);

    if (purchaseOrder.merchantId !== user.merchant.id)
      ErrorHandler.differentMerchant();

    try {
      purchaseOrder.isActive = false;
      await this.purchaseOrderRepository.save(purchaseOrder);
      return this.findOne(id, undefined, 'Deleted');
    } catch (error) {
      console.log(error);
      ErrorHandler.handleDatabaseError(error);
    }
  }
}
