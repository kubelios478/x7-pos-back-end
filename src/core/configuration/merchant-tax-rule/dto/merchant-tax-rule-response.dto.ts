//src/core/configuartion/merchant-tax-rule/dto/merchant-tax-rule-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { MerchantTaxRule } from '../entity/merchant-tax-rule.entity';
import { Configuration } from '../../entity/configuration-entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';

export class MerchantTaxRuleResponseDto extends Configuration {
  @ApiProperty({
    example: 'default',
    description: 'Unique identifier of the merchant tax rule',
  })
  id: number;

  @ApiProperty({
    example: 'name',
    description: 'id of the company related to the merchant tax rule',
  })
  company: Company;

  @ApiProperty({
    example: 'name',
    description: 'id of the merchant related to the merchant tax rule',
  })
  merchant: Merchant;

  @ApiProperty({
    example: '26-09-2023',
    description: 'Date when the merchant tax rule was created',
  })
  createdAt: Date;

  @ApiProperty({
    example: '26-09-2023',
    description: 'Date when the merchant tax rule was last updated',
  })
  updatedAt: Date;

  @ApiProperty({
    type: () => User,
    description: 'User who created the merchant tax rule',
  })
  createdBy: User;

  @ApiProperty({
    type: () => User,
    description: 'User who last updated the merchant tax rule',
  })
  updatedBy: User;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  status: string;

  @ApiProperty({ example: 'name' })
  name: string;

  @ApiProperty({
    example: 'Merchant tax rule description',
    description: 'Description of the merchant tax rule',
  })
  description: string;

  @ApiProperty({
    example: 'percentage',
    description: 'Type of Tax (e.g., percentage, fixed, compound)',
  })
  taxType: string;

  @ApiProperty({
    example: 0.19,
    description: 'Rate of the tax',
  })
  rate: number;

  @ApiProperty({
    example: true,
    description: 'the tax applies to tip',
  })
  appliesToTips: boolean;

  @ApiProperty({
    example: true,
    description: 'the tax applies to overtime',
  })
  appliesToOvertime: boolean;

  @ApiProperty({
    example: true,
    description: 'It is calculated on another tax',
  })
  isCompound: boolean;

  @ApiProperty({
    example: 'lfgtr-hhse',
    description: 'External Tax Code for Accounting/tax integration',
  })
  externalTaxCode: string;
}

export class OneMerchantTaxRuleResponseDto extends SuccessResponse {
  @ApiProperty()
  data: MerchantTaxRule;
}

export class AllMerchantTaxRuleResponseDto extends SuccessResponse {
  @ApiProperty()
  data: MerchantTaxRule[];
}
