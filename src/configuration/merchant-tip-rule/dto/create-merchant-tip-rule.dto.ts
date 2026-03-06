//src/configuration/dto/create-merchant-tip-rule.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsArray,
  IsBoolean,
  IsNumber,
  IsInt,
  IsNotEmpty,
  IsIn,
  IsDate,
} from 'class-validator';
import { TipCalculationMethod } from 'src/configuration/constants/tip-calculation-method.enum';
import { TipDistributionMethod } from 'src/configuration/constants/tip-distribution-method.enum';
import { Type } from 'class-transformer';

export class CreateMerchantTipRuleDto {
  @ApiProperty({
    example: 1,
    description: 'Identifier of the related company',
  })
  @IsInt()
  companyId: number;

  @ApiProperty({
    example: '26-09-2023',
    description: 'Date when the merchant tip rule was created',
  })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  createdAt: Date;

  @ApiProperty({
    example: '26-09-2023',
    description: 'Date when the merchant tip rule was last updated',
  })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  updatedAt: Date;

  @ApiProperty({
    example: 'Created by user',
    description: 'User who created the merchant tip rule',
  })
  @IsString()
  @IsNotEmpty()
  createdBy: string;

  @ApiProperty({
    example: 'Updated by user',
    description: 'User who last updated the merchant tip rule',
  })
  @IsString()
  @IsNotEmpty()
  updatedBy: string;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive'])
  status: string;

  @ApiProperty({
    example: 'Merchant tip rule name',
    description: 'Name of the merchant tip rule',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'percentage',
    description:
      'Method used to calculate tips (e.g., Percentage, Fixed Amount)',
  })
  @IsEnum(TipCalculationMethod)
  tipCalculationMethod: TipCalculationMethod;

  @ApiProperty({
    example: 'pool',
    description:
      'Method used to distribute tips among staff (e.g., Equal distribution, Role-based distribution)',
  })
  @IsEnum(TipDistributionMethod)
  tipDistributionMethod: TipDistributionMethod;

  @ApiProperty({
    example: [10, 15, 20],
    description: 'Suggested tip percentages for customers to choose from',
  })
  @IsArray()
  @IsNumber({}, { each: true })
  suggestedPercentages?: number[];

  @ApiProperty({
    example: [5, 10, 15],
    description: 'Fixed tip amount options for customers to choose from',
  })
  @IsArray()
  @IsNumber({}, { each: true })
  fixedAmountOptions?: number[];

  @ApiProperty({
    example: true,
    description: 'Whether to allow customers to enter a custom tip amount',
  })
  @IsBoolean()
  allowCustomTip: boolean;

  @ApiProperty({
    example: 50,
    description:
      'Maximum tip percentage allowed when using percentage-based calculation',
  })
  @IsNumber()
  maximumTipPercentage: number;

  @ApiProperty({
    example: false,
    description: 'Whether to include kitchen staff in tip distribution',
  })
  @IsBoolean()
  includeKitchenStaff: boolean;

  @ApiProperty({
    example: true,
    description: 'Whether to include managers in tip distribution',
  })
  @IsBoolean()
  includeManagers: boolean;

  @ApiProperty({
    example: true,
    description:
      'Whether to automatically distribute tips to staff based on the defined rules',
  })
  @IsBoolean()
  autoDistribute: boolean;
}
