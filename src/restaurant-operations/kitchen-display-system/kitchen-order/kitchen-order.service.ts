import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, IsNull } from 'typeorm';
import { KitchenOrder } from './entities/kitchen-order.entity';
import { KitchenOrderItem } from '../kitchen-order-item/entities/kitchen-order-item.entity';
import { KitchenOrderItemStatus } from '../kitchen-order-item/constants/kitchen-order-item-status.enum';
import { KitchenOrderItemPreparationStatus } from '../kitchen-order-item/constants/kitchen-order-item-preparation-status.enum';
import { KitchenCourse, calculatePacingHoldMinutes } from '../kitchen-order-item/constants/kitchen-course.enum';
import { OrderItem } from '../../pos/order-item/entities/order-item.entity';
import { OrderItemStatus } from '../../pos/order-item/constants/order-item-status.enum';
import { KitchenOrderSyncService } from './kitchen-order-sync.service';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { Order } from '../../../restaurant-operations/pos/orders/entities/order.entity';
import { OnlineOrder } from '../../../commerce/online-ordering-system/online-order/entities/online-order.entity';
import { KitchenStation } from '../kitchen-station/entities/kitchen-station.entity';
import { Product } from '../../../inventory/products-inventory/products/entities/product.entity';
import { Variant } from '../../../inventory/products-inventory/variants/entities/variant.entity';
import { CreateKitchenOrderDto } from './dto/create-kitchen-order.dto';

function inferKitchenCourse(productName?: string | null, explicitCourse?: string): KitchenCourse {
  if (explicitCourse) {
    const norm = explicitCourse.toLowerCase().trim();
    if (norm === 'beverage' || norm === 'drink') return KitchenCourse.BEVERAGE;
    if (norm === 'appetizer' || norm === 'starter') return KitchenCourse.APPETIZER;
    if (norm === 'dessert') return KitchenCourse.DESSERT;
    if (norm === 'main_course' || norm === 'main') return KitchenCourse.MAIN_COURSE;
  }

  const p = (productName || '').toLowerCase();
  // Beverages
  if (
    p.includes('cappuccino') || p.includes('latte') || p.includes('cafe') || p.includes('coffee') ||
    p.includes('espresso') || p.includes('tea') || p.includes('té') || p.includes('beer') ||
    p.includes('cerveza') || p.includes('vino') || p.includes('wine') || p.includes('soda') ||
    p.includes('juice') || p.includes('jugo') || p.includes('water') || p.includes('agua') ||
    p.includes('cocktail') || p.includes('drink') || p.includes('beverage') || p.includes('limonada')
  ) {
    return KitchenCourse.BEVERAGE;
  }

  // Desserts
  if (
    p.includes('cake') || p.includes('torta') || p.includes('pastel') || p.includes('helado') ||
    p.includes('ice cream') || p.includes('dessert') || p.includes('postre') || p.includes('pie') ||
    p.includes('brownie') || p.includes('cheesecake') || p.includes('croissant') || p.includes('volcan')
  ) {
    return KitchenCourse.DESSERT;
  }

  // Appetizers
  if (
    p.includes('salad') || p.includes('ensalada') || p.includes('bruschetta') || p.includes('nacho') ||
    p.includes('soup') || p.includes('sopa') || p.includes('wings') || p.includes('alitas') ||
    p.includes('calamari') || p.includes('fries') || p.includes('papas') || p.includes('carpaccio') ||
    p.includes('taco') || p.includes('sushi') || p.includes('roll')
  ) {
    return KitchenCourse.APPETIZER;
  }

  return KitchenCourse.MAIN_COURSE;
}

import { UpdateKitchenOrderDto } from './dto/update-kitchen-order.dto';
import {
  GetKitchenOrderQueryDto,
  KitchenOrderSortBy,
} from './dto/get-kitchen-order-query.dto';
import {
  KitchenOrderResponseDto,
  OneKitchenOrderResponseDto,
} from './dto/kitchen-order-response.dto';
import { KitchenOrderItemResponseDto } from '../kitchen-order-item/dto/kitchen-order-item-response.dto';
import { PaginatedKitchenOrderResponseDto } from './dto/paginated-kitchen-order-response.dto';
import { KitchenOrderStatus } from './constants/kitchen-order-status.enum';
import { KitchenOrderBusinessStatus } from './constants/kitchen-order-business-status.enum';
import { KitchenStationStatus } from '../kitchen-station/constants/kitchen-station-status.enum';
import { OnlineOrderStatus } from '../../../commerce/online-ordering-system/online-order/constants/online-order-status.enum';
import { OrderStatus } from '../../../restaurant-operations/pos/orders/constants/order-status.enum';
import { CancelKitchenOrderDto } from './dto/cancel-kitchen-order.dto';
import { KitchenCancellationReason } from './constants/kitchen-order-cancellation-reason.dto';
import { StockAdjustmentType } from './constants/stock-adjustment-type.enum';
import { ProductsInventoryService } from 'src/inventory/products-inventory/products-inventory.service';
import { KitchenEventLog } from '../kitchen-event-log/entities/kitchen-event-log.entity';
import { KitchenEventLogEventType } from '../kitchen-event-log/constants/kitchen-event-log-event-type.enum';
import { KitchenEventLogStatus } from '../kitchen-event-log/constants/kitchen-event-log-status.enum';

const KITCHEN_ORDER_DETAIL_RELATIONS = {
  merchant: true,
  order: true,
  onlineOrder: true,
  station: true,
  kitchenOrderItems: {
    product: true,
    variant: true,
    orderItem: true,
  },
} as const;

