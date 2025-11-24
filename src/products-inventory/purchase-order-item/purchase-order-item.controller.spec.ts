import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseOrderItemController } from './purchase-order-item.controller';
import { PurchaseOrderItemService } from './purchase-order-item.service';

describe('PurchaseOrderItemController', () => {
  let controller: PurchaseOrderItemController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchaseOrderItemController],
      providers: [PurchaseOrderItemService],
    }).compile();

    controller = module.get<PurchaseOrderItemController>(PurchaseOrderItemController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
