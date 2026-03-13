//src/configuartion/merchant-overtime-rule/dto/create-merchant-overtime-rule.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsIn,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OvertimeCalculationType } from 'src/configuration/constants/overtime-calculation-type.enum';
import { OvertimeRateType } from 'src/configuration/constants/overtime-rate-type.enum';

export class CreateMerchantOvertimeRuleDto {
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
    example: 5,
    description: 'User ID who created the merchant overtime rule',
  })
  @IsInt()
  @IsNotEmpty()
  createdById: number;

  @ApiProperty({
    example: 5,
    description: 'User ID who last updated the merchant overtime rule',
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
    example: 'Merchant overtime rule name',
    description: 'Name of the merchant overtime rule',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Merchant overtime rule description',
    description: 'Description of the merchant overtime rule',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example: 'daily',
    description:
      'Method used to calculate overtime (e.g., Daily, weekly, holiday, special day)',
  })
  @IsEnum(OvertimeCalculationType)
  @IsNotEmpty()
  calculationMethod: OvertimeCalculationType;

  @ApiProperty({
    example: 8,
    description: 'threshold hours for overtime calculation',
  })
  @IsInt()
  @IsNotEmpty()
  thresholdHours: number;

  @ApiProperty({
    example: 8,
    description: 'max hours per day for overtime calculation',
  })
  @IsInt()
  @IsNotEmpty()
  maxHours: number;

  @ApiProperty({
    example: 'percentage',
    description:
      'Method used to rate overtime (e.g., Percentage, Multiplier, Fixed Amount)',
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
    description:
      'Indicates whether the overtime rule applies on holidays (true or false)',
  })
  @IsBoolean()
  @IsNotEmpty()
  appliesOnHolidays: boolean;

  @ApiProperty({
    example: true,
    description:
      'Indicates whether the overtime rule applies on weekends (true or false)',
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
