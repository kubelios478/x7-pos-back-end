import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { LoyaltyProgram } from '../../loyalty-programs/entities/loyalty-program.entity';
import { LoyaltyTierBenefit } from '../constants/loyalty-tier-benefit.enum';
import { LoyaltyCustomer } from '../../loyalty-customer/entities/loyalty-customer.entity';

@Entity('loyalty_tiers')
export class LoyaltyTier {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier for the loyalty tier',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Loyalty program ID associated with the tier',
  })
  @Column({ type: 'int', name: 'loyalty_program_id' })
  loyalty_program_id: number;

  @ManyToOne(() => LoyaltyProgram)
  @JoinColumn({ name: 'loyalty_program_id' })
  loyaltyProgram: LoyaltyProgram;

  @ApiProperty({
    example: 'Silver Tier',
    description: 'Name of the loyalty tier',
  })
  @Column({ length: 100 })
  name: string;

  @ApiProperty({
    example: 1,
    description:
      'Level of the loyalty tier (e.g., 1 for base, 2 for next, etc.)',
  })
  @Column({ type: 'int', nullable: true })
  level: number;

  @ApiProperty({
    example: 100,
    description: 'Minimum points required to reach this tier',
  })
  @Column({ type: 'int' })
  min_points: number;

  @ApiProperty({
    example: 1.25,
    description: 'Point multiplier for this tier (e.g., 1.25 for 1.25x points)',
  })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  multiplier: number;

  @ApiProperty({
    type: [String],
    enum: LoyaltyTierBenefit,
    example: [LoyaltyTierBenefit.DISCOUNT, LoyaltyTierBenefit.FREE_DELIVERY],
    description: 'JSON array of benefits for this tier',
    nullable: true,
  })
  @Column({ type: 'simple-array', nullable: true })
  benefits: LoyaltyTierBenefit[];

  @Column({ default: true })
  is_active: boolean;

  @ApiProperty({
    example: '2023-01-01T12:00:00Z',
    description: 'Timestamp of when the loyalty tier was created',
  })
  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => LoyaltyCustomer, (lc) => lc.loyaltyTier)
  loyaltyCustomers: LoyaltyCustomer[];
}
