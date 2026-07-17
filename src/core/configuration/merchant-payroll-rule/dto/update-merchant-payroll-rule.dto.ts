import { PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { CreateMerchantPayrollRuleDto } from './create-merchant-payroll-rule.dto';

export class UpdateMerchantPayrollRuleDto extends PartialType(
  CreateMerchantPayrollRuleDto,
) {
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}
