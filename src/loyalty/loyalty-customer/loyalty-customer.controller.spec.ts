import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyCustomerController } from './loyalty-customer.controller';
import { LoyaltyCustomerService } from './loyalty-customer.service';

describe('LoyaltyCustomerController', () => {
  let controller: LoyaltyCustomerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoyaltyCustomerController],
      providers: [LoyaltyCustomerService],
    }).compile();

    controller = module.get<LoyaltyCustomerController>(LoyaltyCustomerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
