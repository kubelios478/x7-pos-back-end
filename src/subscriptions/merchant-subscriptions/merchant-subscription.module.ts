//src/subscriptions/merchant-subscriptions/merchant-subscription.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MerchantSuscriptionService } from './merchant-subscription.service';
import { MerchantSubscriptionController } from './merchant-subscription.controller';
import { MerchantSubscription } from './entities/merchant-subscription.entity';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { SubscriptionPlan } from '../subscription-plan/entity/subscription-plan.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MerchantSubscription,
      Merchant,
      SubscriptionPlan,
    ]),
  ],
  controllers: [MerchantSubscriptionController],
  providers: [MerchantSuscriptionService],
})
export class MerchantSubscriptionModule {}
