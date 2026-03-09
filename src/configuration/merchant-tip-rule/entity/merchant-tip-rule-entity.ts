//src/configuration/merchant-tip-rule/entity/merchant-tp-rule-entity.ts
import { ChildEntity, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Configuration } from 'src/configuration/entity/configuration-entity';
import { TipCalculationMethod } from 'src/configuration/constants/tip-calculation-method.enum';
import { TipDistributionMethod } from 'src/configuration/constants/tip-distribution-method.enum';

@ChildEntity({ name: 'merchant_tip_rule' })
export class MerchantTipRule extends Configuration {
  @ApiProperty({
    example: 'Merchant tip rule name',
    description: 'Name of the merchant tip rule',
  })
  @Column({ type: 'varchar', length: 50 })
  name: string;

  @ApiProperty({
    example: 'Percentage',
    description:
      'Method used to calculate tips (e.g., Percentage, Fixed Amount)',
  })
  @Column({ type: 'enum', enum: TipCalculationMethod })
  tipCalculationMethod: TipCalculationMethod;

  @ApiProperty({
    example: 'Equal distribution',
    description:
      'Method used to distribute tips among staff (e.g., Equal distribution, Role-based distribution)',
  })
  @Column({ type: 'enum', enum: TipDistributionMethod })
  tipDistributionMethod: TipDistributionMethod;

  @Column({ type: 'int', array: true })
  suggestedPercentages?: number[];

  @Column({ type: 'int', array: true })
  fixedAmountOptions?: number[];

  @Column({ type: 'boolean' })
  allowCustomTip: boolean;

  @Column({ type: 'int' })
  maximumTipPercentage: number;

  @Column({ type: 'boolean' })
  includeKitchenStaff: boolean;

  @Column({ type: 'boolean' })
  includeManagers: boolean;

  @Column({ type: 'boolean' })
  autoDistribute: boolean;
}
