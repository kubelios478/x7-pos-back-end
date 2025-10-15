// src/sub-plan/sub-plan.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuscriptionPlanService } from './suscription-plan.service';
import { SuscriptionPlanController } from './suscription-plan.controller';
import { SuscriptionPlan } from './entity/suscription-plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SuscriptionPlan])],
  controllers: [SuscriptionPlanController],
  providers: [SuscriptionPlanService],
  exports: [SuscriptionPlanService],
})
export class SuscriptionPlanModule {}
