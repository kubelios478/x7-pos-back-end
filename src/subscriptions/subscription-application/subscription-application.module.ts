// src/subscriptions/subscription-application/subscription-application.module.ts
import { Module } from '@nestjs/common';
import { SubscriptionApplicationController } from './subscription-application.controller';
import { SubscriptionApplicationService } from './subscription-application.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionApplication } from './entity/subscription-application.entity';
import { MerchantSubscription } from '../merchant-subscriptions/entities/merchant-subscription.entity';
import { ApplicationEntity } from '../applications/entity/application-entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionApplication,
      MerchantSubscription,
      ApplicationEntity,
    ]),
  ],
  controllers: [SubscriptionApplicationController],
  providers: [SubscriptionApplicationService],
})
export class SubscriptionApplicationModule {}
