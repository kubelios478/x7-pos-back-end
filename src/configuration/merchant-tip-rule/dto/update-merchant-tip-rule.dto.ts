//src/configuration/merchant-tip-rule/dto/update-merchant-tip-rule.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateMerchantTipRuleDto } from './create-merchant-tip-rule.dto';

export class UpdateMerchantTipRuleDto extends PartialType(
  CreateMerchantTipRuleDto,
) {}
