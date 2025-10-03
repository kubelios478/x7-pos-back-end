// src/sub-plan/sub-plan.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubPlanService } from './sub-plan.service';
import { SubPlanController } from './sub-plan.controller';
import { SubPlan } from './entity/sub-plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SubPlan])],
  controllers: [SubPlanController],
  providers: [SubPlanService],
  exports: [SubPlanService],
})
export class SubPlanModule {}
