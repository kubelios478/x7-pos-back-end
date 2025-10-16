import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MerchSubService } from './merch-sub.service';
import { MerchSubController } from './merch-sub.controller';

// Entidades
import { MerchSub } from './entities/merch-sub.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { SubPlan } from '../sub-plan/entity/sub-plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MerchSub, Merchant, SubPlan])],
  controllers: [MerchSubController],
  providers: [MerchSubService],
})
export class MerchSubModule {}
