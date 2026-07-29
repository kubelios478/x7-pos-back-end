import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsBoolean, IsInt, IsNotEmpty, MaxLength, IsOptional, Min, Max } from 'class-validator';
import { PayrollFrequency } from '../../constants/payroll-frequency.enum';

export class CreateMerchantPayrollRuleDto {
  @ApiProperty({
    example: 'Standard Biweekly Payroll',
    description: 'Name of the merchant payroll rule',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiProperty({
    example: 'biweekly',
    enum: PayrollFrequency,
    description: 'Frequency of the Payroll (e.g., weekly, biweekly, monthly, custom)',
  })
  @IsEnum(PayrollFrequency)
  @IsNotEmpty()
  frequencyPayroll: PayrollFrequency;

  @ApiProperty({
    example: 1,
    required: false,
    description:
      'Day of the Pay in the Week (1-7). Required when frequencyPayroll is weekly or biweekly; ignored (forced to null) otherwise.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  payDayOfWeek?: number | null;

  @ApiProperty({
    example: 31,
    required: false,
    description:
      'Day of the Pay in the Month (1-31). Required when frequencyPayroll is monthly; ignored (forced to null) otherwise.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  payDayOfMonth?: number | null;

  @ApiProperty({
    example: true,
    description: 'Payroll Negative is Allowed?',
  })
  @IsBoolean()
  @IsNotEmpty()
  allowNegativePayroll: boolean;

  @ApiProperty({
    example: 2,
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
  @MaxLength(10)
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
