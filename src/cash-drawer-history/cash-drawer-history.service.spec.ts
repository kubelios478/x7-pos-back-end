import { Test, TestingModule } from '@nestjs/testing';
import { CashDrawerHistoryService } from './cash-drawer-history.service';

describe('CashDrawerHistoryService', () => {
  let service: CashDrawerHistoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CashDrawerHistoryService],
    }).compile();

    service = module.get<CashDrawerHistoryService>(CashDrawerHistoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
