import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoyaltyAnalyticsService } from './loyalty-analytics.service';
import { LoyaltyAnalyticsController } from './loyalty-analytics.controller';
import { LoyaltyProgram } from '../loyalty-programs/entities/loyalty-program.entity';
import { LoyaltyCustomer } from '../loyalty-customer/entities/loyalty-customer.entity';
import { LoyaltyPointTransaction } from '../loyalty-points-transaction/entities/loyalty-points-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LoyaltyProgram,
      LoyaltyCustomer,
      LoyaltyPointTransaction,
    ]),
  ],
  controllers: [LoyaltyAnalyticsController],
  providers: [LoyaltyAnalyticsService],
  exports: [LoyaltyAnalyticsService],
})
export class LoyaltyAnalyticsModule {}
