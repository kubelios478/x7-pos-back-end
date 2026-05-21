import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { SaleInventoryDeductionService } from './sale-inventory-deduction.service';
import { StockLevelMonitorService } from '../stock-alerts/stock-level-monitor.service';

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
});
