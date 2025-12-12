import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyTierController } from './loyalty-tier.controller';
import { LoyaltyTierService } from './loyalty-tier.service';

describe('LoyaltyTierController', () => {
  let controller: LoyaltyTierController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoyaltyTierController],
      providers: [LoyaltyTierService],
    }).compile();

    controller = module.get<LoyaltyTierController>(LoyaltyTierController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
