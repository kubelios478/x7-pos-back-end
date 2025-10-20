import { Module } from '@nestjs/common';
import { PlanAplicationsController } from './plan-aplications.controller';
import { PlanAplicationsService } from './plan-aplications.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanAplication } from './entity/plan-aplications.entity';
import { AplicationEntity } from '../aplications/entity/aplication-entity';
import { SuscriptionPlan } from '../suscription-plan/entity/suscription-plan.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlanAplication,
      AplicationEntity,
      SuscriptionPlan,
    ]),
  ],
  controllers: [PlanAplicationsController],
  providers: [PlanAplicationsService],
})
export class PlanAplicationsModule {}
