// src/subscriptions/subscription-payments/subscription-payments.module.ts
import { Module } from '@nestjs/common';
import { SubscriptionPaymentsController } from './subscription-payments.controller';
import { SubscriptionPaymentsService } from './subscription-payments.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPayment } from './entity/subscription-payments.entity';
import { MerchantSubscription } from '../merchant-subscriptions/entities/merchant-subscription.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { SubscriptionPlan } from '../subscription-plan/entity/subscription-plan.entity';
import { CompanySubscription } from '../company-subscriptions/entities/company-subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionPayment,
      MerchantSubscription,
      Merchant,
      SubscriptionPlan,
      CompanySubscription,
    ]),
  ],
  controllers: [SubscriptionPaymentsController],
  providers: [SubscriptionPaymentsService],
})
export class SubscriptionPaymentsModule {}
