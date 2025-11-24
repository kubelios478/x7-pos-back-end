// src/subscription/plan-features/plan-features.module.ts
import { Module } from '@nestjs/common';
import { PlanFeaturesController } from './plan-features.controller';
import { PlanFeaturesService } from './plan-features.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPlan } from '../subscription-plan/entity/subscription-plan.entity';
import { FeatureEntity } from '../features/entity/features.entity';
import { PlanFeature } from './entity/plan-features.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SubscriptionPlan, FeatureEntity, PlanFeature]),
  ],
  controllers: [PlanFeaturesController],
  providers: [PlanFeaturesService],
})
export class PlanFeaturesModule {}
