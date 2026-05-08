import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { type DeleteResult } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderTaxesService } from './order-taxes.service';
import { OrderTax } from './entities/order-tax.entity';
import { Order } from '../orders/entities/order.entity';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '../orders/constants/order-status.enum';
import { OrderBusinessStatus } from '../orders/constants/order-business-status.enum';
import { OrderType } from '../orders/constants/order-type.enum';
import { CreateOrderTaxDto } from './dto/create-order-tax.dto';

describe('OrderTaxesService', () => {
  let service: OrderTaxesService;

  const mockOrderTaxRepository = {
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
    syncOrderAggregatesWithManager: jest.fn().mockResolvedValue(undefined),
    syncOnlineOrderFromPosOrder: jest.fn().mockResolvedValue(undefined),
    // legacy expectations in this spec
    syncOrderAggregates: jest.fn().mockResolvedValue(undefined),
  };

  const mockQueryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  const mockOrder = {
    id: 1,
    merchant_id: 1,
    logical_status: OrderStatus.ACTIVE,
    status: OrderBusinessStatus.PENDING,
    type: OrderType.DINE_IN,
    merchant: { id: 1 },
  };

  const mockTaxRow = {
    id: 1,
    order_id: 1,
    name: 'IVA',
    rate: '19.00',
    amount: '3.80',
    created_at: new Date('2024-01-15T08:00:00.000Z'),
    order: mockOrder,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderTaxesService,
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: getRepositoryToken(OrderTax),
          useValue: mockOrderTaxRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        { provide: OrdersService, useValue: mockOrdersService },
      ],
    }).compile();

    service = module.get<OrderTaxesService>(OrderTaxesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    mockQueryRunner.manager.delete.mockImplementation(
      async (_E: unknown, id: unknown) => {
        await mockOrderTaxRepository.delete(id as any);
        return { affected: 1 } as unknown as DeleteResult;
      },
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateOrderTaxDto = {
      orderId: 1,
      name: 'IVA',
      rate: 19,
      amount: 3.8,
    };

    it('should create and sync order aggregates', async () => {
      jest
        .spyOn(mockOrderRepository, 'findOne')
        .mockResolvedValue(mockOrder as unknown as Order);
      mockQueryRunner.manager.save.mockResolvedValue({ id: 1 });
      mockQueryRunner.manager.findOne.mockResolvedValue(
        mockTaxRow as unknown as OrderTax,
      );

      const result = await service.create(dto, 1);

      expect(result.statusCode).toBe(201);
      expect(
        mockOrdersService.syncOrderAggregatesWithManager,
      ).toHaveBeenCalled();
      expect(
        mockOrdersService.syncOnlineOrderFromPosOrder,
      ).toHaveBeenCalledWith(1);
    });

    it('should throw if no merchant', async () => {
      await expect(service.create(dto, 0)).rejects.toThrow(ForbiddenException);
    });

    it('should throw if order not found', async () => {
      jest.spyOn(mockOrderRepository, 'findOne').mockResolvedValue(null);
      await expect(service.create(dto, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete and sync', async () => {
      jest
        .spyOn(mockOrderTaxRepository, 'findOne')
        .mockResolvedValue(mockTaxRow as unknown as OrderTax);
      jest
        .spyOn(mockOrderTaxRepository, 'delete')
        .mockResolvedValue({ raw: [], affected: 1 } as DeleteResult);

      const result = await service.remove(1, 1);

      expect(result.statusCode).toBe(200);
      expect(mockOrderTaxRepository.delete).toHaveBeenCalledWith(1);
      expect(
        mockOrdersService.syncOnlineOrderFromPosOrder,
      ).toHaveBeenCalledWith(1);
    });
  });
});
