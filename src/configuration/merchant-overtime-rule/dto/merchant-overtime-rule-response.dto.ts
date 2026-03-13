//src/configuration/merchant-overtime-rule/dto/merchant-overtime-rule-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { MerchantOvertimeRule } from '../entity/merchant-overtime-rule.entity';
import { Configuration } from 'src/configuration/entity/configuration-entity';
import { Company } from 'src/companies/entities/company.entity';
import { User } from 'src/users/entities/user.entity';

export class MerchantOvertimeRuleResponseDto extends Configuration {
  @ApiProperty({
    example: 'default',
    description: 'Unique identifier of the merchant overtime rule',
  })
  id: number;

  @ApiProperty({
    example: 'name',
    description: 'id of the company related to the merchant overtime rule',
  })
  company: Company;

  @ApiProperty({
    example: '26-09-2023',
    description: 'Date when the merchant overtime rule was created',
  })
  createdAt: Date;

  @ApiProperty({
    example: '26-09-2023',
    description: 'Date when the merchant overtime rule was last updated',
  })
  updatedAt: Date;

  @ApiProperty({
    type: () => User,
    description: 'User who created the merchant overtime rule',
  })
  createdBy: User;

  @ApiProperty({
    type: () => User,
    description: 'User who last updated the merchant overtime rule',
  })
  updatedBy: User;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  status: string;

  @ApiProperty({ example: 'name' })
  name: string;

  @ApiProperty({
    example: 'Merchant overtime rule description',
    description: 'Description of the merchant overtime rule',
  })
  description: string;

  @ApiProperty({
    example: 'Percentage',
    description:
      'Method used to calculate overtime (e.g., Percentage, Fixed Amount)',
  })
  calculationMethod: string;

  @ApiProperty({
    example: 8,
    description: 'threshold hours for overtime calculation',
  })
  thresholdHours: number;

  @ApiProperty({
    example: 8,
    description: 'max hours per day for overtime calculation',
  })
  maxHours: number;

  @ApiProperty({
    example: 'Percentage',
    description:
      'Method used to rate overtime (e.g., Percentage, Multiplier, Fixed Amount)',
  })
  rateMethod: string;

  @ApiProperty({
    example: 150,
    description:
      'Value used to calculate overtime pay based on the selected rate method (e.g., 150 for 150% if rate method is Percentage)',
  })
  rateValue: number;

  @ApiProperty({
    example: true,
    description:
      'Indicates whether the overtime rule applies on holidays (true or false)',
  })
  appliesOnHolidays: boolean;

  @ApiProperty({
    example: true,
    description:
      'Indicates whether the overtime rule applies on weekends (true or false)',
  })
  appliesOnWeekends: boolean;

  @ApiProperty({
    example: 1,
    description:
      'Priority of the overtime rule (lower number means higher priority)',
  })
  priority: number;
}

export class OneMerchantOvertimeRuleResponseDto extends SuccessResponse {
  @ApiProperty()
  data: MerchantOvertimeRule;
}

export class AllMerchantOvertimeRulesResponseDto extends SuccessResponse {
  @ApiProperty()
  data: MerchantOvertimeRule[];
}
