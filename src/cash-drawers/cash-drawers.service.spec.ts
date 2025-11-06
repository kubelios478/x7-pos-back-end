import { Test, TestingModule } from '@nestjs/testing';
import { CashDrawersService } from './cash-drawers.service';

describe('CashDrawersService', () => {
  let service: CashDrawersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CashDrawersService],
    }).compile();

    service = module.get<CashDrawersService>(CashDrawersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
