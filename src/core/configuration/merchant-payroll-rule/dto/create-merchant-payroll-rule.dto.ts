//src/core/configuartion/merchant-payroll-rule/dto/create-merchant-payroll-rule.dto.ts
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
import { PayrollFrequency } from '../../constants/payroll-frequency.enum';

export class CreateMerchantPayrollRuleDto {
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
    description: 'Date when the merchant payroll rule was created',
  })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  createdAt: Date;

  @ApiProperty({
    example: '26-09-2023',
    description: 'Date when the merchant payroll rule was last updated',
  })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  updatedAt: Date;

  @ApiProperty({
    example: 5,
    description: 'User ID who created the merchant payroll rule',
  })
  @IsInt()
  @IsNotEmpty()
  createdById: number;

  @ApiProperty({
    example: 5,
    description: 'User ID who last updated the merchant payroll rule',
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
    example: 'Merchant payroll rule name',
    description: 'Name of the merchant payroll rule',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'weekly',
    description:
      'Frequency of the Payroll (e.g., weekly, biweekly, monthly, custom)',
  })
  @IsEnum(PayrollFrequency)
  @IsNotEmpty()
  frequencyPayroll: PayrollFrequency;

  @ApiProperty({
    example: 1,
    description: 'Day of the Pay in the Week',
  })
  @IsInt()
  @IsNotEmpty()
  payDayOfWeek: number;

  @ApiProperty({
    example: 31,
    description: 'Day of the Pay in the Month',
  })
  @IsInt()
  @IsNotEmpty()
  payDayOfMonth: number;

  @ApiProperty({
    example: true,
    description: 'Payroll Negative is Allowed?',
  })
  @IsBoolean()
  @IsNotEmpty()
  allowNegativePayroll: boolean;

  @ApiProperty({
    example: 31,
    description: 'Number of decimal places to round',
  })
  @IsInt()
  @IsNotEmpty()
  roundingPrecision: number;

  @ApiProperty({
    example: 'CLP',
    description: 'CLP, USD, JPY, etc.',
  })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({
    example: true,
    description: 'Automatic Payroll Approval',
  })
  @IsBoolean()
  @IsNotEmpty()
  autoApprovePayroll: boolean;

  @ApiProperty({
    example: true,
    description: 'The payroll requires manager approval',
  })
  @IsBoolean()
  @IsNotEmpty()
  requiresManagerApproval: boolean;
}
