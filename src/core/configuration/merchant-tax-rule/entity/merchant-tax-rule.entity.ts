//src/core/configuration/merchant-tax-rule/entity/merchant-tax-rule.entity.ts
import { ChildEntity, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Configuration } from '../../entity/configuration-entity';
import { TaxType } from '../../constants/tax-type.enum';

@ChildEntity({ name: 'merchant_tax_rule' })
export class MerchantTaxRule extends Configuration {
  @ApiProperty({
    example: 'Merchant tax rule name',
    description: 'Name of the merchant tax rule',
  })
  @Column({ type: 'varchar', length: 50 })
  name: string;

  @ApiProperty({
    example: 'Merchant tax rule description',
    description: 'Description of the merchant tax rule',
  })
  @Column({ type: 'varchar', length: 200 })
  description: string;

  @ApiProperty({
    example: 'percentage',
    description: 'Type of Tax (e.g., percentage, fixed, compound)',
  })
  @Column({ type: 'enum', enum: TaxType, nullable: true })
  taxType: TaxType;

  @ApiProperty({
    example: 19,
    description: 'Rate of the tax',
  })
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
  })
  rate: number;

  @ApiProperty({
    example: true,
    description: 'the tax applies to tip',
  })
  @Column({ type: 'boolean', nullable: true })
  appliesToTips: boolean;

  @ApiProperty({
    example: true,
    description: 'the tax applies to overtime',
  })
  @Column({ type: 'boolean', nullable: true })
  appliesToOvertime: boolean;

  @ApiProperty({
    example: true,
    description: 'It is calculated on another tax',
  })
  @Column({ type: 'boolean', nullable: true })
  isCompound: boolean;

  @ApiProperty({
    example: 'lfgtr-hhse',
    description: 'External Tax Code for Accounting/tax integration',
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  externalTaxCode: string;
}
