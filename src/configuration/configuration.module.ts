import { Module } from '@nestjs/common';
import { ConfigurationController } from './configuration.controller';
import { ConfigurationService } from './configuration.service';
import { MerchantTipRuleModule } from './merchant-tip-rule/merchant-tip-rule.module';

@Module({
  imports: [MerchantTipRuleModule],
  controllers: [ConfigurationController],
  providers: [ConfigurationService],
})
export class ConfigurationModule {}
