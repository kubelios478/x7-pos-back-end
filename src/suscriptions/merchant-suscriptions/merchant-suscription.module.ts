import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MerchantSuscriptionService } from './merchant-suscription.service';
import { MerchSubController } from './merchant-suscription.controller';

// Entidades
import { MerchantSuscription } from './entities/merchant-suscription.entity';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { SuscriptionPlan } from '../suscription-plan/entity/suscription-plan.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MerchantSuscription, Merchant, SuscriptionPlan]),
  ],
  controllers: [MerchSubController],
  providers: [MerchantSuscriptionService],
})
export class MerchantSuscriptionModule {}
