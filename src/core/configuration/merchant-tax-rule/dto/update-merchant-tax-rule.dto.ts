//src/core/configuration/merchant-tax-rule/dto/update-merchant-tax-rule.dto.ts
import { PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { CreateMerchantTaxRuleDto } from './create-merchant-tax-rule.dto';

export class UpdateMerchantTaxRuleDto extends PartialType(
  CreateMerchantTaxRuleDto,
) {
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}
