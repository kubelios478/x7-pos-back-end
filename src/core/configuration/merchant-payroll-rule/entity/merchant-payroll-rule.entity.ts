//src/core/configuration/merchant-payroll-rule/entity/merchant-payroll-rule.entity.ts
import { ChildEntity, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Configuration } from '../../entity/configuration-entity';
import { PayrollFrequency } from '../../constants/payroll-frequency.enum';

@ChildEntity({ name: 'merchant_payroll_rule' })
export class MerchantPayrollRule extends Configuration {
  @ApiProperty({
    example: 'Merchant payroll rule name',
    description: 'Name of the merchant payroll rule',
  })
  @Column({ type: 'varchar', length: 50 })
  name: string;

  @ApiProperty({
    example: 'Daily',
    description:
      'Frequency of the Payroll (e.g., weekly, biweekly, monthly, custom)',
  })
  @Column({ type: 'enum', enum: PayrollFrequency })
  frequencyPayroll: PayrollFrequency;

  @ApiProperty({
    example: 1,
    description: 'Day of the Pay in the Week',
  })
  @Column({ type: 'int', nullable: true })
  payDayOfWeek: number;

  @ApiProperty({
    example: 31,
    description: 'Day of the Pay in the Month',
  })
  @Column({ type: 'int', nullable: true })
  payDayOfMonth: number;

  @ApiProperty({
    example: true,
    description: 'Payroll Negative is Allowed?',
  })
  @Column({ type: 'boolean' })
  allowNegativePayroll: boolean;

  @ApiProperty({
    example: 31,
    description: 'Number of decimal places to round',
  })
  @Column({ type: 'int' })
  roundingPrecision: number;

  @ApiProperty({
    example: 'Currency in ISO',
    description: 'CLP, USD, JPY, etc.',
  })
  @Column({ type: 'varchar', length: 10 })
  currency: string;

  @ApiProperty({
    example: true,
    description: 'Automatic Payroll Approval',
  })
  @Column({ type: 'boolean' })
  autoApprovePayroll: boolean;

  @ApiProperty({
    example: true,
    description: 'The payroll requires manager approval',
  })
  @Column({ type: 'boolean' })
  requiresManagerApproval: boolean;
}
