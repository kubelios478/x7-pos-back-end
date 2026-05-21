import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StockLevelMonitorService } from './stock-level-monitor.service';
import { Item } from '../products-inventory/stocks/items/entities/item.entity';
import { InventoryStockAlert } from './entities/inventory-stock-alert.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { InventoryStockAlertType } from './constants/inventory-stock-alert-type.enum';
import { InventoryStockAlertStatus } from './constants/inventory-stock-alert-status.enum';
import { INVENTORY_STOCK_ALERT_EVENT } from './inventory-stock.events';

describe('StockLevelMonitorService', () => {
  let service: StockLevelMonitorService;
  const emit = jest.fn();

  const itemRepo = {
    find: jest.fn(),
  };
  const alertRepo = {
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn((x: InventoryStockAlert) => x),
    update: jest.fn(),
  };
  const merchantRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockLevelMonitorService,
        { provide: getRepositoryToken(Item), useValue: itemRepo },
        {
          provide: getRepositoryToken(InventoryStockAlert),
          useValue: alertRepo,
        },
        { provide: getRepositoryToken(Merchant), useValue: merchantRepo },
        { provide: EventEmitter2, useValue: { emit } },
      ],
    }).compile();
    service = module.get(StockLevelMonitorService);
    merchantRepo.findOne.mockResolvedValue({ id: 1, companyId: 10 });
  });

  it('emits LOW when crossing into low band', async () => {
    const item = {
      id: 5,
      productId: 20,
      variantId: 30,
      locationId: 40,
      currentQty: 8,
      minimumQty: 10,
      isActive: true,
      product: { merchantId: 1, categoryId: 2, name: 'Flour' },
      variant: { name: 'Default' },
      location: { name: 'Main' },
    };
    itemRepo.find.mockResolvedValue([item]);
    alertRepo.find.mockResolvedValue([]);
    alertRepo.save.mockResolvedValue({ id: 99 });

    await service.evaluateStockItems(1, [5]);

    expect(emit).toHaveBeenCalledWith(
      INVENTORY_STOCK_ALERT_EVENT,
      expect.objectContaining({
        alertType: InventoryStockAlertType.LOW,
        currentQty: 8,
        minimumQty: 10,
      }),
    );
  });

  it('does not emit when state unchanged', async () => {
    const item = {
      id: 5,
      productId: 20,
      variantId: 30,
      locationId: 40,
      currentQty: 8,
      minimumQty: 10,
      isActive: true,
      product: { merchantId: 1, categoryId: 2, name: 'Flour' },
      variant: { name: 'Default' },
      location: { name: 'Main' },
    };
    itemRepo.find.mockResolvedValue([item]);
    alertRepo.find.mockResolvedValue([
      {
        alertType: InventoryStockAlertType.LOW,
        status: InventoryStockAlertStatus.ACTIVE,
      },
    ]);

    await service.evaluateStockItems(1, [5]);

    expect(emit).not.toHaveBeenCalled();
  });

  it('resolves alerts when stock recovers above minimum', async () => {
    const item = {
      id: 5,
      productId: 20,
      variantId: 30,
      locationId: 40,
      currentQty: 50,
      minimumQty: 10,
      isActive: true,
      product: { merchantId: 1, categoryId: 2, name: 'Flour' },
      variant: { name: 'Default' },
      location: { name: 'Main' },
    };
    itemRepo.find.mockResolvedValue([item]);
    alertRepo.find.mockResolvedValue([
      {
        alertType: InventoryStockAlertType.LOW,
        status: InventoryStockAlertStatus.ACTIVE,
      },
    ]);

    await service.evaluateStockItems(1, [5]);

    expect(alertRepo.update).toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });
});
