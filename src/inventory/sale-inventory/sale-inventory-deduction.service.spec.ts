import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { SaleInventoryDeductionService } from './sale-inventory-deduction.service';
import { StockLevelMonitorService } from '../stock-alerts/stock-level-monitor.service';
import { Shift } from 'src/restaurant-operations/shift/shifts/entities/shift.entity';

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
