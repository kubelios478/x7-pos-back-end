// src/subscriptions/subscription-payments/subscription-payments.module.ts
import { Module } from '@nestjs/common';
import { SubscriptionPaymentsController } from './subscription-payments.controller';
import { SubscriptionPaymentsService } from './subscription-payments.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPayment } from './entity/subscription-payments.entity';
import { MerchantSubscription } from '../merchant-subscriptions/entities/merchant-subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SubscriptionPayment, MerchantSubscription]),
  ],
  controllers: [SubscriptionPaymentsController],
  providers: [SubscriptionPaymentsService],
})
export class SubscriptionPaymentsModule {}
