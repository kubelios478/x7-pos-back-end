import { Module } from '@nestjs/common';
import { LoyaltyTierService } from './loyalty-tier.service';
import { LoyaltyTierController } from './loyalty-tier.controller';

@Module({
  controllers: [LoyaltyTierController],
  providers: [LoyaltyTierService],
})
export class LoyaltyTierModule {}
