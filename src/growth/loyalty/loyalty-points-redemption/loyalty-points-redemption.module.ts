import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoyaltyPointsRedemptionService } from './loyalty-points-redemption.service';
import { LoyaltyPointsRedemptionController } from './loyalty-points-redemption.controller';
import { LoyaltyPointsLock } from './entities/loyalty-points-lock.entity';
import { LoyaltyRedemptionAuditLog } from './entities/loyalty-redemption-audit-log.entity';
import { LoyaltyCustomer } from '../loyalty-customer/entities/loyalty-customer.entity';
import { LoyaltyProgram } from '../loyalty-programs/entities/loyalty-program.entity';
import { LoyaltyPointTransaction } from '../loyalty-points-transaction/entities/loyalty-points-transaction.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { OrderPayment } from 'src/restaurant-operations/pos/order-payments/entities/order-payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LoyaltyPointsLock,
      LoyaltyRedemptionAuditLog,
      LoyaltyCustomer,
      LoyaltyProgram,
      LoyaltyPointTransaction,
      Order,
      OrderPayment,
    ]),
  ],
  controllers: [LoyaltyPointsRedemptionController],
  providers: [LoyaltyPointsRedemptionService],
  exports: [LoyaltyPointsRedemptionService],
})
export class LoyaltyPointsRedemptionModule {}
