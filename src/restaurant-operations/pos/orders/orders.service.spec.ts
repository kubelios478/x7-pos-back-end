/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { CashShift } from '../../cashdrawer/cash-shifts/entities/cash-shift.entity';
import { CashShiftMovementType } from '../../cashdrawer/cash-shifts/constants/cash-shift-movement-type.enum';
import { CashFlowService } from '../../cashdrawer/cash-shifts/cash-flow.service';
import { MerchantLockScope } from 'src/common/utils/merchant-lock.util';
import { LoyaltyPointTransaction } from 'src/growth/loyalty/loyalty-points-transaction/entities/loyalty-points-transaction.entity';
import { LoyaltyCustomer } from 'src/growth/loyalty/loyalty-customer/entities/loyalty-customer.entity';
import { ReceiptsService } from 'src/core/billing-transactions/receipts/receipts.service';
import { Receipt } from 'src/core/billing-transactions/receipts/entities/receipt.entity';
import { MerchantTaxRule } from 'src/core/configuration/merchant-tax-rule/entity/merchant-tax-rule.entity';
import { MerchantTipRule } from 'src/core/configuration/merchant-tip-rule/entity/merchant-tip-rule-entity';
import { TipSettlement } from 'src/restaurant-operations/tips/tip-settlements/entities/tip-settlement.entity';
import { ShiftsService } from 'src/restaurant-operations/shift/shifts/shifts.service';
import { Product } from 'src/inventory/products-inventory/products/entities/product.entity';
import {
  Repository,
  UpdateResult,
  type DeepPartial,
  DataSource,
  EntityManager,
} from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { Table } from '../../../restaurant-operations/dining-system/tables/entities/table.entity';
import { Collaborator } from '../../../finance-hr/hr/collaborators/entities/collaborator.entity';
import { MerchantSubscription } from '../../../platform-saas/subscriptions/merchant-subscriptions/entities/merchant-subscription.entity';
import { Customer } from '../../../core/business-partners/customers/entities/customer.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { GetOrdersQueryDto, OrderSortBy } from './dto/get-orders-query.dto';
import { OrderStatus } from './constants/order-status.enum';
import { OrderBusinessStatus } from './constants/order-business-status.enum';
import { OrderType } from './constants/order-type.enum';
import { OrderItem } from '../order-item/entities/order-item.entity';
import { OrderPayment } from '../order-payments/entities/order-payment.entity';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import type { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { OrderTax } from '../order-taxes/entities/order-tax.entity';
import { OrderItemModifier } from '../order-item-modifiers/entities/order-item-modifier.entity';
import { OrderItemStatus } from '../order-item/constants/order-item-status.enum';
import { OrderSource } from './constants/order-source.enum';
import { DeliveryStatus } from './constants/delivery-status.enum';
import { KitchenStatus } from './constants/kitchen-status.enum';
import { OnlineOrderSyncService } from '../../../commerce/online-ordering-system/online-order/online-order-sync.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ORDER_FULLY_PAID_EVENT } from '../../../inventory/sale-inventory/order-paid.events';

describe('OrdersService', () => {
  const mockOnlineOrderSyncService = {
    syncFromPosOrder: jest.fn().mockResolvedValue(undefined),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  // processPayment / refundOrder move cash through the drawer
  const mockCashFlowService = {
    addMovement: jest.fn().mockResolvedValue(undefined),
  };

  let service: OrdersService;
  let orderRepository: Repository<Order>;
  let merchantRepository: Repository<Merchant>;
  let tableRepository: Repository<Table>;
  let collaboratorRepository: Repository<Collaborator>;
  let subscriptionRepository: Repository<MerchantSubscription>;
  let customerRepository: Repository<Customer>;
  let orderItemRepository: Repository<OrderItem>;
  let orderPaymentRepository: Repository<OrderPayment>;
  let orderTaxRepository: Repository<OrderTax>;
  let orderItemModifierRepository: Repository<OrderItemModifier>;

  const mockOrderQbForOrderNumber = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ maxn: null }),
  };

  const mockOrderRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    // generateDailyTicketId() counts today's orders
    count: jest.fn().mockResolvedValue(0),
    findAndCount: jest.fn(),
    update: jest.fn(),
    manager: {
      // new orders are numbered and inserted in a transaction holding an advisory lock
      transaction: (work: (manager: unknown) => unknown) =>
        work(mockOrderRepository.manager),
      query: jest.fn().mockResolvedValue([]),
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Order) {
          return {
            findOne: (opts: unknown) => mockOrderRepository.findOne(opts),
            save: (opts: unknown) => mockOrderRepository.save(opts),
            count: (opts: unknown) => mockOrderRepository.count(opts),
            createQueryBuilder: jest.fn(() => mockOrderQbForOrderNumber),
          };
        }
        if (entity === OrderItem) {
          return {
            find: (opts: unknown) => mockOrderItemRepository.find(opts),
          };
        }
        if (entity === OrderPayment) {
          return {
            find: (opts: unknown) => mockOrderPaymentRepository.find(opts),
          };
        }
        if (entity === OrderTax) {
          return {
            find: (opts: unknown) => mockOrderTaxRepository.find(opts),
          };
        }
        return {
          createQueryBuilder: jest.fn(() => mockOrderQbForOrderNumber),
        };
      }),
    },
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ maxn: null }),
    })),
  };

  const mockOrderItemRepository = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockOrderPaymentRepository = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockOrderTaxRepository = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockOrderItemModifierRepository = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockMerchantRepository = {
    findOne: jest.fn(),
  };

  const mockTableRepository = {
    findOne: jest.fn(),
  };

  const mockCollaboratorRepository = {
    findOne: jest.fn(),
  };

  const mockSubscriptionRepository = {
    findOne: jest.fn(),
  };

  const mockCustomerRepository = {
    findOne: jest.fn(),
  };

  const mockMerchant = {
    id: 1,
    name: 'Test Merchant',
  };

  const mockTable = {
    id: 1,
    merchant_id: 1,
    name: 'Table 1',
  };

  const mockCollaborator = {
    id: 1,
    merchant_id: 1,
    name: 'John Doe',
  };

  const mockSubscription = {
    id: 1,
    merchant: {
      id: 1,
    },
  };

  const mockCustomer = {
    id: 1,
    merchantId: 1,
    name: 'John Doe',
  };

  const mockOrder = {
    id: 1,
    merchant_id: 1,
    table_id: 1,
    collaborator_id: 1,
    subscription_id: 1,
    status: OrderBusinessStatus.PENDING,
    type: OrderType.DINE_IN,
    customer_id: 1,
    logical_status: OrderStatus.ACTIVE,
    closed_at: null,
    created_at: new Date('2024-01-15T08:00:00Z'),
    updated_at: new Date('2024-01-15T08:00:00Z'),
    order_number: '000001',
    source: OrderSource.POS,
    guest_count: 1,
    subtotal: 0,
    tax_total: 0,
    discount_total: 0,
    manual_tip_total: 0,
    tip_total: 0,
    total: 0,
    paid_total: 0,
    balance_due: 0,
    is_paid: true,
    delivery_address: null,
    delivery_zone_id: null,
    delivery_fee: 0,
    delivery_status: DeliveryStatus.UNASSIGNED,
    kitchen_status: KitchenStatus.PENDING,
    ready_at: null,
    preparing_at: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepository,
        },
        {
          provide: getRepositoryToken(Table),
          useValue: mockTableRepository,
        },
        {
          provide: getRepositoryToken(Collaborator),
          useValue: mockCollaboratorRepository,
        },
        {
          provide: getRepositoryToken(MerchantSubscription),
          useValue: mockSubscriptionRepository,
        },
        {
          provide: getRepositoryToken(Customer),
          useValue: mockCustomerRepository,
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: mockOrderItemRepository,
        },
        {
          provide: getRepositoryToken(OrderPayment),
          useValue: mockOrderPaymentRepository,
        },
        {
          provide: getRepositoryToken(OrderTax),
          useValue: mockOrderTaxRepository,
        },
        {
          provide: getRepositoryToken(OrderItemModifier),
          useValue: mockOrderItemModifierRepository,
        },
        {
          provide: OnlineOrderSyncService,
          useValue: mockOnlineOrderSyncService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        { provide: CashFlowService, useValue: mockCashFlowService },

        {
          // El servicio ganó esta dependencia y el spec nunca la registró: el módulo
          // de pruebas no compilaba y la suite entera contaba como fallo.
          provide: getRepositoryToken(Product),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            findBy: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },

        {
          // Dependencia que el servicio ganó y este spec nunca registró.
          provide: ShiftsService,
          useValue: {
            // create() and payment flows attach the order to the active shift
            findActiveShiftByMerchant: jest.fn().mockResolvedValue({ id: 1 }),
            getShiftCollaborators: jest.fn().mockResolvedValue([]),
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },

        {
          // Dependencia que el servicio ganó y este spec nunca registró.
          provide: getRepositoryToken(TipSettlement),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            findBy: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },

        {
          // El servicio ejecuta transacciones; el spec nunca registró el DataSource.
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
            createQueryRunner: jest.fn(),
            getRepository: jest.fn(),
            query: jest.fn(),
          },
        },

        {
          // Dependencia que el servicio ganó y este spec nunca registró.
          provide: getRepositoryToken(MerchantTipRule),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            findBy: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },

        {
          // Dependencia que el servicio ganó y este spec nunca registró.
          provide: getRepositoryToken(MerchantTaxRule),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            findBy: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },

        {
          // Dependencia que el servicio ganó y este spec nunca registró.
          provide: getRepositoryToken(Receipt),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            findBy: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },

        {
          // Dependencia que el servicio ganó y este spec nunca registró.
          provide: ReceiptsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },

        {
          // Dependencia que el servicio ganó y este spec nunca registró.
          provide: getRepositoryToken(LoyaltyCustomer),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            findBy: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },

        {
          // Dependencia que el servicio ganó y este spec nunca registró.
          provide: getRepositoryToken(LoyaltyPointTransaction),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    merchantRepository = module.get<Repository<Merchant>>(
      getRepositoryToken(Merchant),
    );
    tableRepository = module.get<Repository<Table>>(getRepositoryToken(Table));
    collaboratorRepository = module.get<Repository<Collaborator>>(
      getRepositoryToken(Collaborator),
    );
    subscriptionRepository = module.get<Repository<MerchantSubscription>>(
      getRepositoryToken(MerchantSubscription),
    );
    customerRepository = module.get<Repository<Customer>>(
      getRepositoryToken(Customer),
    );
    orderItemRepository = module.get<Repository<OrderItem>>(
      getRepositoryToken(OrderItem),
    );
    orderPaymentRepository = module.get<Repository<OrderPayment>>(
      getRepositoryToken(OrderPayment),
    );
    orderTaxRepository = module.get<Repository<OrderTax>>(
      getRepositoryToken(OrderTax),
    );
    orderItemModifierRepository = module.get<Repository<OrderItemModifier>>(
      getRepositoryToken(OrderItemModifier),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrderForOnlineAcceptance', () => {
    it('does not require a merchant subscription', async () => {
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as unknown as Table);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as Collaborator);
      // the old lookup went through createQueryBuilder, which this mock lacks
      const subscriptionQuery = jest.fn();
      Object.assign(subscriptionRepository, {
        createQueryBuilder: subscriptionQuery,
      });
      jest
        .spyOn(
          service as unknown as {
            nextOrderNumberWithManager: () => Promise<string>;
          },
          'nextOrderNumberWithManager',
        )
        .mockResolvedValue('000001');
      jest
        .spyOn(orderRepository, 'save')
        .mockImplementation((o) => Promise.resolve(o as Order));

      const order = await service.createOrderForOnlineAcceptance({
        merchantId: 1,
        customerId: 1,
        orderType: OrderType.DELIVERY,
        deliveryAddress: 'Main St 1',
        deliveryFee: 2,
      });

      expect(subscriptionQuery).not.toHaveBeenCalled();
      expect(order.merchant_id).toBe(1);
      expect(order.order_number).toBe('000001');
    });
  });

  describe('create', () => {
    const createOrderDto: CreateOrderDto = {
      merchantId: 1,
      tableId: 1,
      collaboratorId: 1,
      subscriptionId: 1,
      businessStatus: OrderBusinessStatus.PENDING,
      type: OrderType.DINE_IN,
      customerId: 1,
    };

    it('numbers the order under the merchant order-numbering lock', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as unknown as Table);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as Collaborator);
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription as MerchantSubscription);
      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(mockCustomer as Customer);
      jest.spyOn(orderRepository, 'save').mockResolvedValue(mockOrder as Order);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as Order);
      mockOrderRepository.manager.query.mockClear();
      mockOrderRepository.count.mockClear();

      await service.create(createOrderDto, 1);

      expect(mockOrderRepository.manager.query).toHaveBeenCalledWith(
        'SELECT pg_advisory_xact_lock($1, $2)',
        [MerchantLockScope.ORDER_NUMBERS, 1],
      );
      // lock first, then the daily ticket COUNT, then the insert
      const lockedAt =
        mockOrderRepository.manager.query.mock.invocationCallOrder[0];
      expect(lockedAt).toBeLessThan(
        mockOrderRepository.count.mock.invocationCallOrder[0],
      );
      expect(lockedAt).toBeLessThan(
        (orderRepository.save as jest.Mock).mock.invocationCallOrder[0],
      );
    });

    it('should create an order successfully', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as unknown as Table);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as Collaborator);
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription as MerchantSubscription);
      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(mockCustomer as Customer);
      jest.spyOn(orderRepository, 'save').mockResolvedValue(mockOrder as Order);
      // create() reloads the saved order with its relations
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as Order);

      const result = await service.create(createOrderDto, 1);

      expect(merchantRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(tableRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(collaboratorRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(subscriptionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(customerRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(orderRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Order created successfully');
      expect(result.data.id).toBe(1);
    });

    it('creates an order without a merchant subscription (company subscription gates access)', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as unknown as Table);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as Collaborator);
      const subscriptionLookup = jest.spyOn(subscriptionRepository, 'findOne');
      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(mockCustomer as Customer);
      const save = jest
        .spyOn(orderRepository, 'save')
        .mockResolvedValue(mockOrder as Order);
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as Order);

      const result = await service.create(
        { ...createOrderDto, subscriptionId: undefined },
        1,
      );

      expect(result.statusCode).toBe(201);
      expect(subscriptionLookup).not.toHaveBeenCalled();
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({ subscription_id: null }),
      );
    });

    it('rejects a dine_in order without a table', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);

      await expect(
        service.create({ ...createOrderDto, tableId: undefined }, 1),
      ).rejects.toThrow('tableId is required for dine_in orders');
      expect(tableRepository.findOne).not.toHaveBeenCalled();
    });

    it.each([OrderType.TAKE_OUT, OrderType.DELIVERY])(
      'does not look up a table for a %s order without one',
      async (type) => {
        jest
          .spyOn(merchantRepository, 'findOne')
          .mockResolvedValue(mockMerchant as Merchant);
        // Stop right after the table step: the collaborator lookup comes next.
        jest.spyOn(collaboratorRepository, 'findOne').mockResolvedValue(null);

        await expect(
          service.create({ ...createOrderDto, type, tableId: undefined }, 1),
        ).rejects.toThrow('Collaborator with ID 1 not found');
        expect(tableRepository.findOne).not.toHaveBeenCalled();
      },
    );

    it('should create an order with closedAt', async () => {
      const dtoWithClosedAt: CreateOrderDto = {
        ...createOrderDto,
        closedAt: '2024-01-15T10:00:00Z',
      };
      const orderWithClosedAt = {
        ...mockOrder,
        closed_at: new Date('2024-01-15T10:00:00Z'),
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as unknown as Table);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as Collaborator);
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription as MerchantSubscription);
      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(mockCustomer as Customer);
      jest
        .spyOn(orderRepository, 'save')
        .mockResolvedValue(orderWithClosedAt as Order);
      // create() reloads the saved order with its relations
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(orderWithClosedAt as Order);

      const result = await service.create(dtoWithClosedAt, 1);

      expect(result.statusCode).toBe(201);
      expect(result.data.closedAt).toEqual(new Date('2024-01-15T10:00:00Z'));
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.create(createOrderDto, 0)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createOrderDto, 0)).rejects.toThrow(
        'You must be associated with a merchant',
      );
    });

    it('should throw ForbiddenException when merchantId does not match authenticated user merchant', async () => {
      const dtoWithDifferentMerchant: CreateOrderDto = {
        ...createOrderDto,
        merchantId: 2,
      };

      await expect(service.create(dtoWithDifferentMerchant, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(dtoWithDifferentMerchant, 1)).rejects.toThrow(
        'You can only create orders for your own merchant',
      );
    });

    it('should throw NotFoundException if merchant not found', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        `Merchant with ID ${createOrderDto.merchantId} not found`,
      );
    });

    it('should throw NotFoundException if table not found', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest.spyOn(tableRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        `Table with ID ${createOrderDto.tableId} not found`,
      );
    });

    it('should throw ForbiddenException if table belongs to different merchant', async () => {
      const tableFromDifferentMerchant = {
        ...mockTable,
        merchant_id: 2,
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(tableFromDifferentMerchant as unknown as Table);

      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        'Table does not belong to your merchant',
      );
    });

    it('should throw NotFoundException if collaborator not found', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as unknown as Table);
      jest.spyOn(collaboratorRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        `Collaborator with ID ${createOrderDto.collaboratorId} not found`,
      );
    });

    it('should throw ForbiddenException if collaborator belongs to different merchant', async () => {
      const collaboratorFromDifferentMerchant = {
        ...mockCollaborator,
        merchant_id: 2,
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as unknown as Table);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(collaboratorFromDifferentMerchant as Collaborator);

      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        'Collaborator does not belong to your merchant',
      );
    });

    it('should throw NotFoundException if subscription not found', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as unknown as Table);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as Collaborator);
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        `Subscription with ID ${createOrderDto.subscriptionId} not found`,
      );
    });

    it('should throw ForbiddenException if subscription belongs to different merchant', async () => {
      const subscriptionFromDifferentMerchant = {
        ...mockSubscription,
        merchant: {
          id: 2,
        },
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as unknown as Table);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as Collaborator);
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(
          subscriptionFromDifferentMerchant as MerchantSubscription,
        );

      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        'Subscription does not belong to your merchant',
      );
    });

    it('should throw NotFoundException if customer not found', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as unknown as Table);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as Collaborator);
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription as MerchantSubscription);
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        `Customer with ID ${createOrderDto.customerId} not found`,
      );
    });

    it('should throw ForbiddenException if customer belongs to different merchant', async () => {
      const customerFromDifferentMerchant = {
        ...mockCustomer,
        merchantId: 2,
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as unknown as Table);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as Collaborator);
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription as MerchantSubscription);
      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(customerFromDifferentMerchant as Customer);

      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createOrderDto, 1)).rejects.toThrow(
        'Customer does not belong to your merchant',
      );
    });

    it('should throw BadRequestException if closedAt is invalid date format', async () => {
      const dtoWithInvalidDate: CreateOrderDto = {
        ...createOrderDto,
        closedAt: 'invalid-date',
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as unknown as Table);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as Collaborator);
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription as MerchantSubscription);
      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(mockCustomer as Customer);

      await expect(service.create(dtoWithInvalidDate, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithInvalidDate, 1)).rejects.toThrow(
        'Invalid closedAt date format',
      );
    });
  });

  describe('completePurchase', () => {
    const deliveryOrder = () => ({
      id: 1,
      merchant_id: 1,
      type: OrderType.DELIVERY,
      delivery_zone_id: 4,
      status: OrderBusinessStatus.PENDING,
      subtotal: 8,
      discount_total: 0,
      delivery_fee: 3,
      orderItems: [{ total_price: 8 }],
    });
    const admin = { role: 'merchant_admin' } as never;

    it('blocks a delivery checkout below the zone minimum order, with the shortfall', async () => {
      mockOrderRepository.findOne.mockResolvedValue(deliveryOrder());
      (service as any).dataSource.query.mockResolvedValue([
        { min_order_amount: '10.99' },
      ]);
      await expect(
        service.completePurchase(1, {} as never, admin),
      ).rejects.toThrow(
        new BadRequestException(
          'Add $2.99 more to reach the $10.99 minimum order for delivery',
        ),
      );
      expect((service as any).dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('delivery_fees'),
        [4, 1],
      );
    });

    it('skips the minimum check for non-delivery orders', async () => {
      mockOrderRepository.findOne.mockResolvedValue({
        ...deliveryOrder(),
        type: OrderType.DINE_IN,
      });
      await service
        .completePurchase(1, {} as never, admin)
        .catch(() => undefined);
      expect((service as any).dataSource.query).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const query: GetOrdersQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated orders successfully', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 1] as [Order[], number]);

      const result = await service.findAll(query, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Orders retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
      expect(result.paginationMeta.total).toBe(1);
    });

    it('should filter by merchant_id automatically', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 1] as [Order[], number]);

      await service.findAll(query, 1);

      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ merchant_id: 1 }),
        }),
      );
    });

    it('should filter by tableId when provided', async () => {
      const queryWithTableId = { ...query, tableId: 1 };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(mockTable as unknown as Table);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 1] as [Order[], number]);

      await service.findAll(queryWithTableId, 1);

      expect(tableRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ table_id: 1 }),
        }),
      );
    });

    it('should filter by collaboratorId when provided', async () => {
      const queryWithCollaboratorId = { ...query, collaboratorId: 1 };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(mockCollaborator as Collaborator);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 1] as [Order[], number]);

      await service.findAll(queryWithCollaboratorId, 1);

      expect(collaboratorRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ collaborator_id: 1 }),
        }),
      );
    });

    it('should filter by customerId when provided', async () => {
      const queryWithCustomerId = { ...query, customerId: 1 };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(mockCustomer as Customer);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 1] as [Order[], number]);

      await service.findAll(queryWithCustomerId, 1);

      expect(customerRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ customer_id: 1 }),
        }),
      );
    });

    it('should filter by businessStatus when provided', async () => {
      const queryWithBusinessStatus = {
        ...query,
        businessStatus: OrderBusinessStatus.PENDING,
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 1] as [Order[], number]);

      await service.findAll(queryWithBusinessStatus, 1);

      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: OrderBusinessStatus.PENDING,
          }),
        }),
      );
    });

    it('should filter by type when provided', async () => {
      const queryWithType = { ...query, type: OrderType.DINE_IN };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 1] as [Order[], number]);

      await service.findAll(queryWithType, 1);

      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: OrderType.DINE_IN }),
        }),
      );
    });

    it('should filter by status when provided', async () => {
      const queryWithStatus = { ...query, status: OrderStatus.ACTIVE };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 1] as [Order[], number]);

      await service.findAll(queryWithStatus, 1);

      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            logical_status: OrderStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should filter by createdDate when provided', async () => {
      const queryWithDate = { ...query, createdDate: '2024-01-15' };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 1] as [Order[], number]);

      await service.findAll(queryWithDate, 1);

      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            created_at: expect.any(Object), // Between object
          }),
        }),
      );
    });

    it('should sort by createdAt DESC by default', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 1] as [Order[], number]);

      await service.findAll(query, 1);

      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { created_at: 'DESC' },
        }),
      );
    });

    it('should sort by specified sortBy and sortOrder', async () => {
      const queryWithSort = {
        ...query,
        sortBy: OrderSortBy.CLOSED_AT,
        sortOrder: 'ASC' as const,
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 1] as [Order[], number]);

      await service.findAll(queryWithSort, 1);

      expect(orderRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { closed_at: 'ASC' },
        }),
      );
    });

    it('should use default page and limit when not provided', async () => {
      const emptyQuery = {};
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 1] as [Order[], number]);

      const result = await service.findAll(emptyQuery, 1);

      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findAll(query, 0)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findAll(query, 0)).rejects.toThrow(
        'You must be associated with a merchant',
      );
    });

    it('should throw NotFoundException if merchant not found', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findAll(query, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findAll(query, 1)).rejects.toThrow(
        'Merchant with ID 1 not found',
      );
    });

    it('should throw BadRequestException when page is less than 1', async () => {
      const invalidQuery = { ...query, page: -1 };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);

      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        'Page must be >= 1',
      );
    });

    it('should throw BadRequestException when limit is less than 1', async () => {
      const invalidQuery = { ...query, limit: -1 };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);

      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        'Limit must be between 1 and 100',
      );
    });

    it('should throw BadRequestException when limit exceeds 100', async () => {
      const invalidQuery = { ...query, limit: 101 };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);

      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll(invalidQuery, 1)).rejects.toThrow(
        'Limit must be between 1 and 100',
      );
    });

    it('should throw ForbiddenException if tableId provided but table belongs to different merchant', async () => {
      const queryWithTableId = { ...query, tableId: 1 };
      const tableFromDifferentMerchant = {
        ...mockTable,
        merchant_id: 2,
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(tableFromDifferentMerchant as unknown as Table);

      await expect(service.findAll(queryWithTableId, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findAll(queryWithTableId, 1)).rejects.toThrow(
        'Table does not belong to your merchant',
      );
    });

    it('should throw ForbiddenException if collaboratorId provided but collaborator belongs to different merchant', async () => {
      const queryWithCollaboratorId = { ...query, collaboratorId: 1 };
      const collaboratorFromDifferentMerchant = {
        ...mockCollaborator,
        merchant_id: 2,
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(collaboratorFromDifferentMerchant as Collaborator);

      await expect(service.findAll(queryWithCollaboratorId, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findAll(queryWithCollaboratorId, 1)).rejects.toThrow(
        'Collaborator does not belong to your merchant',
      );
    });

    it('should throw ForbiddenException if customerId provided but customer belongs to different merchant', async () => {
      const queryWithCustomerId = { ...query, customerId: 1 };
      const customerFromDifferentMerchant = {
        ...mockCustomer,
        merchantId: 2,
      };
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(customerFromDifferentMerchant as Customer);

      await expect(service.findAll(queryWithCustomerId, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findAll(queryWithCustomerId, 1)).rejects.toThrow(
        'Customer does not belong to your merchant',
      );
    });

    it('should calculate pagination metadata correctly', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue(mockMerchant as Merchant);
      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([[mockOrder], 25] as [Order[], number]);

      const result = await service.findAll({ page: 2, limit: 10 }, 1);

      expect(result.paginationMeta.total).toBe(25);
      expect(result.paginationMeta.totalPages).toBe(3);
      expect(result.paginationMeta.hasNext).toBe(true);
      expect(result.paginationMeta.hasPrev).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return an order successfully', async () => {
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as Order);

      const result = await service.findOne(1, 1);

      expect(orderRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, logical_status: OrderStatus.ACTIVE },
        }),
      );
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Order retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findOne(0, 1)).rejects.toThrow('Invalid id');
    });

    it('should throw BadRequestException when id is negative', async () => {
      await expect(service.findOne(-1, 1)).rejects.toThrow(BadRequestException);
      await expect(service.findOne(-1, 1)).rejects.toThrow('Invalid id');
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findOne(1, 0)).rejects.toThrow(ForbiddenException);
      await expect(service.findOne(1, 0)).rejects.toThrow(
        'You must be associated with a merchant',
      );
    });

    it('should throw NotFoundException if order not found', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999, 1)).rejects.toThrow('Order not found');
    });

    it('should throw ForbiddenException if order belongs to different merchant', async () => {
      const orderFromDifferentMerchant = {
        ...mockOrder,
        merchant_id: 2,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(orderFromDifferentMerchant as Order);

      await expect(service.findOne(1, 1)).rejects.toThrow(ForbiddenException);
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'You can only access orders from your merchant',
      );
    });
  });

  describe('update', () => {
    const updateOrderDto: UpdateOrderDto = {
      businessStatus: OrderBusinessStatus.COMPLETED,
      type: OrderType.TAKE_OUT,
    };

    beforeEach(() => {
      jest
        .spyOn(orderRepository, 'save')
        .mockImplementation(
          async (o: Parameters<Repository<Order>['save']>[0]) =>
            ({ ...mockOrder, ...o }) as Order,
        );
      jest.spyOn(orderItemRepository, 'find').mockResolvedValue([]);
    });

    it('should update an order successfully', async () => {
      const updatedOrder = {
        ...mockOrder,
        status: OrderBusinessStatus.COMPLETED,
        type: OrderType.TAKE_OUT,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(updatedOrder as Order);
      jest.spyOn(orderRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);

      const result = await service.update(1, updateOrderDto, 1);

      expect(orderRepository.update).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Order updated successfully');
      expect(result.data.businessStatus).toBe(OrderBusinessStatus.COMPLETED);
    });

    it('should update tableId when provided', async () => {
      const dtoWithTableId: UpdateOrderDto = { tableId: 2 };
      const newTable = { ...mockTable, id: 2 };
      const updatedOrder = { ...mockOrder, table_id: 2 };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(updatedOrder as Order);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(newTable as unknown as Table);
      jest.spyOn(orderRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);

      await service.update(1, dtoWithTableId, 1);

      expect(tableRepository.findOne).toHaveBeenCalledWith({
        where: { id: 2 },
      });
      expect(orderRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ table_id: 2 }),
      );
    });

    it('clears the table when a take_out order sends tableId null', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue({
        ...mockOrder,
        type: OrderType.TAKE_OUT,
      } as Order);
      jest.spyOn(orderRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);

      await service.update(1, { tableId: null }, 1);

      expect(tableRepository.findOne).not.toHaveBeenCalled();
      expect(orderRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ table_id: null }),
      );
    });

    it('rejects turning an order without a table into dine_in', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue({
        ...mockOrder,
        type: OrderType.DELIVERY,
        table_id: null,
      } as Order);

      await expect(
        service.update(1, { type: OrderType.DINE_IN }, 1),
      ).rejects.toThrow('tableId is required for dine_in orders');
    });

    it('should update collaboratorId when provided', async () => {
      const dtoWithCollaboratorId: UpdateOrderDto = { collaboratorId: 2 };
      const newCollaborator = { ...mockCollaborator, id: 2 };
      const updatedOrder = { ...mockOrder, collaborator_id: 2 };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(updatedOrder as Order);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(newCollaborator as Collaborator);
      jest.spyOn(orderRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);

      await service.update(1, dtoWithCollaboratorId, 1);

      expect(collaboratorRepository.findOne).toHaveBeenCalledWith({
        where: { id: 2 },
      });
      expect(orderRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ collaborator_id: 2 }),
      );
    });

    it('should update customerId when provided', async () => {
      const dtoWithCustomerId: UpdateOrderDto = { customerId: 2 };
      const newCustomer = { ...mockCustomer, id: 2 };
      const updatedOrder = { ...mockOrder, customer_id: 2 };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(updatedOrder as Order);
      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(newCustomer as Customer);
      jest.spyOn(orderRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);

      await service.update(1, dtoWithCustomerId, 1);

      expect(customerRepository.findOne).toHaveBeenCalledWith({
        where: { id: 2 },
      });
      expect(orderRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ customer_id: 2 }),
      );
    });

    it('should update closedAt when provided', async () => {
      const dtoWithClosedAt: UpdateOrderDto = {
        closedAt: '2024-01-15T10:00:00Z',
      };
      const updatedOrder = {
        ...mockOrder,
        closed_at: new Date('2024-01-15T10:00:00Z'),
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(updatedOrder as Order);
      jest.spyOn(orderRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);

      await service.update(1, dtoWithClosedAt, 1);

      expect(orderRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          closed_at: expect.any(Date),
        }),
      );
    });

    it('should set closedAt to null when provided as empty string', async () => {
      const dtoWithEmptyClosedAt: UpdateOrderDto = { closedAt: '' };
      const updatedOrder = { ...mockOrder, closed_at: null };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(updatedOrder as Order);
      jest.spyOn(orderRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);

      await service.update(1, dtoWithEmptyClosedAt, 1);

      expect(orderRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ closed_at: null }),
      );
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(service.update(0, updateOrderDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(0, updateOrderDto, 1)).rejects.toThrow(
        'Invalid id',
      );
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.update(1, updateOrderDto, 0)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update(1, updateOrderDto, 0)).rejects.toThrow(
        'You must be associated with a merchant',
      );
    });

    it('should throw NotFoundException if order not found', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(999, updateOrderDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(999, updateOrderDto, 1)).rejects.toThrow(
        'Order not found',
      );
    });

    it('should throw ForbiddenException if order belongs to different merchant', async () => {
      const orderFromDifferentMerchant = {
        ...mockOrder,
        merchant_id: 2,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(orderFromDifferentMerchant as Order);

      await expect(service.update(1, updateOrderDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update(1, updateOrderDto, 1)).rejects.toThrow(
        'You can only update orders from your merchant',
      );
    });

    it('should throw NotFoundException if table not found when updating tableId', async () => {
      const dtoWithTableId: UpdateOrderDto = { tableId: 999 };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as Order);
      jest.spyOn(tableRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(1, dtoWithTableId, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(1, dtoWithTableId, 1)).rejects.toThrow(
        'Table with ID 999 not found',
      );
    });

    it('should throw ForbiddenException if table belongs to different merchant when updating tableId', async () => {
      const dtoWithTableId: UpdateOrderDto = { tableId: 2 };
      const tableFromDifferentMerchant = {
        ...mockTable,
        id: 2,
        merchant_id: 2,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as Order);
      jest
        .spyOn(tableRepository, 'findOne')
        .mockResolvedValue(tableFromDifferentMerchant as unknown as Table);

      await expect(service.update(1, dtoWithTableId, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update(1, dtoWithTableId, 1)).rejects.toThrow(
        'Table does not belong to your merchant',
      );
    });

    it('should throw NotFoundException if collaborator not found when updating collaboratorId', async () => {
      const dtoWithCollaboratorId: UpdateOrderDto = { collaboratorId: 999 };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as Order);
      jest.spyOn(collaboratorRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(1, dtoWithCollaboratorId, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(1, dtoWithCollaboratorId, 1)).rejects.toThrow(
        'Collaborator with ID 999 not found',
      );
    });

    it('should throw ForbiddenException if collaborator belongs to different merchant when updating collaboratorId', async () => {
      const dtoWithCollaboratorId: UpdateOrderDto = { collaboratorId: 2 };
      const collaboratorFromDifferentMerchant = {
        ...mockCollaborator,
        id: 2,
        merchant_id: 2,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as Order);
      jest
        .spyOn(collaboratorRepository, 'findOne')
        .mockResolvedValue(collaboratorFromDifferentMerchant as Collaborator);

      await expect(service.update(1, dtoWithCollaboratorId, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update(1, dtoWithCollaboratorId, 1)).rejects.toThrow(
        'Collaborator does not belong to your merchant',
      );
    });

    it('should throw NotFoundException if customer not found when updating customerId', async () => {
      const dtoWithCustomerId: UpdateOrderDto = { customerId: 999 };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as Order);
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(1, dtoWithCustomerId, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(1, dtoWithCustomerId, 1)).rejects.toThrow(
        'Customer with ID 999 not found',
      );
    });

    it('should throw ForbiddenException if customer belongs to different merchant when updating customerId', async () => {
      const dtoWithCustomerId: UpdateOrderDto = { customerId: 2 };
      const customerFromDifferentMerchant = {
        ...mockCustomer,
        id: 2,
        merchantId: 2,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as Order);
      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(customerFromDifferentMerchant as Customer);

      await expect(service.update(1, dtoWithCustomerId, 1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update(1, dtoWithCustomerId, 1)).rejects.toThrow(
        'Customer does not belong to your merchant',
      );
    });

    it('should throw BadRequestException if closedAt is invalid date format', async () => {
      const dtoWithInvalidDate: UpdateOrderDto = { closedAt: 'invalid-date' };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as Order);

      await expect(service.update(1, dtoWithInvalidDate, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(1, dtoWithInvalidDate, 1)).rejects.toThrow(
        'Invalid closedAt date format',
      );
    });

    it('should throw NotFoundException if order not found after update', async () => {
      let findCount = 0;
      const orderFindOneSpy = jest
        .spyOn(orderRepository, 'findOne')
        .mockImplementation(() => {
          findCount += 1;
          if (findCount <= 3) {
            return Promise.resolve(mockOrder as Order);
          }
          return Promise.resolve(null);
        });
      jest.spyOn(orderRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);

      await expect(service.update(1, updateOrderDto, 1)).rejects.toThrow(
        new NotFoundException('Order not found after update'),
      );
      expect(orderFindOneSpy).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete an order successfully (logical delete)', async () => {
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as Order);
      jest.spyOn(orderRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);

      const result = await service.remove(1, 1);

      expect(orderRepository.update).toHaveBeenCalledWith(1, {
        logical_status: OrderStatus.DELETED,
      });
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Order deleted successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(service.remove(0, 1)).rejects.toThrow(BadRequestException);
      await expect(service.remove(0, 1)).rejects.toThrow('Invalid id');
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.remove(1, 0)).rejects.toThrow(ForbiddenException);
      await expect(service.remove(1, 0)).rejects.toThrow(
        'You must be associated with a merchant',
      );
    });

    it('should throw NotFoundException if order not found', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
      await expect(service.remove(999, 1)).rejects.toThrow('Order not found');
    });

    it('should throw ForbiddenException if order belongs to different merchant', async () => {
      const orderFromDifferentMerchant = {
        ...mockOrder,
        merchant_id: 2,
      };
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(orderFromDifferentMerchant as Order);

      await expect(service.remove(1, 1)).rejects.toThrow(ForbiddenException);
      await expect(service.remove(1, 1)).rejects.toThrow(
        'You can only delete orders from your merchant',
      );
    });
  });

  describe('totals and status aggregation', () => {
    it('syncOrderAggregates should recalculate subtotal, total, balance_due and is_paid', async () => {
      const persisted = {
        ...mockOrder,
        tax_total: 5,
        discount_total: 10,
        manual_tip_total: 3,
        tip_total: 3,
        delivery_fee: 2,
        paid_total: 40,
        subtotal: 0,
        total: 0,
        balance_due: 0,
        is_paid: false,
      };

      const items = [
        {
          id: 101,
          quantity: 2,
          price: 20,
          discount: 5,
          status: OrderItemStatus.ACTIVE,
          kitchen_status: 'pending',
          total_price: 35,
        },
        {
          id: 102,
          quantity: 1,
          price: 15,
          discount: 0,
          status: OrderItemStatus.ACTIVE,
          kitchen_status: 'in_preparation',
          total_price: 15,
        },
      ];

      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(persisted as Order);
      jest
        .spyOn(orderItemRepository, 'find')
        .mockResolvedValue(items as OrderItem[]);
      jest
        .spyOn(orderItemModifierRepository, 'find')
        .mockResolvedValue([] as OrderItemModifier[]);
      jest
        .spyOn(orderPaymentRepository, 'find')
        .mockResolvedValue([
          { amount: 40, tip_amount: 1.25, is_refund: false },
        ] as OrderPayment[]);
      jest
        .spyOn(orderTaxRepository, 'find')
        .mockResolvedValue([{ amount: 5 }] as OrderTax[]);
      const saveSpy = jest
        .spyOn(orderRepository, 'save')
        .mockImplementation(async (o: DeepPartial<Order>) => o as Order);

      await service.syncOrderAggregates(1);

      expect(mockOnlineOrderSyncService.syncFromPosOrder).toHaveBeenCalledWith(
        1,
      );
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          subtotal: 50, // (2*20-5) + (1*15-0)
          tax_total: 5,
          tip_total: 4.25, // manual 3 + payment tips 1.25
          total: 51.25, // 50 - 10 + 5 + 4.25 + 2
          paid_total: 41.25, // 40 + 1.25 tip on payment row
          balance_due: 10, // 51.25 - 41.25
          is_paid: false,
          kitchen_status: KitchenStatus.PREPARING,
        }),
      );
    });

    it('syncOrderAggregates should set is_paid=true when balance_due equals 0', async () => {
      const persisted = {
        ...mockOrder,
        tax_total: 0,
        discount_total: 0,
        manual_tip_total: 0,
        tip_total: 0,
        delivery_fee: 0,
        paid_total: 25,
        is_paid: false,
      };
      const items = [
        {
          id: 201,
          quantity: 1,
          price: 25,
          discount: 0,
          status: OrderItemStatus.ACTIVE,
          kitchen_status: 'pending',
          total_price: 25,
        },
      ];

      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(persisted as Order);
      jest
        .spyOn(orderItemRepository, 'find')
        .mockResolvedValue(items as OrderItem[]);
      jest
        .spyOn(orderItemModifierRepository, 'find')
        .mockResolvedValue([] as OrderItemModifier[]);
      jest
        .spyOn(orderPaymentRepository, 'find')
        .mockResolvedValue([
          { amount: 25, tip_amount: 0, is_refund: false },
        ] as OrderPayment[]);
      jest
        .spyOn(orderTaxRepository, 'find')
        .mockResolvedValue([] as OrderTax[]);
      const saveSpy = jest
        .spyOn(orderRepository, 'save')
        .mockImplementation(async (o: DeepPartial<Order>) => o as Order);

      await service.syncOrderAggregates(1);

      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          subtotal: 25,
          tax_total: 0,
          total: 25,
          paid_total: 25,
          balance_due: 0,
          is_paid: true,
        }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        ORDER_FULLY_PAID_EVENT,
        { orderId: 1 },
      );
    });

    it('update should trigger aggregate recalculation when financial fields are changed', async () => {
      const dto: UpdateOrderDto = {
        discountTotal: 2,
        tipTotal: 3,
        deliveryFee: 5,
      };

      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as Order);
      jest.spyOn(orderRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      } as UpdateResult);
      const syncSpy = jest
        .spyOn(service, 'syncOrderAggregates')
        .mockResolvedValue(undefined);
      jest.spyOn(orderRepository, 'save').mockResolvedValue(mockOrder as Order);

      await service.update(1, dto, 1);

      expect(syncSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('refundOrder', () => {
    const admin = {
      id: 7,
      role: UserRole.MERCHANT_ADMIN,
    } as unknown as AuthenticatedUser;
    const paidOrder = {
      id: 1,
      merchant: { id: 1 },
      status: OrderBusinessStatus.PAID,
      total: 100,
      subtotal: 100,
      orderItems: [],
      order_number: '000001',
    };
    let manager: {
      findOne: jest.Mock;
      find: jest.Mock;
      save: jest.Mock;
    };

    beforeEach(() => {
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue({ ...paidOrder } as unknown as Order);
      manager = {
        findOne: jest.fn((entity: unknown) =>
          Promise.resolve(entity === Order ? { ...paidOrder } : null),
        ),
        find: jest.fn((entity: unknown) =>
          Promise.resolve(
            entity === OrderPayment
              ? [{ amount: '100.00', method: 'cash' }]
              : entity === CashShift
                ? [{ id: 3, cashDrawerId: 2, openedBy: 5 }] // the only open drawer
                : [],
          ),
        ),
        save: jest.fn((a: unknown, b?: unknown) => Promise.resolve(b ?? a)),
      };
      const queryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager,
      };
      (
        service['dataSource'] as unknown as { createQueryRunner: jest.Mock }
      ).createQueryRunner.mockReturnValue(queryRunner);
      jest
        .spyOn(service, 'syncOrderAggregatesWithManager')
        .mockResolvedValue({ becameFullyPaid: false, becameUnpaid: true });
    });

    it('locks the order, stores the refund as a positive amount and syncs the totals', async () => {
      await service.refundOrder(
        { orderId: 1, fullRefund: true, reason: 'Wrong dish' },
        1,
        admin,
      );

      expect(manager.findOne).toHaveBeenCalledWith(Order, {
        where: { id: 1 },
        lock: { mode: 'pessimistic_write' },
      });
      // is_refund is what subtracts it from paid_total; a negative amount added it back
      expect(manager.save).toHaveBeenCalledWith(
        OrderPayment,
        expect.objectContaining({ amount: 100, is_refund: true }),
      );
      expect(service.syncOrderAggregatesWithManager).toHaveBeenCalledWith(
        manager,
        1,
      );
      // the cash part leaves the open drawer as a refund linked to the order
      expect(mockCashFlowService.addMovement).toHaveBeenCalledWith(
        3,
        100,
        CashShiftMovementType.OUT,
        1,
        5,
        2,
        manager,
        'Wrong dish',
      );
    });

    it('refuses to pay cash out when several drawers are open and none is chosen', async () => {
      manager.find.mockImplementation((entity: unknown) =>
        Promise.resolve(
          entity === OrderPayment
            ? [{ amount: '100.00', method: 'cash' }]
            : entity === CashShift
              ? [{ id: 3 }, { id: 4 }]
              : [],
        ),
      );

      await expect(
        service.refundOrder(
          { orderId: 1, fullRefund: true, reason: 'Wrong dish' },
          1,
          admin,
        ),
      ).rejects.toThrow('Several cash shifts are open: send cashShiftId');
    });

    it('does not refund twice when another refund got the lock first', async () => {
      manager.findOne.mockImplementation((entity: unknown) =>
        Promise.resolve(
          entity === Order
            ? { ...paidOrder, status: OrderBusinessStatus.CANCELLED }
            : null,
        ),
      );

      await expect(
        service.refundOrder(
          { orderId: 1, fullRefund: true, reason: 'Wrong dish' },
          1,
          admin,
        ),
      ).rejects.toThrow('Only paid orders can be refunded');
      expect(manager.save).not.toHaveBeenCalled();
    });
  });

  describe('business status after payments', () => {
    const line = {
      id: 1,
      status: OrderItemStatus.ACTIVE,
      total_price: 50,
      quantity: 1,
      price: 50,
      discount: 0,
      kitchen_status: 'pending',
    };
    const order = (status: OrderBusinessStatus, isPaid: boolean) => ({
      id: 1,
      status,
      is_paid: isPaid,
      total: 50,
      paid_total: isPaid ? 50 : 0,
      balance_due: isPaid ? 0 : 50,
      manual_tip_total: 0,
      discount_total: 0,
      delivery_fee: 0,
    });
    const sync = () =>
      service.syncOrderAggregatesWithManager(
        mockOrderRepository.manager as unknown as EntityManager,
        1,
      );

    beforeEach(() => {
      mockOrderItemRepository.find.mockResolvedValue([line]);
      mockOrderRepository.save.mockImplementation((o: unknown) =>
        Promise.resolve(o),
      );
    });

    it.each([
      OrderBusinessStatus.PENDING,
      OrderBusinessStatus.IN_PROGRESS,
      OrderBusinessStatus.COMPLETED,
    ])(
      'a %s order paid in full through order-payments becomes PAID',
      async (status) => {
        mockOrderRepository.findOne.mockResolvedValueOnce(order(status, false));
        mockOrderPaymentRepository.find.mockResolvedValueOnce([
          { amount: 50, tip_amount: 0, is_refund: false },
        ]);

        const result = await sync();

        expect(result.becameFullyPaid).toBe(true);
        expect(mockOrderRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ status: OrderBusinessStatus.PAID }),
        );
      },
    );

    it('a cancelled order stays cancelled even if its payments add up', async () => {
      mockOrderRepository.findOne.mockResolvedValueOnce(
        order(OrderBusinessStatus.CANCELLED, false),
      );
      mockOrderPaymentRepository.find.mockResolvedValueOnce([
        { amount: 50, tip_amount: 0, is_refund: false },
      ]);

      await sync();

      expect(mockOrderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderBusinessStatus.CANCELLED }),
      );
    });

    it('a refund that leaves a balance due turns a PAID order PARTIALLY_REFUNDED', async () => {
      mockOrderRepository.findOne.mockResolvedValueOnce(
        order(OrderBusinessStatus.PAID, true),
      );
      mockOrderPaymentRepository.find.mockResolvedValueOnce([
        { amount: 50, tip_amount: 0, is_refund: false },
        { amount: 20, tip_amount: 0, is_refund: true },
      ]);

      const result = await sync();

      expect(result.becameUnpaid).toBe(true);
      expect(mockOrderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OrderBusinessStatus.PARTIALLY_REFUNDED,
        }),
      );
    });
  });
});
