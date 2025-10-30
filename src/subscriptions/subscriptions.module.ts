import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionPlanModule } from './subscription-plan/subscription-plan.module';
import { MerchantSubscriptionModule } from './merchant-subscriptions/merchant-subscription.module';
import { ApplicationsModule } from './applications/applications.module';
import { PlanApplicationsModule } from './plan-applications/plan-applications.module';
import { SubscriptionApplicationModule } from './subscription-application/subscription-application.module';

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
  imports: [
    SubscriptionPlanModule,
    MerchantSubscriptionModule,
    ApplicationsModule,
    PlanApplicationsModule,
    SubscriptionApplicationModule,
  ],
})
export class SubscriptionsModule {}
