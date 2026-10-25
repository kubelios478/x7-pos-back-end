/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { UpdateOrderPaymentDto } from './dto/update-order-payment.dto';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, type DeleteResult } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderPaymentsService } from './order-payments.service';
import { OrderPayment } from './entities/order-payment.entity';
import { CashShift } from '../../cashdrawer/cash-shifts/entities/cash-shift.entity';
import { Order } from '../orders/entities/order.entity';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '../orders/constants/order-status.enum';
import { OrderBusinessStatus } from '../orders/constants/order-business-status.enum';
import { OrderType } from '../orders/constants/order-type.enum';
import { CreateOrderPaymentDto } from './dto/create-order-payment.dto';
import { CashFlowService } from '../../cashdrawer/cash-shifts/cash-flow.service';
import { LoyaltyPointsRedemptionService } from 'src/growth/loyalty/loyalty-points-redemption/loyalty-points-redemption.service';

describe('OrderPaymentsService', () => {
  let service: OrderPaymentsService;
  let orderPaymentRepository: Repository<OrderPayment>;
  let orderRepository: Repository<Order>;

  const mockOrderPaymentRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockOrderRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockOrdersService = {
    syncOrderAggregatesWithManager: jest
      .fn()
      .mockResolvedValue({ becameFullyPaid: false, becameUnpaid: false }),
    syncOnlineOrderFromPosOrder: jest.fn().mockResolvedValue(undefined),
    syncOrderAggregates: jest.fn().mockResolvedValue(undefined),
    emitOrderFullyPaid: jest.fn(),
    emitOrderLoyaltyReversal: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      // the cash shift, or the order (both are locked inside the transaction)
      findOne: jest.fn((entity: unknown) =>
        Promise.resolve(
          entity === Order
            ? mockOrder
            : { id: 1, cashDrawerId: 1, status: 'OPEN' },
        ),
      ),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockResolvedValue({ id: 1, amount: 50, tip_amount: 0 }),
      exists: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  const mockCashFlowService = {
    addMovement: jest.fn(),
  };

  const mockLoyaltyPointsRedemptionService = {
    consumeLockWithManager: jest.fn().mockResolvedValue(undefined),
  };

  const mockOrder = {
    id: 1,
    merchant_id: 1,
    logical_status: OrderStatus.ACTIVE,
    status: OrderBusinessStatus.PENDING,
    type: OrderType.DINE_IN,
    merchant: { id: 1 },
  };

  const mockPaymentRow = {
    id: 1,
    order_id: 1,
    amount: '50.00',
    method: 'card',
    provider: 'stripe',
    reference: 'ch_1',
    tip_amount: '0',
    is_refund: false,
    created_at: new Date('2024-01-15T08:00:00.000Z'),
    order: mockOrder,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderPaymentsService,
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: getRepositoryToken(OrderPayment),
          useValue: mockOrderPaymentRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: CashFlowService, useValue: mockCashFlowService },
        {
          provide: LoyaltyPointsRedemptionService,
          useValue: mockLoyaltyPointsRedemptionService,
        },
      ],
    }).compile();

    service = module.get<OrderPaymentsService>(OrderPaymentsService);
    orderPaymentRepository = module.get(getRepositoryToken(OrderPayment));
    orderRepository = module.get(getRepositoryToken(Order));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateOrderPaymentDto = {
      orderId: 1,
      collaboratorId: 1,
      amount: 50,
      method: 'card',
      provider: 'stripe',
      reference: 'ch_1',
    };

    it('should create and sync order aggregates', async () => {
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as unknown as Order);
      jest
        .spyOn(orderPaymentRepository, 'findOne')
        .mockResolvedValue(mockPaymentRow as unknown as OrderPayment);

      const result = await service.create(dto, 1, 1, 1);

      expect(result.statusCode).toBe(201);
      expect(
        mockOrdersService.syncOrderAggregatesWithManager,
      ).toHaveBeenCalled();
      expect(
        mockOrdersService.syncOnlineOrderFromPosOrder,
      ).toHaveBeenCalledWith(1);
    });

    it('rejects a shiftId that is not a cash shift of the merchant', async () => {
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as unknown as Order);
      mockQueryRunner.manager.exists.mockResolvedValue(false);

      await expect(
        service.create({ ...dto, shiftId: 2 }, 1, 1, 1),
      ).rejects.toThrow('shiftId must be a cash shift of your merchant');
      expect(mockQueryRunner.manager.exists).toHaveBeenCalledWith(CashShift, {
        where: { id: 2, merchantId: 1 },
      });
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockOrdersService.emitOrderFullyPaid).not.toHaveBeenCalled();
    });

    it('locks the order row, so concurrent payments on it run one after the other', async () => {
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as unknown as Order);
      jest
        .spyOn(orderPaymentRepository, 'findOne')
        .mockResolvedValue(mockPaymentRow as unknown as OrderPayment);

      await service.create(dto, 1, 1, 1);

      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(Order, {
        where: { id: 1, merchant_id: 1 },
        lock: { mode: 'pessimistic_write' },
      });
    });

    it('rejects a refund larger than what the order has paid', async () => {
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as unknown as Order);
      mockQueryRunner.manager.find.mockResolvedValueOnce([
        { amount: '30.00', tip_amount: '0', is_refund: false },
      ]);

      await expect(
        service.create({ ...dto, amount: 50, isRefund: true }, 1, 1, 1),
      ).rejects.toThrow('Cannot refund 50: the order has 30 paid.');
      expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('accepts a refund within what was paid', async () => {
      jest
        .spyOn(orderRepository, 'findOne')
        .mockResolvedValue(mockOrder as unknown as Order);
      jest
        .spyOn(orderPaymentRepository, 'findOne')
        .mockResolvedValue(mockPaymentRow as unknown as OrderPayment);
      mockQueryRunner.manager.find.mockResolvedValueOnce([
        { amount: '30.00', tip_amount: '0', is_refund: false },
      ]);

      const result = await service.create(
        { ...dto, amount: 20, isRefund: true },
        1,
        1,
        1,
      );

      expect(result.statusCode).toBe(201);
    });

    it('should throw if no merchant', async () => {
      await expect(service.create(dto, 0, 1, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw if order not found', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);
      await expect(service.create(dto, 1, 1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('refuses to delete a payment (it is corrected with a refund)', async () => {
      jest
        .spyOn(orderPaymentRepository, 'findOne')
        .mockResolvedValue(mockPaymentRow as unknown as OrderPayment);
      const deleteSpy = jest.spyOn(orderPaymentRepository, 'delete');

      await expect(service.remove(1, 1)).rejects.toThrow(
        'Order payments cannot be deleted: register a refund for the amount instead.',
      );
      expect(deleteSpy).not.toHaveBeenCalled();
      expect(mockOrdersService.syncOrderAggregates).not.toHaveBeenCalled();
    });

    it('editing only changes the descriptive fields, not the money', async () => {
      jest
        .spyOn(orderPaymentRepository, 'findOne')
        .mockResolvedValue(mockPaymentRow as unknown as OrderPayment);
      const updateSpy = jest
        .spyOn(orderPaymentRepository, 'update')
        .mockResolvedValue({ raw: [], affected: 1, generatedMaps: [] });

      await service.update(1, { reference: 'ch_2', provider: 'stripe' }, 1);

      expect(updateSpy).toHaveBeenCalledWith(1, {
        reference: 'ch_2',
        provider: 'stripe',
      });
      expect(mockOrdersService.syncOrderAggregates).not.toHaveBeenCalled();
    });

    it('the DTO rejects amount, method, tip, refund flag and order', async () => {
      const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      for (const body of [
        { amount: 10 },
        { method: 'card' },
        { tipAmount: 1 },
        { isRefund: true },
        { orderId: 2 },
      ]) {
        await expect(
          pipe.transform(body, {
            type: 'body',
            metatype: UpdateOrderPaymentDto,
          }),
        ).rejects.toThrow();
      }
    });
  });
});
