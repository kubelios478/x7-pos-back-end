//src/core/configuration/merchant-tax-rule/dto/create-merchant-tax-rule.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  MaxLength,
  Min,
} from 'class-validator';
import { TaxType } from '../../constants/tax-type.enum';

export class CreateMerchantTaxRuleDto {
  @ApiProperty({
    example: 'Merchant tax rule name',
    description: 'Name of the merchant tax rule',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiProperty({
    example: 'Merchant tax rule description',
    description: 'Description of the merchant tax rule',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description: string;

  @ApiProperty({
    example: 'percentage',
    description: 'Type of Tax (e.g., percentage, fixed, compound)',
  })
  @IsEnum(TaxType)
  @IsNotEmpty()
  taxType: TaxType;

  @ApiProperty({
    example: 0.19,
    description:
      'Rate of the tax. For PERCENTAGE/COMPOUND, a decimal fraction (e.g. 0.19 for 19%) — not a whole percentage number. For FIXED, the monetary amount charged once per order.',
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  rate: number;

  @ApiProperty({
    example: true,
    description: 'the tax applies to tip',
  })
  @IsBoolean()
  @IsNotEmpty()
  appliesToTips: boolean;

  @ApiProperty({
    example: true,
    description: 'the tax applies to overtime',
  })
  @IsBoolean()
  @IsNotEmpty()
  appliesToOvertime: boolean;

  @ApiProperty({
    example: 'lfgtr-hhse',
    description: 'External Tax Code for Accounting/tax integration',
    required: false,
  })
  @IsString()
  @IsOptional()
  externalTaxCode?: string;
}
