//src/configuration/merchant-overtime-rule/entity/merchant-overtime-rule.entity.ts
import { ChildEntity, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Configuration } from 'src/configuration/entity/configuration-entity';
import { OvertimeCalculationType } from 'src/configuration/constants/overtime-calculation-type.enum';
import { OvertimeRateType } from 'src/configuration/constants/overtime-rate-type.enum';

@ChildEntity({ name: 'merchant_overtime_rule' })
export class MerchantOvertimeRule extends Configuration {
  @ApiProperty({
    example: 'Merchant overtime rule name',
    description: 'Name of the merchant overtime rule',
  })
  @Column({ type: 'varchar', length: 50 })
  name: string;

  @ApiProperty({
    example: 'Merchant overtime rule description',
    description: 'Description of the merchant overtime rule',
  })
  @Column({ type: 'varchar', length: 200 })
  description: string;

  @ApiProperty({
    example: 'Daily',
    description:
      'Method used to calculate overtime (e.g., Daily, weekly, holiday, special day)',
  })
  @Column({ type: 'enum', enum: OvertimeCalculationType })
  calculationMethod: OvertimeCalculationType;

  @ApiProperty({
    example: 8,
    description: 'threshold hours for overtime calculation',
  })
  @Column({ type: 'int', nullable: true })
  thresholdHours: number;

  @ApiProperty({
    example: 8,
    description: 'max hours per day for overtime calculation',
  })
  @Column({ type: 'int', nullable: true })
  maxHours: number;

  @ApiProperty({
    example: 'Percentage',
    description:
      'Method used to rate overtime (e.g., Percentage, Multiplier, Fixed Amount)',
  })
  @Column({ type: 'enum', enum: OvertimeRateType })
  rateMethod: OvertimeRateType;

  @ApiProperty({
    example: 150,
    description:
      'Value used to calculate overtime pay based on the selected rate method (e.g., 150 for 150% if rate method is Percentage)',
  })
  @Column({ type: 'int' })
  rateValue: number;

  @ApiProperty({
    example: true,
    description:
      'Indicates whether the overtime rule applies on holidays (true or false)',
  })
  @Column({ type: 'boolean' })
  appliesOnHolidays: boolean;

  @ApiProperty({
    example: true,
    description:
      'Indicates whether the overtime rule applies on weekends (true or false)',
  })
  @Column({ type: 'boolean' })
  appliesOnWeekends: boolean;

  @ApiProperty({
    example: 1,
    description:
      'Priority of the overtime rule (lower number means higher priority)',
  })
  @Column({ type: 'int' })
  priority: number;
}
