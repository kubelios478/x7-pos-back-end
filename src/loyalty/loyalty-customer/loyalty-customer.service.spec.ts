import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyCustomerService } from './loyalty-customer.service';

describe('LoyaltyCustomerService', () => {
  let service: LoyaltyCustomerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoyaltyCustomerService],
    }).compile();

    service = module.get<LoyaltyCustomerService>(LoyaltyCustomerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
