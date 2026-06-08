import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('loyalty_redemption_audit_logs')
export class LoyaltyRedemptionAuditLog {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ApiProperty({ example: 1 })
  @Column({ type: 'bigint', name: 'merchant_id' })
  merchant_id: number;

  @ApiProperty({ example: 1 })
  @Column({ type: 'bigint', name: 'order_id' })
  order_id: number;

  @ApiProperty({ example: 1 })
  @Column({ type: 'bigint', name: 'loyalty_customer_id' })
  loyalty_customer_id: number;

  @ApiProperty({ example: 1 })
  @Column({ type: 'bigint', name: 'loyalty_points_lock_id' })
  loyalty_points_lock_id: number;

  @ApiProperty({
    example: 123,
    description: 'Cashier userId that authorized the redemption',
  })
  @Column({ type: 'int', name: 'cashier_user_id' })
  cashier_user_id: number;

  @ApiProperty({ example: 500 })
  @Column({ type: 'int', name: 'redeemed_points' })
  redeemed_points: number;

  @ApiProperty({ example: 5.0 })
  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'redeemed_amount' })
  redeemed_amount: number;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;
}
