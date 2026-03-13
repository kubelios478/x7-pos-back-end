//src/configuration/merchant-tip-rule/merchant-tip-rule.module.ts
import { Module } from '@nestjs/common';
import { MerchantTipRuleController } from './merchant-tip-rule.controller';
import { MerchantTipRuleService } from './merchant-tip-rule.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from 'src/companies/entities/company.entity';
import { MerchantTipRule } from './entity/merchant-tip-rule-entity';
import { Configuration } from '../entity/configuration-entity';
import { User } from 'src/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, MerchantTipRule, Configuration, User]),
  ],
  controllers: [MerchantTipRuleController],
  providers: [MerchantTipRuleService],
  exports: [MerchantTipRuleService],
})
export class MerchantTipRuleModule {}