@Injectable()
export class KitchenOrderService {
  constructor(
    @InjectRepository(KitchenOrder)
    private readonly kitchenOrderRepository: Repository<KitchenOrder>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OnlineOrder)
    private readonly onlineOrderRepository: Repository<OnlineOrder>,
    @InjectRepository(KitchenStation)
    private readonly kitchenStationRepository: Repository<KitchenStation>,
    private readonly dataSource: DataSource,
    private readonly kitchenOrderSyncService: KitchenOrderSyncService,
    private readonly productsInventoryService: ProductsInventoryService,
  ) {}

  async create(
    createKitchenOrderDto: CreateKitchenOrderDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneKitchenOrderResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to create kitchen orders',
      );
    }

    const merchant = await this.merchantRepository.findOne({
      where: { id: authenticatedUserMerchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const hasInlineItems =
      Array.isArray(createKitchenOrderDto.kitchenOrderItems) &&
      createKitchenOrderDto.kitchenOrderItems.length > 0;

    if (
      !createKitchenOrderDto.orderId &&
      !createKitchenOrderDto.onlineOrderId &&
      !hasInlineItems
    ) {
      throw new BadRequestException(
        'Either orderId, onlineOrderId, or kitchenOrderItems must be provided',
      );
    }

    if (createKitchenOrderDto.orderId && createKitchenOrderDto.onlineOrderId) {
      throw new BadRequestException(
        'Cannot provide both orderId and onlineOrderId',
      );
    }

    let validOrderId: number | null = null;
    if (createKitchenOrderDto.orderId) {
      const order = await this.orderRepository.findOne({
        where: {
          id: createKitchenOrderDto.orderId,
          merchant_id: authenticatedUserMerchantId,
          logical_status: OrderStatus.ACTIVE,
        },
      });

      if (order) {
        validOrderId = order.id;
        const existingKo = await this.kitchenOrderRepository.findOne({
          where: {
            order_id: createKitchenOrderDto.orderId,
            merchant_id: authenticatedUserMerchantId,
            status: KitchenOrderStatus.ACTIVE,
          },
        });
        if (existingKo) {
          throw new ConflictException(
            'An active kitchen order already exists for this POS order',
          );
        }
      } else if (!hasInlineItems) {
        throw new NotFoundException(
          'Order not found or you do not have access to it',
        );
      }
    }

    if (createKitchenOrderDto.onlineOrderId) {
      const onlineOrder = await this.onlineOrderRepository
        .createQueryBuilder('onlineOrder')
        .leftJoin('onlineOrder.store', 'store')
        .leftJoin('store.merchant', 'merchant')
        .where('onlineOrder.id = :orderId', {
          orderId: createKitchenOrderDto.onlineOrderId,
        })
        .andWhere('merchant.id = :merchantId', {
          merchantId: authenticatedUserMerchantId,
        })
        .andWhere('onlineOrder.status != :deletedStatus', {
          deletedStatus: OnlineOrderStatus.DELETED,
        })
        .getOne();

      if (!onlineOrder) {
        throw new NotFoundException(
          'Online order not found or you do not have access to it',
        );
      }
    }

    if (createKitchenOrderDto.stationId) {
      const station = await this.kitchenStationRepository.findOne({
        where: {
          id: createKitchenOrderDto.stationId,
          merchant_id: authenticatedUserMerchantId,
          status: KitchenStationStatus.ACTIVE,
        },
      });

      if (!station) {
        throw new NotFoundException(
          'Kitchen station not found or you do not have access to it',
        );
      }
    }

    if (
      createKitchenOrderDto.priority !== undefined &&
      createKitchenOrderDto.priority < 0
    ) {
      throw new BadRequestException(
        'Priority must be greater than or equal to 0',
      );
    }

    const kitchenOrder = new KitchenOrder();
    kitchenOrder.merchant_id = authenticatedUserMerchantId;
    kitchenOrder.order_id = validOrderId;
    kitchenOrder.online_order_id = createKitchenOrderDto.onlineOrderId || null;
    kitchenOrder.station_id = createKitchenOrderDto.stationId || null;
    kitchenOrder.priority = createKitchenOrderDto.priority ?? 0;
    kitchenOrder.business_status =
      createKitchenOrderDto.businessStatus ||
      KitchenOrderBusinessStatus.STARTED;
    kitchenOrder.started_at =
      createKitchenOrderDto.startedAt ||
      (kitchenOrder.business_status === KitchenOrderBusinessStatus.STARTED
        ? new Date()
        : null);
    kitchenOrder.completed_at = createKitchenOrderDto.completedAt || null;

    let notesText = createKitchenOrderDto.notes?.trim() || '';
    if (
      createKitchenOrderDto.orderId &&
      !validOrderId &&
      !notesText.includes(`Ticket #${createKitchenOrderDto.orderId}`)
    ) {
      notesText = notesText
        ? `[Ticket #${createKitchenOrderDto.orderId}] ${notesText}`
        : `[Ticket #${createKitchenOrderDto.orderId}]`;
    }
    kitchenOrder.notes = notesText || null;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedKitchenOrder: KitchenOrder;
    try {
      savedKitchenOrder = await queryRunner.manager.save(
        KitchenOrder,
        kitchenOrder,
      );

      if (hasInlineItems && createKitchenOrderDto.kitchenOrderItems) {
        const productRepo = queryRunner.manager.getRepository(Product);
        const variantRepo = queryRunner.manager.getRepository(Variant);

        const createdKoiList: KitchenOrderItem[] = [];
        for (const it of createKitchenOrderDto.kitchenOrderItems) {
          let matchedProduct: Product | null = null;
          if (it.productId) {
            matchedProduct = await productRepo.findOne({
              where: {
                id: it.productId,
                merchantId: authenticatedUserMerchantId,
              },
            });
          }
          if (!matchedProduct && it.productName) {
            matchedProduct = await productRepo.findOne({
              where: {
                name: it.productName.trim(),
                merchantId: authenticatedUserMerchantId,
              },
            });
          }
          if (!matchedProduct) {
            matchedProduct = await productRepo.findOne({
              where: { merchantId: authenticatedUserMerchantId },
            });
          }
          if (!matchedProduct) {
            const p = new Product();
            p.merchantId = authenticatedUserMerchantId;
            p.name = it.productName?.trim() || 'General Kitchen Item';
            p.sku = `KIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            p.basePrice = 0;
            matchedProduct = await productRepo.save(p);
          }

          let matchedVariantId: number | null = it.variantId || null;
          if (
            !matchedVariantId &&
            it.variantName &&
            it.variantName !== 'Estándar' &&
            matchedProduct
          ) {
            const v = await variantRepo.findOne({
              where: {
                productId: matchedProduct.id,
                name: it.variantName.trim(),
              },
            });
            if (v) {
              matchedVariantId = v.id;
            }
          }

          const assignedCourse = inferKitchenCourse(matchedProduct.name || it.productName || '', it.course || undefined);
          const orderPriority = kitchenOrder.priority ?? 0;

          const { isHeld, delayMinutes } = calculatePacingHoldMinutes(
            assignedCourse,
            orderPriority,
          );
          const holdUntilDate = isHeld ? new Date(Date.now() + delayMinutes * 60 * 1000) : null;

          const koi = queryRunner.manager.create(KitchenOrderItem, {
            kitchen_order_id: savedKitchenOrder.id,
            order_item_id: null,
            product_id: matchedProduct.id,
            variant_id: matchedVariantId,
            quantity: it.quantity && it.quantity > 0 ? it.quantity : 1,
            prepared_quantity: 0,
            course: assignedCourse,
            preparation_status: isHeld
              ? KitchenOrderItemPreparationStatus.HELD
              : (kitchenOrder.business_status === KitchenOrderBusinessStatus.STARTED
                  ? KitchenOrderItemPreparationStatus.IN_PREPARATION
                  : KitchenOrderItemPreparationStatus.PENDING),
            hold_until: holdUntilDate,
            fired_at: !isHeld && kitchenOrder.business_status === KitchenOrderBusinessStatus.STARTED ? new Date() : null,
            status: KitchenOrderItemStatus.ACTIVE,
            started_at: !isHeld && kitchenOrder.business_status === KitchenOrderBusinessStatus.STARTED ? new Date() : null,
            completed_at: null,
            notes:
              it.notes ||
              (it.variantName &&
              !matchedVariantId &&
              it.variantName !== 'Estándar'
                ? it.variantName
                : null),
          });
          const savedKoi = await queryRunner.manager.save(KitchenOrderItem, koi);
          createdKoiList.push(savedKoi);
        }

        // Si todos los items resultaron en HELD, la orden no puede nacer en STARTED
        const allItemsHeld = createdKoiList.length > 0 && createdKoiList.every(
          (k) => k.preparation_status === KitchenOrderItemPreparationStatus.HELD,
        );
        if (allItemsHeld) {
          savedKitchenOrder.business_status = KitchenOrderBusinessStatus.PENDING;
          savedKitchenOrder.started_at = null;
          await queryRunner.manager.save(KitchenOrder, savedKitchenOrder);
        }
      } else {
        const skipAuto = createKitchenOrderDto.skipAutoKitchenItems === true;
        if (createKitchenOrderDto.orderId && !skipAuto) {
          const orderItems = await queryRunner.manager.find(OrderItem, {
            where: {
              order_id: createKitchenOrderDto.orderId,
              status: OrderItemStatus.ACTIVE,
            },
          });
          for (const oi of orderItems) {
            const koi = queryRunner.manager.create(KitchenOrderItem, {
              kitchen_order_id: savedKitchenOrder.id,
              order_item_id: oi.id,
              product_id: oi.product_id,
              variant_id: oi.variant_id,
              quantity: oi.quantity,
              prepared_quantity: 0,
              preparation_status: KitchenOrderItemPreparationStatus.PENDING,
              status: KitchenOrderItemStatus.ACTIVE,
              started_at: null,
              completed_at: null,
              notes: null,
            });
            await queryRunner.manager.save(KitchenOrderItem, koi);
          }
        }
      }

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }

    if (validOrderId) {
      await this.kitchenOrderSyncService.syncPosOrderFromKitchenOrders(
        validOrderId,
      );
    }

    // Auditoría inicial: si la comanda nace en STARTED (ej: aperitivos o bebidas que inician automáticamente)
    try {
      if (savedKitchenOrder.business_status === KitchenOrderBusinessStatus.STARTED) {
        const eventLogRepo = this.dataSource.getRepository(KitchenEventLog);
        const orderStartTime = savedKitchenOrder.started_at || savedKitchenOrder.created_at || new Date();

        await eventLogRepo.save(
          eventLogRepo.create({
            kitchen_order_id: savedKitchenOrder.id,
            station_id: savedKitchenOrder.station_id || null,
            event_type: KitchenEventLogEventType.INICIO,
            event_time: orderStartTime,
            status: KitchenEventLogStatus.ACTIVE,
            user_id: null,
            message: `Order #${savedKitchenOrder.id} received and started in kitchen`,
          }),
        );
      }
    } catch (err) {
      console.error('Failed to log initial auto-start event:', err);
    }

    const completeKitchenOrder = await this.kitchenOrderRepository.findOne({
      where: { id: savedKitchenOrder.id },
      relations: KITCHEN_ORDER_DETAIL_RELATIONS,
      relationLoadStrategy: 'query',
    });

    if (!completeKitchenOrder) {
      throw new NotFoundException('Kitchen order not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Kitchen order created successfully',
      data: this.formatKitchenOrderResponse(completeKitchenOrder),
    };
  }

  async findAll(
    query: GetKitchenOrderQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<PaginatedKitchenOrderResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access kitchen orders',
      );
    }

    if (query.page !== undefined && query.page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }

    if (query.limit !== undefined && (query.limit < 1 || query.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    if (query.createdDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(query.createdDate)) {
        throw new BadRequestException(
          'Created date must be in YYYY-MM-DD format',
        );
      }
    }

    // Auto-fire de ítems retenidos cuyo tiempo de hold ya expiró en cocina
    try {
      await this.dataSource.query(`
        UPDATE kitchen_order_item
        SET preparation_status = 'in_preparation',
            hold_until = NULL,
            fired_at = NOW(),
            started_at = COALESCE(started_at, NOW())
        WHERE preparation_status = 'held'
          AND hold_until IS NOT NULL
          AND hold_until <= NOW();
      `);

      await this.dataSource.query(`
        UPDATE kitchen_order ko
        SET business_status = 'started',
            started_at = COALESCE(started_at, NOW())
        WHERE ko.business_status = 'pending'
          AND EXISTS (
            SELECT 1 FROM kitchen_order_item koi
            WHERE koi.kitchen_order_id = ko.id
              AND koi.preparation_status = 'in_preparation'
          );
      `);
    } catch (e) {
      // safe fallback
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.kitchenOrderRepository
      .createQueryBuilder('kitchenOrder')
      .leftJoinAndSelect('kitchenOrder.merchant', 'merchant')
      .leftJoinAndSelect('kitchenOrder.order', 'order')
      .leftJoinAndSelect('kitchenOrder.onlineOrder', 'onlineOrder')
      .leftJoinAndSelect('kitchenOrder.station', 'station')
      .leftJoinAndSelect('kitchenOrder.kitchenOrderItems', 'kitchenOrderItem')
      .leftJoinAndSelect('kitchenOrderItem.product', 'koiProduct')
      .leftJoinAndSelect('kitchenOrderItem.variant', 'koiVariant')
      .leftJoinAndSelect('kitchenOrderItem.orderItem', 'koiOrderItem')
      .where('kitchenOrder.merchant_id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .andWhere('kitchenOrder.status != :deletedStatus', {
        deletedStatus: KitchenOrderStatus.DELETED,
      });

    if (query.orderId) {
      queryBuilder.andWhere('kitchenOrder.order_id = :orderId', {
        orderId: query.orderId,
      });
    }

    if (query.onlineOrderId) {
      queryBuilder.andWhere('kitchenOrder.online_order_id = :onlineOrderId', {
        onlineOrderId: query.onlineOrderId,
      });
    }

    if (query.stationId) {
      queryBuilder.andWhere('kitchenOrder.station_id = :stationId', {
        stationId: query.stationId,
      });
    }

    if (query.businessStatus) {
      queryBuilder.andWhere('kitchenOrder.business_status = :businessStatus', {
        businessStatus: query.businessStatus,
      });
    }

    if (query.minPriority !== undefined) {
      queryBuilder.andWhere('kitchenOrder.priority >= :minPriority', {
        minPriority: query.minPriority,
      });
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      queryBuilder
        .andWhere('kitchenOrder.created_at >= :startDate', { startDate })
        .andWhere('kitchenOrder.created_at < :endDate', { endDate });
    }

    if (query.startDate) {
      const sDate = new Date(query.startDate);
      queryBuilder.andWhere('kitchenOrder.created_at >= :sDate', { sDate });
    }

    if (query.endDate) {
      const eDate = new Date(query.endDate);
      eDate.setDate(eDate.getDate() + 1);
      queryBuilder.andWhere('kitchenOrder.created_at < :eDate', { eDate });
    }

    if (query.cancellationReason) {
      queryBuilder.andWhere(
        'kitchenOrder.cancellation_reason = :cancellationReason',
        {
          cancellationReason: query.cancellationReason,
        },
      );
    }

    const sortField =
      query.sortBy === KitchenOrderSortBy.ORDER_ID
        ? 'kitchenOrder.order_id'
        : query.sortBy === KitchenOrderSortBy.ONLINE_ORDER_ID
          ? 'kitchenOrder.online_order_id'
          : query.sortBy === KitchenOrderSortBy.STATION_ID
            ? 'kitchenOrder.station_id'
            : query.sortBy === KitchenOrderSortBy.PRIORITY
              ? 'kitchenOrder.priority'
              : query.sortBy === KitchenOrderSortBy.BUSINESS_STATUS
                ? 'kitchenOrder.business_status'
                : query.sortBy === KitchenOrderSortBy.STARTED_AT
                  ? 'kitchenOrder.started_at'
                  : query.sortBy === KitchenOrderSortBy.COMPLETED_AT
                    ? 'kitchenOrder.completed_at'
                    : query.sortBy === KitchenOrderSortBy.UPDATED_AT
                      ? 'kitchenOrder.updated_at'
                      : query.sortBy === KitchenOrderSortBy.ID
                        ? 'kitchenOrder.id'
                        : 'kitchenOrder.created_at';
    const sortOrder = query.sortOrder || 'ASC';
    queryBuilder.orderBy(sortField, sortOrder);
    queryBuilder.addOrderBy('kitchenOrder.id', sortOrder);
    if (query.sortBy === KitchenOrderSortBy.PRIORITY) {
      queryBuilder.addOrderBy('kitchenOrder.created_at', 'ASC');
    }

    queryBuilder.skip(skip).take(limit);

    const [kitchenOrders, total] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const paginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };

    return {
      statusCode: 200,
      message: 'Kitchen orders retrieved successfully',
      data: kitchenOrders.map((item) => this.formatKitchenOrderResponse(item)),
      paginationMeta,
    };
  }

  async findOne(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneKitchenOrderResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Kitchen order ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access kitchen orders',
      );
    }

    const kitchenOrder = await this.kitchenOrderRepository.findOne({
      where: {
        id,
        merchant_id: authenticatedUserMerchantId,
        status: KitchenOrderStatus.ACTIVE,
      },
      relations: KITCHEN_ORDER_DETAIL_RELATIONS,
      relationLoadStrategy: 'query',
    });

    if (!kitchenOrder) {
      throw new NotFoundException('Kitchen order not found');
    }

    return {
      statusCode: 200,
      message: 'Kitchen order retrieved successfully',
      data: this.formatKitchenOrderResponse(kitchenOrder),
    };
  }

  async update(
    id: number,
    updateKitchenOrderDto: UpdateKitchenOrderDto,
    authenticatedUserMerchantId: number,
    userId?: number,
  ): Promise<OneKitchenOrderResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Kitchen order ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to update kitchen orders',
      );
    }

    const existingKitchenOrder = await this.kitchenOrderRepository.findOne({
      where: {
        id,
        merchant_id: authenticatedUserMerchantId,
        status: KitchenOrderStatus.ACTIVE,
      },
    });

    if (!existingKitchenOrder) {
      throw new NotFoundException('Kitchen order not found');
    }

    const previousBusinessStatus = existingKitchenOrder.business_status;

    if (existingKitchenOrder.status === KitchenOrderStatus.DELETED) {
      throw new ConflictException('Cannot update a deleted kitchen order');
    }

    if (
      updateKitchenOrderDto.orderId !== undefined ||
      updateKitchenOrderDto.onlineOrderId !== undefined
    ) {
      const newOrderId = updateKitchenOrderDto.orderId;
      const newOnlineOrderId = updateKitchenOrderDto.onlineOrderId;

      if (newOrderId && newOnlineOrderId) {
        throw new BadRequestException(
          'Cannot provide both orderId and onlineOrderId',
        );
      }

      if (newOrderId) {
        const order = await this.orderRepository.findOne({
          where: {
            id: newOrderId,
            merchant_id: authenticatedUserMerchantId,
            logical_status: OrderStatus.ACTIVE,
          },
        });

        if (!order) {
          throw new NotFoundException(
            'Order not found or you do not have access to it',
          );
        }
        existingKitchenOrder.order_id = newOrderId;
        existingKitchenOrder.online_order_id = null;
      } else if (newOnlineOrderId !== undefined) {
        const onlineOrder = await this.onlineOrderRepository
          .createQueryBuilder('onlineOrder')
          .leftJoin('onlineOrder.store', 'store')
          .leftJoin('store.merchant', 'merchant')
          .where('onlineOrder.id = :orderId', { orderId: newOnlineOrderId })
          .andWhere('merchant.id = :merchantId', {
            merchantId: authenticatedUserMerchantId,
          })
          .andWhere('onlineOrder.status != :deletedStatus', {
            deletedStatus: OnlineOrderStatus.DELETED,
          })
          .getOne();

        if (!onlineOrder) {
          throw new NotFoundException(
            'Online order not found or you do not have access to it',
          );
        }
        existingKitchenOrder.online_order_id = newOnlineOrderId;
        existingKitchenOrder.order_id = null;
      } else {
        existingKitchenOrder.order_id = null;
        existingKitchenOrder.online_order_id = null;
      }
    }

    if (updateKitchenOrderDto.stationId !== undefined) {
      if (updateKitchenOrderDto.stationId !== null) {
        const station = await this.kitchenStationRepository.findOne({
          where: {
            id: updateKitchenOrderDto.stationId,
            merchant_id: authenticatedUserMerchantId,
            status: KitchenStationStatus.ACTIVE,
          },
        });

        if (!station) {
          throw new NotFoundException(
            'Kitchen station not found or you do not have access to it',
          );
        }
      }
      existingKitchenOrder.station_id = updateKitchenOrderDto.stationId || null;
    }

    if (updateKitchenOrderDto.priority !== undefined) {
      if (updateKitchenOrderDto.priority < 0) {
        throw new BadRequestException(
          'Priority must be greater than or equal to 0',
        );
      }
      existingKitchenOrder.priority = updateKitchenOrderDto.priority;
    }

    if (updateKitchenOrderDto.businessStatus !== undefined) {
      existingKitchenOrder.business_status =
        updateKitchenOrderDto.businessStatus;

      if (
        updateKitchenOrderDto.businessStatus ===
        KitchenOrderBusinessStatus.STARTED
      ) {
        const startNow = new Date();
        if (!existingKitchenOrder.started_at) {
          existingKitchenOrder.started_at = startNow;
        }
        await this.dataSource.query(
          `UPDATE kitchen_order_item
           SET preparation_status = 'in_preparation',
               hold_until = NULL,
               fired_at = NOW(),
               started_at = COALESCE(started_at, NOW())
           WHERE kitchen_order_id = $1
             AND preparation_status IN ('held', 'pending')`,
          [existingKitchenOrder.id],
        );

        try {
          const eventLogRepo = this.dataSource.getRepository(KitchenEventLog);
          const hasOrderInicio = await eventLogRepo.findOne({
            where: {
              kitchen_order_id: existingKitchenOrder.id,
              kitchen_order_item_id: IsNull(),
              event_type: KitchenEventLogEventType.INICIO,
              status: KitchenEventLogStatus.ACTIVE,
            },
          });
          if (!hasOrderInicio) {
            await eventLogRepo.save(
              eventLogRepo.create({
                kitchen_order_id: existingKitchenOrder.id,
                station_id: existingKitchenOrder.station_id || null,
                event_type: KitchenEventLogEventType.INICIO,
                event_time: existingKitchenOrder.started_at || startNow,
                status: KitchenEventLogStatus.ACTIVE,
                user_id: userId || null,
                message: `Order #${existingKitchenOrder.id} started preparation in kitchen`,
              }),
            );
          }
        } catch (err) {
          console.error('Failed to log INICIO on order start:', err);
        }
      }

      if (
        updateKitchenOrderDto.businessStatus ===
        KitchenOrderBusinessStatus.COMPLETED
      ) {
        const now = new Date();
        if (!existingKitchenOrder.completed_at) {
          existingKitchenOrder.completed_at = now;
        }
        if (!existingKitchenOrder.started_at) {
          existingKitchenOrder.started_at = existingKitchenOrder.created_at || now;
        }

        // Cascada automática: Al dar BUMP a la comanda:
        // 1. Si no tenía evento de INICIO registrado (ej: BUMP directo desde pending), registrar INICIO
        const eventLogRepo = this.dataSource.getRepository(KitchenEventLog);
        try {
          const hasInicio = await eventLogRepo.findOne({
            where: {
              kitchen_order_id: existingKitchenOrder.id,
              kitchen_order_item_id: IsNull(),
              event_type: KitchenEventLogEventType.INICIO,
              status: KitchenEventLogStatus.ACTIVE,
            },
          });
          if (!hasInicio) {
            const startTime = existingKitchenOrder.created_at || now;
            await eventLogRepo.save(
              eventLogRepo.create({
                kitchen_order_id: existingKitchenOrder.id,
                station_id: existingKitchenOrder.station_id || null,
                event_type: KitchenEventLogEventType.INICIO,
                event_time: startTime,
                status: KitchenEventLogStatus.ACTIVE,
                user_id: userId || null,
                message: `Order #${existingKitchenOrder.id} received and started in kitchen`,
              }),
            );
          }
        } catch (err) {
          console.error('Failed to log INICIO on auto-bump:', err);
        }

        // 2. Todos sus ítems pasan automáticamente a READY y se asegura evento INICIO y LISTO
        const itemRepo = this.dataSource.getRepository(KitchenOrderItem);
        const orderItems = await itemRepo.find({
          where: {
            kitchen_order_id: existingKitchenOrder.id,
            status: KitchenOrderItemStatus.ACTIVE,
          },
          relations: ['product'],
        });

        for (const item of orderItems) {
          item.preparation_status = KitchenOrderItemPreparationStatus.READY;
          item.prepared_quantity = item.quantity;
          item.completed_at = now;
          if (!item.started_at) {
            item.started_at = item.created_at || existingKitchenOrder.started_at || existingKitchenOrder.created_at || now;
          }
          await itemRepo.save(item);

          try {
            const productName = item.product?.name || `Item #${item.id}`;

            // Registrar evento LISTO si no existía
            const hasListo = await eventLogRepo.findOne({
              where: {
                kitchen_order_item_id: item.id,
                event_type: KitchenEventLogEventType.LISTO,
                status: KitchenEventLogStatus.ACTIVE,
              },
            });
            if (!hasListo) {
              await eventLogRepo.save(
                eventLogRepo.create({
                  kitchen_order_id: existingKitchenOrder.id,
                  kitchen_order_item_id: item.id,
                  station_id: existingKitchenOrder.station_id || null,
                  event_type: KitchenEventLogEventType.LISTO,
                  event_time: now,
                  status: KitchenEventLogStatus.ACTIVE,
                  user_id: userId || null,
                  message: `Item #${item.id} (${productName}) reached quantity and is READY`,
                }),
              );
            }
          } catch (err) {
            console.error('Failed to log events on item auto-bump:', err);
          }
        }
      }

      // Recall de la orden: Si estaba COMPLETADA y regresa a STARTED
      if (
        previousBusinessStatus === KitchenOrderBusinessStatus.COMPLETED &&
        updateKitchenOrderDto.businessStatus ===
          KitchenOrderBusinessStatus.STARTED
      ) {
        existingKitchenOrder.completed_at = null;

        // Todos sus ítems regresan a PREPARING con 0 preparados
        const itemRepo = this.dataSource.getRepository(KitchenOrderItem);
        const orderItems = await itemRepo.find({
          where: {
            kitchen_order_id: existingKitchenOrder.id,
            status: KitchenOrderItemStatus.ACTIVE,
          },
        });

        for (const item of orderItems) {
          item.preparation_status =
            KitchenOrderItemPreparationStatus.IN_PREPARATION;
          item.prepared_quantity = 0;
          item.completed_at = null;
          await itemRepo.save(item);
        }

        // Auditoría en Event Log
        try {
          const eventLogRepo = this.dataSource.getRepository(KitchenEventLog);
          await eventLogRepo.save(
            eventLogRepo.create({
              kitchen_order_id: existingKitchenOrder.id,
              station_id: existingKitchenOrder.station_id || null,
              event_type: KitchenEventLogEventType.INICIO,
              event_time: new Date(),
              status: KitchenEventLogStatus.ACTIVE,
              user_id: userId || null,
              message: `Order #${existingKitchenOrder.id} recalled back to active preparation line`,
            }),
          );
        } catch (err) {
          console.error('Failed to log RECALL event:', err);
        }
      }
    }

    if (updateKitchenOrderDto.startedAt !== undefined) {
      existingKitchenOrder.started_at = updateKitchenOrderDto.startedAt || null;
    }

    if (updateKitchenOrderDto.completedAt !== undefined) {
      existingKitchenOrder.completed_at =
        updateKitchenOrderDto.completedAt || null;
    }

    if (updateKitchenOrderDto.notes !== undefined) {
      existingKitchenOrder.notes = updateKitchenOrderDto.notes || null;
    }

    const updatedKitchenOrder =
      await this.kitchenOrderRepository.save(existingKitchenOrder);

    if (
      updateKitchenOrderDto.businessStatus !== undefined &&
      updateKitchenOrderDto.businessStatus !== previousBusinessStatus
    ) {
      try {
        const eventLogRepo = this.dataSource.getRepository(KitchenEventLog);
        let eventType: KitchenEventLogEventType | null = null;
        if (
          updateKitchenOrderDto.businessStatus ===
          KitchenOrderBusinessStatus.STARTED
        ) {
          eventType = KitchenEventLogEventType.INICIO;
        } else if (
          updateKitchenOrderDto.businessStatus ===
          KitchenOrderBusinessStatus.COMPLETED
        ) {
          eventType = KitchenEventLogEventType.SERVIDO;
        }

        if (eventType) {
          await eventLogRepo.save(
            eventLogRepo.create({
              kitchen_order_id: updatedKitchenOrder.id,
              station_id: updatedKitchenOrder.station_id || null,
              event_type: eventType,
              event_time: new Date(),
              status: KitchenEventLogStatus.ACTIVE,
              user_id: userId || null,
              message: `Order #${updatedKitchenOrder.id} status transitioned to ${updateKitchenOrderDto.businessStatus}`,
            }),
          );
        }
      } catch (err) {
        console.error('Failed to log kitchen order event:', err);
      }
    }

    const completeKitchenOrder = await this.kitchenOrderRepository.findOne({
      where: { id: updatedKitchenOrder.id },
      relations: KITCHEN_ORDER_DETAIL_RELATIONS,
      relationLoadStrategy: 'query',
    });

    if (!completeKitchenOrder) {
      throw new NotFoundException('Kitchen order not found after update');
    }

    return {
      statusCode: 200,
      message: 'Kitchen order updated successfully',
      data: this.formatKitchenOrderResponse(completeKitchenOrder),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneKitchenOrderResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Kitchen order ID must be a valid positive number',
      );
    }

    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to delete kitchen orders',
      );
    }

    const existingKitchenOrder = await this.kitchenOrderRepository.findOne({
      where: {
        id,
        merchant_id: authenticatedUserMerchantId,
        status: KitchenOrderStatus.ACTIVE,
      },
    });

    if (!existingKitchenOrder) {
      throw new NotFoundException('Kitchen order not found');
    }

    if (existingKitchenOrder.status === KitchenOrderStatus.DELETED) {
      throw new ConflictException('Kitchen order is already deleted');
    }

    existingKitchenOrder.status = KitchenOrderStatus.DELETED;
    await this.kitchenOrderRepository.save(existingKitchenOrder);

    const completeKitchenOrder = await this.kitchenOrderRepository.findOne({
      where: { id: existingKitchenOrder.id },
      relations: KITCHEN_ORDER_DETAIL_RELATIONS,
      relationLoadStrategy: 'query',
    });

    if (!completeKitchenOrder) {
      throw new NotFoundException('Kitchen order not found after deletion');
    }

    return {
      statusCode: 200,
      message: 'Kitchen order deleted successfully',
      data: this.formatKitchenOrderResponse(completeKitchenOrder),
    };
  }

  private suggestStockAction(product: any): StockAdjustmentType {
    if (product.isPrepared) {
      return StockAdjustmentType.WASTE;
    }
    return StockAdjustmentType.RETURN_TO_INVENTORY;
  }

  async cancelKitchenOrder(id: number, dto: CancelKitchenOrderDto, user: any) {
    const existingKitchenOrder = await this.kitchenOrderRepository.findOne({
      where: { id },
      relations: ['kitchenOrderItems', 'kitchenOrderItems.product'],
    });

    if (!existingKitchenOrder) {
      throw new NotFoundException('Kitchen order not found');
    }

    if (
      existingKitchenOrder.status === KitchenOrderStatus.CANCELLED ||
      existingKitchenOrder.business_status === KitchenOrderBusinessStatus.CANCELLED
    ) {
      throw new BadRequestException('Kitchen order already cancelled');
    }

    if (existingKitchenOrder.business_status === KitchenOrderBusinessStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel an already completed kitchen order');
    }

    for (const item of existingKitchenOrder.kitchenOrderItems || []) {
      try {
        const product = item.product;
        if (!product) continue;

        const preparedQty = item.prepared_quantity || 0;
        const rawQty = Math.max(0, item.quantity - preparedQty);

        const stockAction = dto.stockAction || this.suggestStockAction(product);

        if (stockAction === StockAdjustmentType.RETURN_TO_INVENTORY) {
          if (rawQty > 0) {
            await this.productsInventoryService.returnToStock(
              product.id,
              rawQty,
              {
                reason: dto.reason,
                referenceId: existingKitchenOrder.id,
              },
            );
          }

          if (preparedQty > 0) {
            await this.productsInventoryService.registerWaste(
              product.id,
              preparedQty,
              {
                reason: dto.reason,
                referenceId: existingKitchenOrder.id,
              },
            );
          }
        }

        if (stockAction === StockAdjustmentType.WASTE) {
          await this.productsInventoryService.registerWaste(
            product.id,
            item.quantity,
            {
              reason: dto.reason,
              referenceId: existingKitchenOrder.id,
            },
          );
        }
      } catch (stockErr) {
        console.warn('Inventory adjustment skipped or failed during order cancel:', stockErr);
      }
    }

    existingKitchenOrder.business_status = KitchenOrderBusinessStatus.CANCELLED;
    existingKitchenOrder.cancellation_reason =
      dto.reason || KitchenCancellationReason.OTHER;
    existingKitchenOrder.cancelled_by_user_id = user?.id || null;
    existingKitchenOrder.cancelled_at = new Date();
    if (dto.notes) {
      existingKitchenOrder.notes = existingKitchenOrder.notes
        ? `${existingKitchenOrder.notes} | Cancellation Note: ${dto.notes}`
        : `Cancellation Note: ${dto.notes}`;
    }

    const savedOrder =
      await this.kitchenOrderRepository.save(existingKitchenOrder);

    // Retirar los ítems de la comanda cancelada de la línea de producción
    const itemRepo = this.dataSource.getRepository(KitchenOrderItem);
    for (const item of existingKitchenOrder.kitchenOrderItems || []) {
      item.status = KitchenOrderItemStatus.DELETED;
      await itemRepo.save(item);
    }

    try {
      const eventLogRepo = this.dataSource.getRepository(KitchenEventLog);
      const hasInicio = await eventLogRepo.findOne({
        where: {
          kitchen_order_id: existingKitchenOrder.id,
          event_type: KitchenEventLogEventType.INICIO,
          status: KitchenEventLogStatus.ACTIVE,
        },
      });
      if (!hasInicio) {
        await eventLogRepo.save(
          eventLogRepo.create({
            kitchen_order_id: existingKitchenOrder.id,
            station_id: existingKitchenOrder.station_id || null,
            event_type: KitchenEventLogEventType.INICIO,
            event_time: existingKitchenOrder.created_at || new Date(),
            status: KitchenEventLogStatus.ACTIVE,
            user_id: user?.id || null,
            message: `Order #${existingKitchenOrder.id} received in kitchen`,
          }),
        );
      }

      await eventLogRepo.save(
        eventLogRepo.create({
          kitchen_order_id: existingKitchenOrder.id,
          station_id: existingKitchenOrder.station_id || null,
          event_type: KitchenEventLogEventType.CANCELADO,
          event_time: new Date(),
          status: KitchenEventLogStatus.ACTIVE,
          user_id: user?.id || null,
          message: dto.reason
            ? `Order cancelled. Reason: ${dto.reason}`
            : `Kitchen order #${existingKitchenOrder.id} cancelled`,
        }),
      );
    } catch (err) {
      console.error('Failed to log kitchen order cancellation event:', err);
    }

    return savedOrder;
  }

  private formatKitchenOrderResponse(
    kitchenOrder: KitchenOrder,
  ): KitchenOrderResponseDto {
    if (!kitchenOrder.merchant) {
      throw new Error('Merchant relation is not loaded for kitchen order');
    }

    const base: KitchenOrderResponseDto = {
      id: kitchenOrder.id,
      merchantId: kitchenOrder.merchant_id,
      orderId: kitchenOrder.order_id,
      onlineOrderId: kitchenOrder.online_order_id,
      stationId: kitchenOrder.station_id,
      priority: kitchenOrder.priority,
      businessStatus: kitchenOrder.business_status,
      startedAt: kitchenOrder.started_at,
      completedAt: kitchenOrder.completed_at,
      cancelledAt: kitchenOrder.cancelled_at,
      cancellationReason: kitchenOrder.cancellation_reason,
      cancelledByUserId: kitchenOrder.cancelled_by_user_id,
      notes: kitchenOrder.notes,
      status: kitchenOrder.status,
      createdAt: kitchenOrder.created_at,
      updatedAt: kitchenOrder.updated_at,
      merchant: {
        id: kitchenOrder.merchant.id,
        name: kitchenOrder.merchant.name,
      },
      order: kitchenOrder.order
        ? {
            id: kitchenOrder.order.id,
            status: kitchenOrder.order.status,
          }
        : null,
      onlineOrder: kitchenOrder.onlineOrder
        ? {
            id: kitchenOrder.onlineOrder.id,
            status: kitchenOrder.onlineOrder.status,
          }
        : null,
      station: kitchenOrder.station
        ? {
            id: kitchenOrder.station.id,
            name: kitchenOrder.station.name,
          }
        : null,
    };

    if (kitchenOrder.kitchenOrderItems?.length) {
      base.kitchenOrderItems = kitchenOrder.kitchenOrderItems
        .filter((i) => i.status !== KitchenOrderItemStatus.DELETED)
        .map((i) => this.formatKitchenOrderItemLine(kitchenOrder, i));
    }

    return base;
  }

  private formatKitchenOrderItemLine(
    kitchenOrder: KitchenOrder,
    kitchenOrderItem: KitchenOrderItem,
  ): KitchenOrderItemResponseDto {
    if (!kitchenOrderItem.product) {
      throw new Error('Product relation is not loaded for kitchen order item');
    }
    return {
      id: kitchenOrderItem.id,
      kitchenOrderId: kitchenOrderItem.kitchen_order_id,
      orderItemId: kitchenOrderItem.order_item_id,
      productId: kitchenOrderItem.product_id,
      variantId: kitchenOrderItem.variant_id,
      quantity: kitchenOrderItem.quantity,
      preparedQuantity: kitchenOrderItem.prepared_quantity,
      preparationStatus: kitchenOrderItem.preparation_status,
      course: kitchenOrderItem.course || KitchenCourse.MAIN_COURSE,
      holdUntil: kitchenOrderItem.hold_until || null,
      firedAt: kitchenOrderItem.fired_at || null,
      status: kitchenOrderItem.status,
      startedAt: kitchenOrderItem.started_at,
      completedAt: kitchenOrderItem.completed_at,
      notes: kitchenOrderItem.notes,
      createdAt: kitchenOrderItem.created_at,
      updatedAt: kitchenOrderItem.updated_at,
      kitchenOrder: {
        id: kitchenOrder.id,
      },
      orderItem: kitchenOrderItem.orderItem
        ? {
            id: kitchenOrderItem.orderItem.id,
          }
        : null,
      product: {
        id: kitchenOrderItem.product.id,
        name: kitchenOrderItem.product.name || '',
      },
      variant: kitchenOrderItem.variant
        ? {
            id: kitchenOrderItem.variant.id,
            name: kitchenOrderItem.variant.name || '',
          }
        : null,
    };
  }
}
