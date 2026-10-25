import { Logger } from '@nestjs/common';
import { StockLevelMonitorService } from '../../../stock-alerts/stock-level-monitor.service';
import { ProductRecipe } from '../../recipes/entities/product-recipe.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { MovementsService } from './movements.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movement } from './entities/movement.entity';
import { Item } from '../items/entities/item.entity';
import { OneMovementResponse } from './dto/movement-response.dto';
import { CreateMovementDto } from './dto/create-movement.dto';
import { GetMovementsQueryDto } from './dto/get-movements-query.dto';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { MovementsStatus } from './constants/movements-status';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Product } from '../../products/entities/product.entity';
import { Variant } from '../../variants/entities/variant.entity';
import { Location } from '../locations/entities/location.entity';
import { ErrorHandler } from 'src/common/utils/error-handler.util';

describe('MovementsService', () => {
  let service: MovementsService;
  let movementRepo: jest.Mocked<Repository<Movement>>;
  let itemRepo: jest.Mocked<Repository<Item>>;

  type MockQueryBuilder = {
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getCount: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getMany: jest.Mock;
    getOne: jest.Mock;
    setLock: jest.Mock;
  };
  let mockQueryBuilder: MockQueryBuilder;
  let txManager: { getRepository: jest.Mock; exists: jest.Mock };

  const mockMerchant = {
    id: 1,
    name: 'Test Merchant',
  } as Merchant;

  const mockProduct = {
    id: 1,
    name: 'Test Product',
    merchantId: mockMerchant.id,
  } as Product;

  const mockVariant = {
    id: 1,
    name: 'Test Variant',
    productId: mockProduct.id,
  } as Variant;

  const mockLocation = {
    id: 1,
    name: 'Test Location',
    address: 'Test Address',
    merchantId: mockMerchant.id,
  } as Location;

  const mockItem: Item = {
    minimumQty: 0,
    weightedAverageUnitCost: '0.0000',
    id: 1,
    currentQty: 10,
    productId: mockProduct.id,
    product: mockProduct,
    variantId: mockVariant.id,
    variant: mockVariant,
    locationId: mockLocation.id,
    location: mockLocation,
    isActive: true,
    movements: [],
  };

  const mockMovement: Movement = {
    supplierInvoiceId: null,
    supplierInvoice: null,
    sourceLocationId: null,
    sourceLocation: null,
    destinationLocationId: null,
    destinationLocation: null,
    createdBy: null,
    movementType: null,
    unitCost: null,
    id: 1,
    stockItemId: mockItem.id,
    item: mockItem,
    quantity: 5,
    type: MovementsStatus.IN, // Corrected to MovementsStatus.IN
    reference: 'REF-001',
    reason: 'Initial stock',
    merchantId: mockMerchant.id,
    merchant: mockMerchant,
    orderId: null,
    order: null,
    shiftId: null,
    shift: null,
    isActive: true,
    createdAt: new Date(),
  };

  const mockCreateMovementDto: CreateMovementDto = {
    stockItemId: mockItem.id,
    quantity: 5,
    type: MovementsStatus.IN, // Corrected to MovementsStatus.IN
    reference: 'REF-001',
    reason: 'Initial stock',
  };

  const mockQuery: GetMovementsQueryDto = {
    page: 1,
    limit: 10,
    itemName: undefined,
  };

  beforeEach(async () => {
    const mockMovementRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const mockItemRepo = {
      findOneBy: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((e: unknown) => e),
      save: jest.fn((e: unknown) => Promise.resolve(e)),
      createQueryBuilder: jest.fn(),
      // The service reads the merchant's company through the repository manager,
      // and runs create() in a transaction on it.
      manager: {
        findOne: jest.fn().mockResolvedValue({ id: 1, companyId: 1 }),
        transaction: jest.fn(),
      },
    };
    // inside the transaction the same repository mocks answer
    txManager = {
      getRepository: jest.fn((entity: unknown) =>
        entity === Item ? mockItemRepo : mockMovementRepo,
      ),
      exists: jest.fn().mockResolvedValue(true),
    };
    mockItemRepo.manager.transaction.mockImplementation(
      (work: (manager: typeof txManager) => unknown) => work(txManager),
    );

    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getMany: jest.fn(),
      getOne: jest.fn(),
      setLock: jest.fn().mockReturnThis(),
    };

    mockMovementRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockItemRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovementsService,
        { provide: getRepositoryToken(Movement), useValue: mockMovementRepo },
        { provide: getRepositoryToken(Item), useValue: mockItemRepo },
        {
          provide: getRepositoryToken(ProductRecipe),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
            findBy: jest.fn().mockResolvedValue([]),
            count: jest.fn().mockResolvedValue(0),
            create: jest.fn((e: unknown) => e),
            save: jest.fn((e: unknown) => Promise.resolve(e)),
          },
        },
        {
          provide: getRepositoryToken(Order),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
            findBy: jest.fn().mockResolvedValue([]),
            count: jest.fn().mockResolvedValue(0),
            create: jest.fn((e: unknown) => e),
            save: jest.fn((e: unknown) => Promise.resolve(e)),
          },
        },
        {
          provide: StockLevelMonitorService,
          useValue: {
            evaluateStockItems: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<MovementsService>(MovementsService);
    movementRepo = module.get(getRepositoryToken(Movement));
    itemRepo = module.get(getRepositoryToken(Item));

    jest.clearAllMocks();

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest
      .spyOn(ErrorHandler, 'notFound')
      .mockImplementation((message?: string) => {
        throw new NotFoundException(message);
      });
    jest
      .spyOn(ErrorHandler, 'exists')
      .mockImplementation((message?: string) => {
        throw new BadRequestException(message);
      });
    jest
      .spyOn(ErrorHandler, 'invalidId')
      .mockImplementation((message?: string) => {
        throw new BadRequestException(message);
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Test', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('Create', () => {
    it('should create a new Movement successfully', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockItem); // Item exists
      movementRepo.create.mockReturnValueOnce(mockMovement);
      movementRepo.save.mockResolvedValueOnce(mockMovement);
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockMovement); // For the findOne call inside create

      const result = await service.create(
        mockMerchant.id,
        mockCreateMovementDto,
      );

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'item.product',
        'product',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'item.id = :stockItemId',
        { stockItemId: mockCreateMovementDto.stockItemId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(product.merchantId = :merchantId OR supply.company_id = :companyId)',
        { merchantId: mockMerchant.id, companyId: 1 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'item.isActive = :isActive',
        { isActive: true },
      );
      expect(movementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          item: mockItem,
          quantity: mockCreateMovementDto.quantity,
          type: mockCreateMovementDto.type,
          reference: mockCreateMovementDto.reference,
          reason: mockCreateMovementDto.reason,
          merchantId: mockMerchant.id,
          isActive: true,
        }),
      );
      expect(movementRepo.save).toHaveBeenCalledWith(mockMovement);
      expect(result).toMatchObject({
        statusCode: 201,
        message: 'Movement Created successfully',
        data: {
          sourceLocationId: null,
          destinationLocationId: null,
          createdBy: null,
          movementType: null,
          id: mockMovement.id,
          item: {
            id: mockMovement.item?.id,
            currentQty: mockMovement.item?.currentQty,
          },
          quantity: mockMovement.quantity,
          type: mockMovement.type,
          reference: mockMovement.reference,
          reason: mockMovement.reason,
          merchant: {
            id: mockMerchant.id,
            name: mockMerchant.name,
          },
          createdAt: mockMovement.createdAt,
        },
      });
    });

    it('should throw NotFoundException if item is not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null); // Item not found

      await expect(async () =>
        service.create(mockMerchant.id, mockCreateMovementDto),
      ).rejects.toThrow(NotFoundException);

      expect(movementRepo.create).not.toHaveBeenCalled();
      expect(movementRepo.save).not.toHaveBeenCalled();
    });

    it('should throw an error if saving the movement fails', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockItem); // Item exists
      movementRepo.create.mockReturnValueOnce(mockMovement);
      movementRepo.save.mockRejectedValueOnce(
        new Error('Database operation failed'),
      );

      await expect(async () =>
        service.create(mockMerchant.id, mockCreateMovementDto),
      ).rejects.toThrow('Database operation failed');

      expect(movementRepo.create).toHaveBeenCalled();
      expect(movementRepo.save).toHaveBeenCalled();
    });
  });

  describe('Create', () => {
    it('puts stock back for a RETURN (kitchen cancellation returned to inventory)', async () => {
      mockQueryBuilder.getOne
        .mockResolvedValueOnce({ ...mockItem, currentQty: 10 })
        .mockResolvedValueOnce(mockMovement);
      movementRepo.create.mockReturnValueOnce(mockMovement);
      movementRepo.save.mockResolvedValueOnce(mockMovement);

      await service.create(mockMerchant.id, {
        stockItemId: 1,
        quantity: 4,
        type: MovementsStatus.RETURN,
        reference: 'VOID-1',
        reason: 'Kitchen cancellation',
      });

      expect(itemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ currentQty: 14 }),
      );
      expect(movementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: MovementsStatus.IN }),
      );
    });

    it('should throw BadRequestException for invalid quantity', async () => {
      const invalidCreateDto = { ...mockCreateMovementDto, quantity: 0 };
      await expect(async () =>
        service.create(mockMerchant.id, invalidCreateDto),
      ).rejects.toThrow('Movement quantity must be greater than 0.');
      expect(movementRepo.create).not.toHaveBeenCalled();
      expect(movementRepo.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when no stock item can be resolved', async () => {
      const invalidCreateDto = { ...mockCreateMovementDto, stockItemId: 0 };
      await expect(async () =>
        service.create(mockMerchant.id, invalidCreateDto),
      ).rejects.toThrow(
        'Stock item record not found for the selected raw material and location.',
      );
      expect(movementRepo.create).not.toHaveBeenCalled();
      expect(movementRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('Create: transaction, cost and transfers', () => {
    beforeEach(() => {
      // earlier tests leave queued getOne results behind (clearAllMocks keeps them)
      mockQueryBuilder.getOne.mockReset();
      movementRepo.create.mockImplementation((m) => m as Movement);
      movementRepo.save.mockImplementation((m) =>
        Promise.resolve({ id: 50, ...m } as Movement),
      );
      jest.spyOn(service, 'findOne').mockResolvedValue({} as never);
    });

    it('a failed stock-alert evaluation is logged with Logger, not console', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce({
        ...mockItem,
        currentQty: 10,
      });
      (
        service['stockLevelMonitor'] as unknown as {
          evaluateStockItems: jest.Mock;
        }
      ).evaluateStockItems.mockRejectedValueOnce(new Error('alerts down'));
      const logged = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});
      const consoleError = jest.spyOn(console, 'error');

      await service.create(mockMerchant.id, {
        stockItemId: 1,
        quantity: 2,
        type: MovementsStatus.OUT,
      });

      expect(logged).toHaveBeenCalledWith(
        'Error evaluating stock levels post movement',
        expect.stringContaining('alerts down'),
      );
      expect(consoleError).not.toHaveBeenCalled();
    });

    it('locks the stock row inside a transaction', async () => {
      // explicit quantity: earlier tests mutate the shared mockItem
      mockQueryBuilder.getOne.mockResolvedValueOnce({
        ...mockItem,
        currentQty: 10,
      });

      await service.create(mockMerchant.id, {
        stockItemId: 1,
        quantity: 2,
        type: MovementsStatus.OUT,
      });

      expect(itemRepo.manager.transaction).toHaveBeenCalled();
      expect(mockQueryBuilder.setLock).toHaveBeenCalledWith(
        'pessimistic_write',
        undefined,
        ['item'],
      );
      expect(itemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ currentQty: 8 }),
      );
    });

    it('weights the average cost of an entry instead of replacing it', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce({
        ...mockItem,
        currentQty: 10,
        weightedAverageUnitCost: '2.0000',
      });

      await service.create(mockMerchant.id, {
        stockItemId: 1,
        quantity: 10,
        type: MovementsStatus.IN,
        unitCost: 4,
      });

      expect(itemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          currentQty: 20,
          weightedAverageUnitCost: '3.0000',
        }),
      );
    });

    it('moves stock to the same product/variant at the destination and records both sides', async () => {
      mockQueryBuilder.getOne
        .mockResolvedValueOnce({
          ...mockItem,
          currentQty: 10,
          supplyId: null,
          weightedAverageUnitCost: '2.0000',
        })
        .mockResolvedValueOnce(null); // no stock row yet at the destination

      await service.create(mockMerchant.id, {
        stockItemId: 1,
        quantity: 4,
        type: MovementsStatus.OUT,
        movementType: 'TRANSFER',
        destinationLocationId: 2,
      });

      // a null key must match NULL, not any value (it used to pick another variant)
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'item.supplyId IS NULL',
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'item.variantId = :variantId',
        { variantId: mockItem.variantId },
      );
      expect(itemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, currentQty: 6 }),
      );
      expect(itemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          locationId: 2,
          variantId: mockItem.variantId,
          currentQty: 4,
        }),
      );
      expect(movementRepo.save).toHaveBeenCalledTimes(2);
      expect(movementRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MovementsStatus.IN,
          movementType: 'TRANSFER',
          destinationLocationId: 2,
          quantity: 4,
        }),
      );
    });

    it('rejects a transfer to a location of another merchant', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce({ ...mockItem });
      txManager.exists.mockResolvedValueOnce(false);

      await expect(
        service.create(mockMerchant.id, {
          stockItemId: 1,
          quantity: 4,
          type: MovementsStatus.OUT,
          movementType: 'TRANSFER',
          destinationLocationId: 99,
        }),
      ).rejects.toThrow('Destination location not found');
      expect(itemRepo.save).not.toHaveBeenCalled();
      expect(movementRepo.save).not.toHaveBeenCalled();
    });

    it("does not create stock for another company's raw material", async () => {
      txManager.exists.mockResolvedValueOnce(false); // the supply is not the company's

      await expect(
        service.create(mockMerchant.id, {
          stockItemId: 0,
          quantity: 4,
          type: MovementsStatus.IN,
          supplyId: 77,
          destinationLocationId: 1,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(itemRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('FindAll', () => {
    it('should return all Movements successfully', async () => {
      const movements = [mockMovement];
      mockQueryBuilder.getMany.mockResolvedValue(movements);
      mockQueryBuilder.getCount.mockResolvedValue(movements.length);

      const result = await service.findAll(mockQuery, mockMerchant.id);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'movement.item',
        'item',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'item.product',
        'product',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'movement.merchant',
        'merchant',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        '(product.merchantId = :merchantId OR supply.company_id = :companyId)',
        { merchantId: mockMerchant.id, companyId: 1 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'movement.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'movement.createdAt',
        'DESC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(mockQuery.limit);

      expect(result).toMatchObject({
        statusCode: 200,
        message: 'Movements retrieved successfully',
        data: [
          {
            id: mockMovement.id,
            item: {
              id: mockMovement.item?.id,
              currentQty: mockMovement.item?.currentQty,
            },
            quantity: mockMovement.quantity,
            type: mockMovement.type,
            reference: mockMovement.reference,
            reason: mockMovement.reason,
            merchant: {
              id: mockMerchant.id,
              name: mockMerchant.name,
            },
            createdAt: mockMovement.createdAt,
          },
        ],
        page: mockQuery.page,
        limit: mockQuery.limit,
        total: movements.length,
        totalPages: Math.ceil(movements.length / mockQuery.limit!),
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should return empty array when no movements found', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.findAll(mockQuery, mockMerchant.id);

      expect(result.data).toEqual([]);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Movements retrieved successfully');
      expect(result.total).toBe(0);
    });

    it('should return movements filtered by itemName', async () => {
      const queryWithName = {
        ...mockQuery,
        itemName: 'Test Product',
      };
      // For this test, ensure the mockItem returned by getMany has a product with a name
      const movements = [
        {
          ...mockMovement,
          item: {
            ...mockItem,
            product: { ...mockProduct, name: 'Test Product' },
          },
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(movements);
      mockQueryBuilder.getCount.mockResolvedValue(movements.length);

      const result = await service.findAll(queryWithName, mockMerchant.id);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(LOWER(product.name) LIKE LOWER(:itemName) OR LOWER(supply.name) LIKE LOWER(:itemName))',
        { itemName: '%Test Product%' },
      );
      expect(result.data).toMatchObject([
        {
          id: mockMovement.id,
          item: {
            id: mockItem.id,
            currentQty: mockItem.currentQty,
          },
          quantity: mockMovement.quantity,
          type: mockMovement.type,
          reference: mockMovement.reference,
          reason: mockMovement.reason,
          merchant: {
            id: mockMerchant.id,
            name: mockMerchant.name,
          },
          createdAt: mockMovement.createdAt,
        },
      ]);
    });

    it('should handle pagination correctly', async () => {
      const paginatedQuery = { ...mockQuery, page: 2, limit: 5 };
      const movements = Array.from({ length: 10 }, (_, i) => ({
        ...mockMovement,
        id: i + 1,
      }));
      mockQueryBuilder.getMany.mockResolvedValue(movements.slice(5, 10));
      mockQueryBuilder.getCount.mockResolvedValue(movements.length);

      const result = await service.findAll(paginatedQuery, mockMerchant.id);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.total).toBe(10);
      expect(result.totalPages).toBe(2);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(true);
    });
  });

  describe('FindOne', () => {
    it('should return a Movement successfully', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockMovement); // Movement exists

      const result = await service.findOne(mockMovement.id, mockMerchant.id);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'movement.item',
        'item',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'item.product',
        'product',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'movement.merchant',
        'merchant',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('movement.id = :id', {
        id: mockMovement.id,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'movement.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(product.merchantId = :merchantId OR supply.company_id = :companyId)',
        { merchantId: mockMerchant.id, companyId: 1 },
      );
      expect(result).toMatchObject({
        statusCode: 200,
        message: 'Movement retrieved successfully',
        data: {
          sourceLocationId: null,
          destinationLocationId: null,
          createdBy: null,
          movementType: null,
          id: mockMovement.id,
          item: {
            id: mockMovement.item?.id,
            currentQty: mockMovement.item?.currentQty,
          },
          quantity: mockMovement.quantity,
          type: mockMovement.type,
          reference: mockMovement.reference,
          reason: mockMovement.reason,
          merchant: {
            id: mockMerchant.id,
            name: mockMerchant.name,
          },
          createdAt: mockMovement.createdAt,
        },
      });
    });

    it('should throw NotFoundException if Movement ID is not found', async () => {
      const idNotFound = 999;
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(async () =>
        service.findOne(idNotFound, mockMerchant.id),
      ).rejects.toThrow('Movement not found');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('movement.id = :id', {
        id: idNotFound,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'movement.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(product.merchantId = :merchantId OR supply.company_id = :companyId)',
        { merchantId: mockMerchant.id, companyId: 1 },
      );
    });

    it('should throw BadRequestException if Movement ID is invalid', async () => {
      await expect(async () =>
        service.findOne(0, mockMerchant.id),
      ).rejects.toThrow('Movement ID is incorrect');

      await expect(async () =>
        service.findOne(-1, mockMerchant.id),
      ).rejects.toThrow('Movement ID is incorrect');

      await expect(async () =>
        service.findOne(null as any, mockMerchant.id),
      ).rejects.toThrow('Movement ID is incorrect');
    });
  });

  describe('Update', () => {
    it('only changes the descriptive fields of a movement', async () => {
      const movement: Movement = { ...mockMovement };
      mockQueryBuilder.getOne.mockResolvedValueOnce(movement);
      movementRepo.save.mockImplementationOnce((m) =>
        Promise.resolve(m as Movement),
      );
      const findOne = jest
        .spyOn(service, 'findOne')
        .mockResolvedValue({} as never);

      await service.update(1, mockMerchant.id, {
        reference: 'INV-77',
        reason: 'Typo in the reference',
      });

      expect(movementRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: 'INV-77',
          reason: 'Typo in the reference',
          quantity: mockMovement.quantity,
          type: mockMovement.type,
        }),
      );
      // the stock is not touched
      expect(itemRepo.save).not.toHaveBeenCalled();
      expect(findOne).toHaveBeenCalledWith(1, mockMerchant.id, 'Updated');
    });

    it('finds raw material movements through the company, like findOne', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce({ ...mockMovement });
      movementRepo.save.mockImplementationOnce((m) =>
        Promise.resolve(m as Movement),
      );
      jest.spyOn(service, 'findOne').mockResolvedValue({} as never);

      await service.update(1, mockMerchant.id, { reason: 'x' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(product.merchantId = :merchantId OR supply.company_id = :companyId)',
        { merchantId: mockMerchant.id, companyId: 1 },
      );
    });

    it('throws NotFoundException when the movement is not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(
        service.update(999, mockMerchant.id, { reason: 'x' }),
      ).rejects.toThrow('Movement not found');
      expect(movementRepo.save).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the ID is invalid', async () => {
      await expect(
        service.update(0, mockMerchant.id, { reason: 'x' }),
      ).rejects.toThrow('Movement ID is incorrect');
    });
  });

  describe('Remove (reversal)', () => {
    const reversed = {
      statusCode: 201,
      message: 'Movement Created successfully',
      data: { id: 2 },
    } as never;

    beforeEach(() => {
      (movementRepo as unknown as { exists: jest.Mock }).exists = jest
        .fn()
        .mockResolvedValue(false);
    });

    it('records the opposite movement and keeps the original in the kardex', async () => {
      const movement: Movement = { ...mockMovement };
      mockQueryBuilder.getOne.mockResolvedValueOnce(movement);
      const create = jest.spyOn(service, 'create').mockResolvedValue(reversed);

      const result = await service.remove(1, mockMerchant.id);

      expect(create).toHaveBeenCalledWith(mockMerchant.id, {
        stockItemId: mockItem.id,
        quantity: mockMovement.quantity,
        type: MovementsStatus.OUT,
        movementType: 'REVERSAL',
        reference: 'REV-1',
        reason: 'Reversal of movement #1',
      });
      expect(movement.isActive).toBe(true);
      expect(movementRepo.save).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        statusCode: 200,
        message: 'Movement #1 reversed successfully',
        data: { id: 2 },
      });
    });

    it('reverses an outflow with an inflow', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce({
        ...mockMovement,
        type: MovementsStatus.OUT,
        movementType: 'WASTE',
      });
      const create = jest.spyOn(service, 'create').mockResolvedValue(reversed);

      await service.remove(1, mockMerchant.id);

      expect(create).toHaveBeenCalledWith(
        mockMerchant.id,
        expect.objectContaining({ type: MovementsStatus.IN }),
      );
    });

    it('does not reverse the same movement twice', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce({ ...mockMovement });
      (movementRepo as unknown as { exists: jest.Mock }).exists = jest
        .fn()
        .mockResolvedValue(true);
      const create = jest.spyOn(service, 'create');

      await expect(service.remove(1, mockMerchant.id)).rejects.toThrow(
        ConflictException,
      );
      expect(create).not.toHaveBeenCalled();
    });

    it.each([
      [{ orderId: 5 }, 'a sale'],
      [{ type: MovementsStatus.OUT_FOR_SALE }, 'a sale'],
      [{ supplierInvoiceId: 3 }, 'a supplier invoice'],
      [{ reference: 'PO-12' }, 'a purchase order'],
      [{ movementType: 'TRANSFER' }, 'a transfer'],
      [{ reference: 'REV-9' }, 'a reversal'],
    ])(
      'refuses to reverse a movement generated by another document (%o)',
      async (fields, source) => {
        mockQueryBuilder.getOne.mockResolvedValueOnce({
          ...mockMovement,
          ...fields,
        });
        const create = jest.spyOn(service, 'create');

        await expect(service.remove(1, mockMerchant.id)).rejects.toThrow(
          `generated by ${source}`,
        );
        expect(create).not.toHaveBeenCalled();
      },
    );

    it('throws NotFoundException when the movement is not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(service.remove(999, mockMerchant.id)).rejects.toThrow(
        'Movement not found',
      );
    });

    it('throws BadRequestException when the ID is invalid', async () => {
      await expect(service.remove(0, mockMerchant.id)).rejects.toThrow(
        'Movement ID is incorrect',
      );
    });
  });
});
