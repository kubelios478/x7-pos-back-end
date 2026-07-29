//src/core/configuration/dto/create-merchant-tip-rule.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsArray,
  IsBoolean,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { TipCalculationMethod } from '../../constants/tip-calculation-method.enum';
import { TipDistributionMethod } from '../../constants/tip-distribution-method.enum';

export class CreateMerchantTipRuleDto {
  @ApiProperty({
    example: 'Merchant tip rule name',
    description: 'Name of the merchant tip rule',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'percentage',
    description:
      'Method used to calculate tips (e.g., Percentage, Fixed Amount)',
  })
  @IsEnum(TipCalculationMethod)
  @IsNotEmpty()
  tipCalculationMethod: TipCalculationMethod;

  @ApiProperty({
    example: 'pool',
    description:
      'Method used to distribute tips among staff (e.g., Equal distribution, Role-based distribution)',
  })
  @IsEnum(TipDistributionMethod)
  @IsNotEmpty()
  tipDistributionMethod: TipDistributionMethod;

  @ApiProperty({
    example: [0.08, 0.02, 0.01],
    description: 'Suggested tip percentages for customers to choose from',
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @Max(1, { each: true })
  @IsNotEmpty()
  suggestedPercentages?: number[];

  @ApiProperty({
    example: [5, 10, 15],
    description: 'Fixed tip amount options for customers to choose from',
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  fixedAmountOptions?: number[];

  @ApiProperty({
    example: true,
    description: 'Whether to allow customers to enter a custom tip amount',
  })
  @IsBoolean()
  @IsNotEmpty()
  allowCustomTip: boolean;

  @ApiProperty({
    example: 50,
    description:
      'Maximum tip percentage allowed when using percentage-based calculation',
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Max(100)
  maximumTipPercentage: number;

  @ApiProperty({
    example: true,
    description:
      'Whether to automatically distribute tips to staff based on the defined rules',
  })
  @IsBoolean()
  @IsNotEmpty()
  autoDistribute: boolean;

  @IsOptional()
  @IsNumber()
  staffPercentage?: number;

  @IsOptional()
  @IsNumber()
  kitchenPercentage?: number;

  @IsOptional()
  @IsNumber()
  managerPercentage?: number;
}
