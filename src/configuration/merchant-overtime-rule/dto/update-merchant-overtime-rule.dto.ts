//src/configuartion/merchant-overtime-rule/dto/update-merchant-overtime-rule.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateMerchantOvertimeRuleDto } from './create-merchant-overtime-rule.dto';

export class UpdateMerchantOvertimeRuleDto extends PartialType(
  CreateMerchantOvertimeRuleDto,
) {}
