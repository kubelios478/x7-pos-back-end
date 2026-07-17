//src/core/configuartion/merchant-overtime-rule/dto/create-merchant-overtime-rule.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { OvertimeCalculationType } from '../../constants/overtime-calculation-type.enum';
import { OvertimeRateType } from '../../constants/overtime-rate-type.enum';

export class CreateMerchantOvertimeRuleDto {
  @ApiProperty({
    example: 'Daily Overtime',
    description: 'Name of the merchant overtime rule',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiProperty({
    example: 'Standard daily overtime after threshold',
    description: 'Description of the merchant overtime rule',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description: string;

  @ApiProperty({
    example: 'daily',
    enum: OvertimeCalculationType,
    description:
      'Method used to calculate overtime (daily, weekly, holiday, special_day)',
  })
  @IsEnum(OvertimeCalculationType)
  @IsNotEmpty()
  calculationMethod: OvertimeCalculationType;

  @ApiProperty({
    example: 8,
    required: false,
    description:
      'Threshold hours for overtime calculation. Required when calculationMethod is daily or weekly; ignored (forced to null) otherwise.',
  })
  @IsOptional()
  @IsInt()
  thresholdHours?: number | null;

  @ApiProperty({
    example: 12,
    required: false,
    description:
      'Max hours per day for overtime calculation. Required when calculationMethod is daily or weekly; ignored (forced to null) otherwise.',
  })
  @IsOptional()
  @IsInt()
  maxHours?: number | null;

  @ApiProperty({
    example: 'percentage',
    enum: OvertimeRateType,
    description:
      'Method used to rate overtime (percentage, multiplier, fixed_amount)',
  })
  @IsEnum(OvertimeRateType)
  @IsNotEmpty()
  rateMethod: OvertimeRateType;

  @ApiProperty({
    example: 150,
    description:
      'Value used to calculate overtime pay based on the selected rate method (e.g., 150 for 150% if rate method is Percentage)',
  })
  @IsInt()
  @IsNotEmpty()
  rateValue: number;

  @ApiProperty({
    example: true,
    description: 'Indicates whether the overtime rule applies on holidays',
  })
  @IsBoolean()
  @IsNotEmpty()
  appliesOnHolidays: boolean;

  @ApiProperty({
    example: true,
    description: 'Indicates whether the overtime rule applies on weekends',
  })
  @IsBoolean()
  @IsNotEmpty()
  appliesOnWeekends: boolean;

  @ApiProperty({
    example: 1,
    description:
      'Priority of the overtime rule (lower number means higher priority)',
  })
  @IsInt()
  @IsNotEmpty()
  priority: number;
}
