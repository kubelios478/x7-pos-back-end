import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Merchant } from '../../../../platform-saas/merchants/entities/merchant.entity'; // Assuming this path
import { LoyaltyTier } from '../../loyalty-tier/entities/loyalty-tier.entity'; // Added LoyaltyTier import
import { LoyaltyCustomer } from 'src/growth/loyalty/loyalty-customer/entities/loyalty-customer.entity';
import { LoyaltyReward } from 'src/growth/loyalty/loyalty-reward/entities/loyalty-reward.entity';
import { LoyaltyPointsRoundingMode } from '../../constants/loyalty-points-rounding-mode.enum';

@Entity('loyalty_programs')
export class LoyaltyProgram {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier for the loyalty program',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Merchant ID associated with the loyalty program',
  })
  @Column({ type: 'bigint', name: 'merchantId' })
  merchantId: number;

  @ManyToOne(() => Merchant)
  @JoinColumn({ name: 'merchantId' })
  merchant: Merchant;

  @ApiProperty({
    example: 'Gold Program',
    description: 'Name of the loyalty program',
  })
  @Column({ length: 100 })
  name: string;

  @ApiProperty({
    example: 'Earn points for every purchase',
    description: 'Description of the loyalty program',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  is_active: boolean;

  @ApiProperty({
    example: 1.0,
    description: 'Points earned per currency unit (e.g., 1 point per $1)',
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  points_per_currency: number;

  @ApiProperty({
    example: 100,
    description:
      'Points required to redeem 1 currency unit (e.g., 100 points = $1.00). Used to convert points to money at checkout.',
  })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'redeem_points_per_currency',
    default: 0.0,
  })
  redeem_points_per_currency: number;

  @ApiProperty({
    example: 100,
    description: 'Minimum points required to redeem a reward',
  })
  @Column({ default: 0 })
  min_points_to_redeem: number;

  @ApiProperty({
    example: 5,
    description:
      'Percent of net order value (subtotal minus discounts, excluding tax and tips) awarded as points. When null or 0, points_per_currency applies.',
    nullable: true,
  })
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'earn_rate_percent',
    nullable: true,
  })
  earn_rate_percent: number | null;

  @ApiProperty({
    example: LoyaltyPointsRoundingMode.NEAREST,
    enum: LoyaltyPointsRoundingMode,
    description: 'Rounding policy for earned points',
  })
  @Column({
    type: 'enum',
    enum: LoyaltyPointsRoundingMode,
    name: 'points_rounding_mode',
    default: LoyaltyPointsRoundingMode.NEAREST,
  })
  points_rounding_mode: LoyaltyPointsRoundingMode;

  @ApiProperty({
    example: '2023-01-01T12:00:00Z',
    description: 'Timestamp of when the loyalty program was created',
  })
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty({
    example: '2023-01-01T12:00:00Z',
    description: 'Timestamp of when the loyalty program was last updated',
  })
  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => LoyaltyTier, (loyaltyTier) => loyaltyTier.loyaltyProgram)
  loyaltyTiers: LoyaltyTier[];

  @OneToMany(
    () => LoyaltyCustomer,
    (loyaltyCustomer) => loyaltyCustomer.loyaltyProgram,
  )
  loyaltyCustomer: LoyaltyCustomer[];

  @OneToMany(
    () => LoyaltyReward,
    (loyaltyReward) => loyaltyReward.loyaltyProgram,
  )
  loyaltyReward: LoyaltyReward[];
}
