//src/core/configuartion/merchant-tax-rule/dto/create-merchant-tax-rule.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsIn,
  IsDate,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaxType } from '../../constants/tax-type.enum';

export class CreateMerchantTaxRuleDto {
  @ApiProperty({
    example: 1,
    description: 'Identifier of the related company',
  })
  @IsInt()
  companyId: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the related merchant',
  })
  @IsInt()
  merchantId: number;

  @ApiProperty({
    example: '26-09-2023',
    description: 'Date when the merchant tax rule was created',
  })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  createdAt: Date;

  @ApiProperty({
    example: '26-09-2023',
    description: 'Date when the merchant tax rule was last updated',
  })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  updatedAt: Date;

  @ApiProperty({
    example: 5,
    description: 'User ID who created the merchant tax rule',
  })
  @IsInt()
  @IsNotEmpty()
  createdById: number;

  @ApiProperty({
    example: 5,
    description: 'User ID who last updated the merchant tax rule',
  })
  @IsInt()
  @IsNotEmpty()
  updatedById: number;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive'])
  status: string;

  @ApiProperty({
    example: 'Merchant tax rule name',
    description: 'Name of the merchant tax rule',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Merchant tax rule description',
    description: 'Description of the merchant tax rule',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example: 'percentage',
    description: 'Type of Tax (e.g., percentage, fixed, compound)',
  })
  @IsEnum(TaxType)
  @IsNotEmpty()
  taxType: TaxType;

  @ApiProperty({
    example: 19,
    description: 'Rate of the tax',
  })
  @IsNumber()
  @IsNotEmpty()
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
    example: true,
    description: 'It is calculated on another tax',
  })
  @IsBoolean()
  @IsNotEmpty()
  isCompound: boolean;

  @ApiProperty({
    example: 'lfgtr-hhse',
    description: 'External Tax Code for Accounting/tax integration',
  })
  @IsString()
  @IsNotEmpty()
  externalTaxCode: string;
}
