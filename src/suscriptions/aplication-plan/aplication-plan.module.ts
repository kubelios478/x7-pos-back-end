import { Module } from '@nestjs/common';
import { AplicationPlanController } from './aplication-plan.controller';
import { AplicationPlanService } from './aplication-plan.service';

@Module({
  controllers: [AplicationPlanController],
  providers: [AplicationPlanService]
})
export class AplicationPlanModule {}
