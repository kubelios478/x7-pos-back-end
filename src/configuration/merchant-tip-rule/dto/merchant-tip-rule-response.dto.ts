//src/configuration/merchant-tip-rule/dto/merchant-tip-rule-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { MerchantTipRule } from '../entity/merchant-tip-rule-entity';
import { Configuration } from 'src/configuration/entity/configuration-entity';
import { Company } from 'src/companies/entities/company.entity';
import { User } from 'src/users/entities/user.entity';
export class MerchantTipRuleResponseDto extends Configuration {
  @ApiProperty({
    example: 'default',
    description: 'Unique identifier of the merchant tip rule',
  })
  id: number;

  @ApiProperty({
    example: 'name',
    description: 'id of the company related to the merchant tip rule',
  })
  company: Company;

  @ApiProperty({
    example: '26-09-2023',
    description: 'Date when the merchant tip rule was created',
  })
  createdAt: Date;

  @ApiProperty({
    example: '26-09-2023',
    description: 'Date when the merchant tip rule was last updated',
  })
  updatedAt: Date;

  @ApiProperty({
    type: () => User,
    description: 'User who created the merchant tip rule',
  })
  createdBy: User;

  @ApiProperty({
    type: () => User,
    description: 'User who last updated the merchant tip rule',
  })
  updatedBy: User;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  status: string;

  @ApiProperty({ example: 'name' })
  name: string;

  @ApiProperty({
    example: 'Percentage',
    description:
      'Method used to calculate tips (e.g., Percentage, Fixed Amount)',
  })
  tipCalculationMethod: string;

  @ApiProperty({
    example: 'Equal distribution',
    description:
      'Method used to distribute tips among staff (e.g., Equal distribution, Role-based distribution)',
  })
  tipDistributionMethod: string;

  @ApiProperty({
    example: [10, 15, 20],
    description: 'Suggested tip percentages for customers to choose from',
  })
  suggestedPercentages?: number[];

  @ApiProperty({
    example: [5, 10, 15],
    description: 'Fixed tip amount options for customers to choose from',
  })
  fixedAmountOptions?: number[];

  @ApiProperty({
    example: true,
    description: 'Whether to allow customers to enter a custom tip amount',
  })
  allowCustomTip: boolean;

  @ApiProperty({
    example: 50,
    description: 'Maximum tip percentage allowed for customers',
  })
  maximumTipPercentage: number;

  @ApiProperty({
    example: true,
    description: 'Whether to include kitchen staff in tip distribution',
  })
  includeKitchenStaff: boolean;

  @ApiProperty({
    example: true,
    description: 'Whether to include managers in tip distribution',
  })
  includeManagers: boolean;

  @ApiProperty({
    example: true,
    description:
      'Whether to automatically distribute tips to staff based on the defined rules',
  })
  autoDistribute: boolean;
}

export class OneMerchantTipRuleResponseDto extends SuccessResponse {
  @ApiProperty()
  data: MerchantTipRule;
}

export class AllMerchantTipRuleResponseDto extends SuccessResponse {
  @ApiProperty()
  data: MerchantTipRule[];
}
