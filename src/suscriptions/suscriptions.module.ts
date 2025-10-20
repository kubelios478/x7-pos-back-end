import { Module } from '@nestjs/common';
import { SuscriptionsController } from './suscriptions.controller';
import { SuscriptionsService } from './suscriptions.service';
import { SuscriptionPlanModule } from './suscription-plan/suscription-plan.module';
import { MerchantSuscriptionModule } from './merchant-suscriptions/merchant-suscription.module';
import { AplicationsModule } from './aplications/aplications.module';
import { PlanAplicationsModule } from './plan-aplications/plan-aplications.module';

@Module({
  controllers: [SuscriptionsController],
  providers: [SuscriptionsService],
  exports: [SuscriptionsService],
  imports: [
    SuscriptionPlanModule,
    MerchantSuscriptionModule,
    AplicationsModule,
    PlanAplicationsModule,
  ],
})
export class SuscriptionsModule {}
