//src/subscriptions/plan-applications/plan-applications.module.ts
import { Module } from '@nestjs/common';
import { PlanApplicationsController } from './plan-applications.controller';
import { PlanApplicationsService } from './plan-applications.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanApplication } from './entity/plan-applications.entity';
import { ApplicationEntity } from '../applications/entity/application-entity';
import { SubscriptionPlan } from '../subscription-plan/entity/subscription-plan.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlanApplication,
      ApplicationEntity,
      SubscriptionPlan,
    ]),
  ],
  controllers: [PlanApplicationsController],
  providers: [PlanApplicationsService],
})
export class PlanApplicationsModule {}
