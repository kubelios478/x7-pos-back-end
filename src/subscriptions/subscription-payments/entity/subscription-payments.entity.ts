//src/subscriptions/subscription-payments/entity/subscription-payments.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { MerchantSubscription } from 'src/subscriptions/merchant-subscriptions/entities/merchant-subscription.entity';

@Entity('subscription_payments')
export class SubscriptionPayment {
  @ApiProperty({
    example: 1,
    description: 'Unique Identifier of the Subscription Payment',
  })
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @ManyToOne(() => MerchantSubscription, { eager: true })
  @JoinColumn({ name: 'merchant_subscription_id' })
  merchantSubscription: MerchantSubscription;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10 })
  currency: string;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  @CreateDateColumn({ name: 'payment_date', type: 'timestamp' })
  paymentDate: Date;

  @Column({ type: 'varchar', length: 50, name: 'payment_method' })
  paymentMethod: string;
}
