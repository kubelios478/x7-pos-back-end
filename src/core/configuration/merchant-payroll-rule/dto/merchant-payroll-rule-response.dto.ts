//src/core/configuartion/merchant-payroll-rule/dto/merchant-payroll-rule-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { MerchantPayrollRule } from '../entity/merchant-payroll-rule.entity';
import { Configuration } from '../../entity/configuration-entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';

export class MerchantPayrollRuleResponseDto extends Configuration {
  @ApiProperty({
    example: 'default',
    description: 'Unique identifier of the merchant payroll rule',
  })
  id: number;

  @ApiProperty({
    example: 'name',
    description: 'id of the company related to the merchant payroll rule',
  })
  company: Company;

  @ApiProperty({
    example: 'name',
    description: 'id of the merchant related to the merchant payroll rule',
  })
  merchant: Merchant;

  @ApiProperty({
    example: '26-09-2023',
    description: 'Date when the merchant payroll rule was created',
  })
  createdAt: Date;

  @ApiProperty({
    example: '26-09-2023',
    description: 'Date when the merchant payroll rule was last updated',
  })
  updatedAt: Date;

  @ApiProperty({
    type: () => User,
    description: 'User who created the merchant payroll rule',
  })
  createdBy: User;

  @ApiProperty({
    type: () => User,
    description: 'User who last updated the merchant payroll rule',
  })
  updatedBy: User;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  status: string;

  @ApiProperty({ example: 'name' })
  name: string;

  @ApiProperty({
    example: 'weekly',
    description:
      'Frequency of the Payroll (e.g., weekly, biweekly, monthly, custom)',
  })
  frequencyPayroll: string;

  @ApiProperty({
    example: 1,
    description: 'Day of the Pay in the Week',
  })
  payDayOfWeek: number;

  @ApiProperty({
    example: 31,
    description: 'Day of the Pay in the Month',
  })
  payDayOfMonth: number;

  @ApiProperty({
    example: true,
    description: 'Payroll Negative is Allowed?',
  })
  allowNegativePayroll: boolean;

  @ApiProperty({
    example: 31,
    description: 'Number of decimal places to round',
  })
  roundingPrecision: number;

  @ApiProperty({
    example: 'Currency in ISO',
    description: 'CLP, USD, JPY, etc.',
  })
  currency: string;

  @ApiProperty({
    example: true,
    description: 'Automatic Payroll Approval',
  })
  autoApprovePayroll: boolean;

  @ApiProperty({
    example: true,
    description: 'The payroll requires manager approval',
  })
  requiresManagerApproval: boolean;
}

export class OneMerchantPayrollRuleResponseDto extends SuccessResponse {
  @ApiProperty()
  data: MerchantPayrollRule;
}

export class AllMerchantPayrollRuleResponseDto extends SuccessResponse {
  @ApiProperty()
  data: MerchantPayrollRule[];
}
