import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { LoyaltyCustomer } from '../../loyalty-customer/entities/loyalty-customer.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { LoyaltyPointsLockStatus } from '../constants/loyalty-points-lock-status.enum';

@Entity('loyalty_points_locks')
export class LoyaltyPointsLock {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ApiProperty({ example: 1 })
  @Column({ type: 'bigint', name: 'merchant_id' })
  merchant_id: number;

  @ApiProperty({ example: 1 })
  @Column({ type: 'bigint', name: 'loyalty_customer_id' })
  loyalty_customer_id: number;

  @ManyToOne(() => LoyaltyCustomer)
  @JoinColumn({ name: 'loyalty_customer_id' })
  loyaltyCustomer: LoyaltyCustomer;

  @ApiProperty({ example: 1 })
  @Column({ type: 'bigint', name: 'order_id' })
  order_id: number;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ApiProperty({
    example: 500,
    description: 'Number of points reserved for this order/payment attempt',
  })
  @Column({ type: 'int', name: 'reserved_points' })
  reserved_points: number;

  @ApiProperty({
    example: 5.0,
    description: 'Monetary amount reserved for redemption using points',
  })
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'reserved_amount',
  })
  reserved_amount: number;

  @ApiProperty({
    example: LoyaltyPointsLockStatus.RESERVED,
    enum: LoyaltyPointsLockStatus,
  })
  @Column({
    type: 'enum',
    enum: LoyaltyPointsLockStatus,
    default: LoyaltyPointsLockStatus.RESERVED,
  })
  status: LoyaltyPointsLockStatus;

  @ApiProperty({ example: 123 })
  @Column({ type: 'int', name: 'created_by_user_id' })
  created_by_user_id: number;

  @ApiProperty()
  @Column({ type: 'timestamp', name: 'expires_at' })
  expires_at: Date;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'timestamp', name: 'consumed_at', nullable: true })
  consumed_at: Date | null;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;
}
