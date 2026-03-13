//src/configuration/merchant-overtime-rule/merchant-overtime-rule.module.ts
import { Module } from '@nestjs/common';
import { MerchantOvertimeRuleController } from './merchant-overtime-rule.controller';
import { MerchantOvertimeRuleService } from './merchant-overtime-rule.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from 'src/companies/entities/company.entity';
import { MerchantOvertimeRule } from './entity/merchant-overtime-rule.entity';
import { Configuration } from '../entity/configuration-entity';
import { User } from 'src/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Company,
      MerchantOvertimeRule,
      Configuration,
      User,
    ]),
  ],
  controllers: [MerchantOvertimeRuleController],
  providers: [MerchantOvertimeRuleService],
  exports: [MerchantOvertimeRuleService],
})
export class MerchantOvertimeRuleModule {}
