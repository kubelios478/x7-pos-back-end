import { Injectable } from '@nestjs/common';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { GetPurchaseOrdersQueryDto } from './dto/get-purchase-orders-query.dto';
import { AllPaginatedPurchaseOrders } from './dto/all-paginated-purchase-order.dto';
import { PurchaseOrder } from './entities/purchase-order.entity';
import {
  OnePurchaseOrderResponse,
  PurchaseOrderResponseDto,
} from './dto/purchase-order-response.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, DeepPartial } from 'typeorm';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { Supplier } from '../../../core/business-partners/suppliers/entities/supplier.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { PurchaseOrderItem } from '../purchase-order-item/entities/purchase-order-item.entity';
import { Location } from '../stocks/locations/entities/location.entity';
import { Item } from '../stocks/items/entities/item.entity';
import { PurchaseOrderStatus } from './constants/purchase-order-status.enum';
import { MovementsStatus } from '../stocks/movements/constants/movements-status';
import { MovementsService } from '../stocks/movements/movements.service';

@Injectable()
export class PurchaseOrderService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(PurchaseOrderItem)
    private readonly purchaseOrderItemRepository: Repository<PurchaseOrderItem>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    private readonly movementsService: MovementsService,
  ) {}

  async create(
    merchant_id: number,
    createPurchaseOrderDto: CreatePurchaseOrderDto,
  ): Promise<OnePurchaseOrderResponse> {
    const { supplierId, items, ...purchaseOrderData } = createPurchaseOrderDto;

    const [supplier] = await Promise.all([
      (async () => {
        const merchant = await this.merchantRepository.findOne({
          where: { id: merchant_id },
          select: ['companyId'],
        });
        if (!merchant) return null;
        return this.supplierRepository.findOneBy({
          id: supplierId,
          company_id: merchant.companyId,
        });
      })(),
    ]);

    if (!supplier) ErrorHandler.notFound(ErrorMessage.SUPPLIER_NOT_FOUND);

    try {
      let calculatedTotal = 0;
      const itemsToSave: {
        productId: number;
        variantId: number | null;
        locationId: number;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }[] = [];

      if (items && Array.isArray(items)) {
        for (const item of items) {
          if (!item.variantId) {
            throw new Error('Cada ítem de la orden de compra debe tener una variante asociada.');
          }
          if (!item.locationId) {
            throw new Error('Cada ítem de la orden de compra debe tener una localización de destino asignada.');
          }
          const qty = Number(item.quantity) || 0;
          const price = Number(item.unitPrice) || 0;
          const totalPrice = qty * price;
          calculatedTotal += totalPrice;

          itemsToSave.push({
            productId: Number(item.productId),
            variantId: Number(item.variantId),
            locationId: Number(item.locationId),
            quantity: qty,
            unitPrice: price,
            totalPrice: totalPrice,
          });
        }
      }

      const finalTotal = purchaseOrderData.totalAmount !== undefined 
        ? purchaseOrderData.totalAmount 
        : calculatedTotal;

      const newPurchaseOrder = this.purchaseOrderRepository.create({
        status: purchaseOrderData.status,
        totalAmount: finalTotal,
        merchantId: merchant_id,
        supplierId,
      });

      const savedPurchaseOrder =
        await this.purchaseOrderRepository.save(newPurchaseOrder);

      if (itemsToSave.length > 0) {
        const itemsWithOrder = itemsToSave.map(item => {
          const poItem = new PurchaseOrderItem();
          poItem.productId = item.productId;
          poItem.variantId = item.variantId as any;
          poItem.locationId = item.locationId;
          poItem.quantity = item.quantity;
          poItem.unitPrice = item.unitPrice;
          poItem.totalPrice = item.totalPrice;
          poItem.purchaseOrderId = savedPurchaseOrder.id;
          poItem.receivedQuantity = 0; // Siempre inicializar en 0 para que increaseStockForOrder calcule diff correcto
          return poItem;
        });
        await this.purchaseOrderItemRepository.save(itemsWithOrder);

        // Si la orden se crea directamente en estado COMPLETED o PARTIALLY_RECEIVED, incrementamos el stock
        const targetReceivedStatuses = [PurchaseOrderStatus.COMPLETED, PurchaseOrderStatus.PARTIALLY_RECEIVED];
        if (targetReceivedStatuses.includes(savedPurchaseOrder.status)) {
          await this.increaseStockForOrder(savedPurchaseOrder.id, merchant_id, savedPurchaseOrder.status);
        }
      }

      return this.findOne(savedPurchaseOrder.id, merchant_id, 'Created');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
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
      .leftJoinAndSelect('purchaseOrder.purchaseOrderItems', 'purchaseOrderItems')
      .where('purchaseOrder.merchantId = :merchantId', { merchantId })
      .andWhere('purchaseOrder.isActive = :isActive', { isActive: true });

    // 5. Apply optional filters
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
        const result: any = {
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
                tax_id: purchaseOrder.supplier.tax_id,
                email: purchaseOrder.supplier.email,
                company_id: purchaseOrder.supplier.company_id,
              }
            : null,
          purchaseOrderItems: (purchaseOrder.purchaseOrderItems || []).map(item => ({
            id: item.id,
            quantity: item.quantity,
            receivedQuantity: item.receivedQuantity || 0,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            productId: item.productId,
            variantId: item.variantId,
          })),
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
      relations: [
        'merchant',
        'supplier',
        'purchaseOrderItems',
        'purchaseOrderItems.product',
        'purchaseOrderItems.variant'
      ],
    });

    if (!purchaseOrder)
      ErrorHandler.notFound(ErrorMessage.PURCHASE_ORDER_NOT_FOUND);

    const result: any = {
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
            tax_id: purchaseOrder.supplier.tax_id,
            email: purchaseOrder.supplier.email,
            company_id: purchaseOrder.supplier.company_id,
          }
        : null,
      purchaseOrderItems: (purchaseOrder.purchaseOrderItems || []).map(item => ({
        id: item.id,
        quantity: item.quantity,
        receivedQuantity: item.receivedQuantity || 0,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        productId: item.productId,
        variantId: item.variantId,
        product: item.product ? {
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku
        } : null,
        variant: item.variant ? {
          id: item.variant.id,
          name: item.variant.name,
          sku: item.variant.sku
        } : null
      }))
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
          statusCode: 200,
          message: `Purchase Order ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 200,
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
    id: number,
    merchant_id: number,
    updateProductDto: UpdatePurchaseOrderDto,
  ): Promise<OnePurchaseOrderResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Purchase Order ID incorrect');
    }
    const { supplierId, ...updateData } = updateProductDto;

    const purchaseOrder = await this.purchaseOrderRepository.findOneBy({
      id,
      isActive: true,
      merchantId: merchant_id,
    });

    if (!purchaseOrder) {
      ErrorHandler.notFound(ErrorMessage.PURCHASE_ORDER_NOT_FOUND);
    }

    if (updateProductDto.isActive === false && purchaseOrder.isActive === true) {
      return this.remove(id, merchant_id);
    }

    if (supplierId && supplierId !== purchaseOrder.supplierId) {
      const merchant = await this.merchantRepository.findOne({
        where: { id: merchant_id },
        select: ['companyId'],
      });
      if (!merchant) ErrorHandler.notFound(ErrorMessage.MERCHANT_NOT_FOUND);

      const supplier = await this.supplierRepository.findOneBy({
        id: supplierId,
        company_id: merchant.companyId,
      });
      if (!supplier) ErrorHandler.notFound(ErrorMessage.SUPPLIER_NOT_FOUND);
    }

    const oldStatus = purchaseOrder.status;

    if (updateData.status && updateData.status !== purchaseOrder.status) {
      purchaseOrder.orderDate = new Date();
    }

    try {
      // Solo actualizar los campos simples — excluir 'items' del DTO para no contaminar la entidad
      const { items: _items, ...updateEntityData } = updateData as any;
      Object.assign(purchaseOrder, {
        ...updateEntityData,
        // Solo sobreescribir supplierId si viene explícitamente en el payload
        ...(supplierId !== undefined ? { supplierId } : {}),
      });
      await this.purchaseOrderRepository.save(purchaseOrder);

      const targetReceivedStatuses = [PurchaseOrderStatus.COMPLETED, PurchaseOrderStatus.PARTIALLY_RECEIVED];
      const isNowReceived = targetReceivedStatuses.includes(purchaseOrder.status);

      // 1. Si vienen items con receivedQuantity, los actualizamos e incrementamos el stock por la diferencia
      if (updateProductDto.items && Array.isArray(updateProductDto.items)) {
        let location = await this.locationRepository.findOne({
          where: { merchantId: merchant_id, isActive: true }
        });

        if (!location) {
          location = this.locationRepository.create({
            name: 'Main Warehouse',
            address: 'Default address location',
            merchantId: merchant_id,
            isActive: true
          });
          location = await this.locationRepository.save(location);
        }

        for (const itemDto of updateProductDto.items) {
          const dbItem = await this.purchaseOrderItemRepository.findOneBy({
            id: Number(itemDto.id),
            purchaseOrderId: id,
            isActive: true
          });

          if (dbItem) {
            const oldReceived = Number(dbItem.receivedQuantity) || 0;
            // Si el estado de la orden es COMPLETED, asumimos que se recibió todo el ítem
            const newReceived = purchaseOrder.status === PurchaseOrderStatus.COMPLETED
              ? Number(dbItem.quantity)
              : (itemDto.receivedQuantity !== undefined && itemDto.receivedQuantity !== null
                  ? Number(itemDto.receivedQuantity)
                  : oldReceived);
            const diff = newReceived - oldReceived;

            dbItem.receivedQuantity = newReceived;
            await this.purchaseOrderItemRepository.save(dbItem);

            if (isNowReceived && diff !== 0) {
              const targetLocationId = dbItem.locationId || location.id;
              const whereClause: any = {
                productId: dbItem.productId,
                locationId: targetLocationId
              };
              if (dbItem.variantId) {
                whereClause.variantId = dbItem.variantId;
              } else {
                whereClause.variantId = IsNull();
              }

              let stockItem = await this.itemRepository.findOne({
                where: whereClause
              });

              if (stockItem) {
                const oldQty = Number(stockItem.currentQty) || 0;
                stockItem.currentQty = oldQty + diff;
                stockItem.isActive = true; // Reactivar si estaba inactivo
                stockItem = await this.itemRepository.save(stockItem);
              } else {
                const createData: DeepPartial<Item> = {
                  productId: dbItem.productId,
                  locationId: targetLocationId,
                  currentQty: diff,
                  isActive: true
                };
                if (dbItem.variantId) {
                  createData.variantId = dbItem.variantId;
                }
                const newStockItem = this.itemRepository.create(createData);
                stockItem = await this.itemRepository.save(newStockItem);
              }

              // Registrar el movimiento de auditoría
              await this.movementsService.create(merchant_id, {
                stockItemId: stockItem.id,
                quantity: Math.abs(diff),
                type: diff > 0 ? MovementsStatus.PURCHASE_ENTRY : MovementsStatus.OUT,
                reference: `PO-${id}`,
                reason: `Fulfillment of Purchase Order #${id} (Partial / Update)`,
              });
            }
          }
        }
      } else {
        // 2. Si no vienen items específicos pero cambia el estatus a COMPLETED/PARTIALLY_RECEIVED, procesamos todo el pedido
        const wasAlreadyReceived = targetReceivedStatuses.includes(oldStatus);
        if (isNowReceived && !wasAlreadyReceived) {
          await this.increaseStockForOrder(id, merchant_id, purchaseOrder.status);
        }
      }

      return this.findOne(id, merchant_id, 'Updated');
    } catch (error: any) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  private async increaseStockForOrder(purchaseOrderId: number, merchantId: number, status: PurchaseOrderStatus) {
    const orderItems = await this.purchaseOrderItemRepository.find({
      where: { purchaseOrderId, isActive: true }
    });

    if (orderItems.length > 0) {
      let defaultLocation = await this.locationRepository.findOne({
        where: { merchantId, isActive: true }
      });

      if (!defaultLocation) {
        defaultLocation = this.locationRepository.create({
          name: 'Main Warehouse',
          address: 'Default address location',
          merchantId,
          isActive: true
        });
        defaultLocation = await this.locationRepository.save(defaultLocation);
      }

      for (const item of orderItems) {
        const oldReceived = Number(item.receivedQuantity) || 0;
        // Para COMPLETED: el total a recibir es item.quantity; diff es lo pendiente de recibir
        const newReceived = status === PurchaseOrderStatus.COMPLETED ? Number(item.quantity) : oldReceived;
        const diff = newReceived - oldReceived;

        if (diff > 0) {
          item.receivedQuantity = newReceived;
          await this.purchaseOrderItemRepository.save(item);

          const targetLocationId = item.locationId || defaultLocation.id;

          const whereClause: any = {
            productId: item.productId,
            locationId: targetLocationId
          };
          if (item.variantId) {
            whereClause.variantId = item.variantId;
          } else {
            whereClause.variantId = IsNull();
          }

          const stockItem = await this.itemRepository.findOne({
            where: whereClause
          });

          if (stockItem) {
            stockItem.currentQty = Number(stockItem.currentQty) + diff;
            stockItem.isActive = true;
            await this.itemRepository.save(stockItem);

            await this.movementsService.create(merchantId, {
              stockItemId: stockItem.id,
              quantity: diff,
              type: MovementsStatus.PURCHASE_ENTRY,
              reference: `PO-${purchaseOrderId}`,
              reason: `Fulfillment of Purchase Order #${purchaseOrderId}`,
            });
          } else {
            const createData: DeepPartial<Item> = {
              productId: item.productId,
              locationId: targetLocationId,
              currentQty: diff,
              isActive: true
            };
            if (item.variantId) {
              createData.variantId = item.variantId;
            }
            const newStockItem = this.itemRepository.create(createData);
            const savedStockItem = await this.itemRepository.save(newStockItem);

            await this.movementsService.create(merchantId, {
              stockItemId: savedStockItem.id,
              quantity: diff,
              type: MovementsStatus.PURCHASE_ENTRY,
              reference: `PO-${purchaseOrderId}`,
              reason: `Fulfillment of Purchase Order #${purchaseOrderId}`,
            });
          }
        }
      }
    }
  }

  async remove(
    id: number,
    merchant_id: number,
  ): Promise<OnePurchaseOrderResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Purchase Order ID incorrect');
    }
    const purchaseOrder = await this.purchaseOrderRepository.findOneBy({
      id,
      isActive: true,
      merchantId: merchant_id,
    });

    if (!purchaseOrder)
      ErrorHandler.notFound(ErrorMessage.PURCHASE_ORDER_NOT_FOUND);

    try {
      purchaseOrder.isActive = false;
      await this.purchaseOrderRepository.save(purchaseOrder);

      const purchaseOrderItems = await this.purchaseOrderItemRepository.find({
        where: { purchaseOrderId: id, isActive: true },
      });

      for (const item of purchaseOrderItems) {
        item.isActive = false;
        await this.purchaseOrderItemRepository.save(item);
      }

      return this.findOne(id, merchant_id, 'Deleted');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }
}
