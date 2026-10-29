import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { SaleInventoryDeductionService } from './sale-inventory-deduction.service';
import { StockLevelMonitorService } from '../stock-alerts/stock-level-monitor.service';
import { Shift } from 'src/restaurant-operations/shift/shifts/entities/shift.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Movement } from 'src/inventory/products-inventory/stocks/movements/entities/movement.entity';
import { RecipeLineType } from 'src/inventory/products-inventory/recipes/constants/recipe-line-type.enum';

describe('SaleInventoryDeductionService', () => {
  let service: SaleInventoryDeductionService;

  const mockExecute = jest.fn();
  const mockQb = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: mockExecute,
  };

  const mockManager = {
    createQueryBuilder: jest.fn(() => mockQb),
  };

  const mockQueryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: mockManager,
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
    manager: {
      update: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn(),
    },
  };

  beforeEach(async () => {
    mockExecute.mockReset();
    mockQb.update.mockClear();
    const mockStockLevelMonitor = {
      evaluateStockItems: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaleInventoryDeductionService,
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: StockLevelMonitorService,
          useValue: mockStockLevelMonitor,
        },
      ],
    }).compile();
    service = module.get(SaleInventoryDeductionService);
  });

  it('should rollback and exit when order is not newly claimable', async () => {
    mockExecute.mockResolvedValue({ affected: 0, raw: [] });

    await service.processOrderFullyPaid({ orderId: 99 });

    expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    expect(mockDataSource.manager.update).not.toHaveBeenCalled();
  });

  describe('deductOrderManually', () => {
    beforeEach(() => {
      mockDataSource.manager.findOne.mockReset();
      mockQueryRunner.startTransaction.mockClear();
      mockQb.andWhere.mockClear();
    });

    it('answers 404 for an order of another merchant', async () => {
      mockDataSource.manager.findOne.mockResolvedValueOnce(null);

      await expect(service.deductOrderManually(1, 9)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('does not deduct an order twice (already deducted at checkout or by hand)', async () => {
      mockDataSource.manager.findOne.mockResolvedValueOnce({
        id: 9,
        inventory_consumed_at: new Date(),
      });

      await expect(service.deductOrderManually(1, 9)).rejects.toThrow(
        ConflictException,
      );
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('loses the claim race with a 409 and claims without requiring payment', async () => {
      mockDataSource.manager.findOne.mockResolvedValueOnce({
        id: 9,
        inventory_consumed_at: null,
      });
      mockExecute.mockResolvedValue({ affected: 0, raw: [] });

      await expect(service.deductOrderManually(1, 9)).rejects.toThrow(
        ConflictException,
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'inventory_consumed_at IS NULL',
      );
      expect(mockQb.andWhere).not.toHaveBeenCalledWith('is_paid = :paid', {
        paid: true,
      });
    });
  });

  describe('deducting with insufficient stock', () => {
    const flowQb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1, raw: [] }),
      getOne: jest.fn().mockResolvedValue(null), // no stock row at the location yet
    };
    const flowManager = {
      createQueryBuilder: jest.fn(() => flowQb),
      findOne: jest.fn((entity: { name: string }) => {
        const rows: Record<string, unknown> = {
          Order: { id: 9, merchant_id: 1, shift_id: null },
          Merchant: { id: 1, defaultSalesStockLocationId: 4, companyId: 2 },
          Location: { id: 4, merchantId: 1, isActive: true },
        };
        return Promise.resolve(rows[entity.name] ?? null);
      }),
      find: jest.fn((entity: { name: string }) => {
        const rows: Record<string, unknown[]> = {
          OrderItem: [{ id: 1, product_id: 10, variant_id: null, quantity: 2 }],
          OrderItemModifier: [],
          ProductRecipe: [
            {
              finishedProductId: 10,
              finishedVariantId: null,
              lines: [
                {
                  rawMaterialId: 7,
                  quantity: 5,
                  lineType: RecipeLineType.REQUIRED,
                  modifierId: null,
                },
              ],
            },
          ],
        };
        return Promise.resolve(rows[entity.name] ?? []);
      }),
      exists: jest.fn().mockResolvedValue(true), // the raw material is the company's
      create: jest.fn((_entity: unknown, data: object) => data),
      save: jest.fn((a: object, b?: object) =>
        Promise.resolve({ id: 33, ...(b ?? a) }),
      ),
    };

    beforeEach(() => {
      mockQueryRunner.manager = flowManager as never;
      jest
        .spyOn(
          service as unknown as {
            resolveWorkShiftId: () => Promise<number | null>;
          },
          'resolveWorkShiftId',
        )
        .mockResolvedValue(null);
    });

    afterEach(() => {
      mockQueryRunner.manager = mockManager;
    });

    it('still deducts the sale: the stock may go negative', async () => {
      await service.processOrderFullyPaid({ orderId: 9 });

      // the missing stock row is created at 0 and then deducted
      expect(flowManager.save).toHaveBeenCalledWith(
        expect.objectContaining({ supplyId: 7, locationId: 4, currentQty: 0 }),
      );
      // no "currentQty >= need" condition: the update always applies
      expect(flowQb.andWhere).not.toHaveBeenCalledWith(
        '"currentQty" >= :need',
        expect.anything(),
      );
      expect(flowManager.save).toHaveBeenCalledWith(
        Movement,
        expect.objectContaining({ stockItemId: 33, quantity: 10 }),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('resolveWorkShiftId', () => {
    const cashSaleQb = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    };
    const manager = {
      exists: jest.fn(),
      createQueryBuilder: jest.fn(() => cashSaleQb),
    };
    const resolve = (order: {
      id: number;
      merchant_id: number;
      shift_id: number | null;
    }) =>
      service['resolveWorkShiftId'](
        manager as unknown as EntityManager,
        order as never,
      );

    beforeEach(() => {
      manager.exists.mockReset();
      cashSaleQb.getRawOne.mockReset();
      cashSaleQb.andWhere.mockClear();
    });

    it("uses the work shift the order was taken in when it is the merchant's", async () => {
      manager.exists.mockResolvedValue(true);

      await expect(
        resolve({ id: 6, merchant_id: 5, shift_id: 15 }),
      ).resolves.toBe(15);
      expect(manager.exists).toHaveBeenCalledWith(Shift, {
        where: { id: 15, merchantId: 5 },
      });
      expect(manager.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("falls back to the cash sale drawer's shift of the same merchant", async () => {
      manager.exists.mockResolvedValue(false);
      cashSaleQb.getRawOne.mockResolvedValue({ shiftId: 15 });

      await expect(
        resolve({ id: 6, merchant_id: 5, shift_id: 2 }),
      ).resolves.toBe(15);
      expect(cashSaleQb.andWhere).toHaveBeenCalledWith(
        'cd.merchant_id = :merchantId',
        { merchantId: 5 },
      );
    });

    it('returns null when no work shift of the merchant can be resolved', async () => {
      cashSaleQb.getRawOne.mockResolvedValue(undefined);

      await expect(
        resolve({ id: 6, merchant_id: 5, shift_id: null }),
      ).resolves.toBeNull();
      expect(manager.exists).not.toHaveBeenCalled();
    });
  });
});
