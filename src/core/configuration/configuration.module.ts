import { Module } from '@nestjs/common';
import { ConfigurationController } from './configuration.controller';
import { ConfigurationService } from './configuration.service';
import { MerchantTaxRuleModule } from './merchant-tax-rule/merchant-tax-rule.module';
import { MerchantTipRuleModule } from './merchant-tip-rule/merchant-tip-rule.module';
import { MerchantPayrollRuleModule } from './merchant-payroll-rule/merchant-payroll-rule.module';
import { MerchantOvertimeRuleModule } from './merchant-overtime-rule/merchant-overtime-rule.module';

@Module({
  imports: [
    MerchantTipRuleModule,
    MerchantOvertimeRuleModule,
    MerchantPayrollRuleModule,
    MerchantTaxRuleModule,
  ],
  exports: [
    MerchantTipRuleModule,
    MerchantOvertimeRuleModule,
    MerchantPayrollRuleModule,
    MerchantTaxRuleModule,
  ],
  controllers: [ConfigurationController],
  providers: [ConfigurationService],
})
export class ConfigurationModule {}
