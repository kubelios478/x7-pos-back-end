import { Test, TestingModule } from '@nestjs/testing';
import { CashDrawerHistoryController } from './cash-drawer-history.controller';
import { CashDrawerHistoryService } from './cash-drawer-history.service';

describe('CashDrawerHistoryController', () => {
  let controller: CashDrawerHistoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CashDrawerHistoryController],
      providers: [CashDrawerHistoryService],
    }).compile();

    controller = module.get<CashDrawerHistoryController>(CashDrawerHistoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
