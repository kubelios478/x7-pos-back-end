import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { LoyaltyProgram } from '../loyalty-programs/entities/loyalty-program.entity';
import { LoyaltyCustomer } from '../loyalty-customer/entities/loyalty-customer.entity';
import { LoyaltyPointTransaction } from '../loyalty-points-transaction/entities/loyalty-points-transaction.entity';
import { LoyaltyTier } from '../loyalty-tier/entities/loyalty-tier.entity';
import { OrderLoyaltyWalletService } from './order-loyalty-wallet.service';
import { OrderFullyPaidLoyaltyListener } from './order-fully-paid-loyalty.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      LoyaltyProgram,
      LoyaltyCustomer,
      LoyaltyPointTransaction,
      LoyaltyTier,
    ]),
  ],
  providers: [OrderLoyaltyWalletService, OrderFullyPaidLoyaltyListener],
  exports: [OrderLoyaltyWalletService],
})
export class OrderLoyaltyWalletModule {}
