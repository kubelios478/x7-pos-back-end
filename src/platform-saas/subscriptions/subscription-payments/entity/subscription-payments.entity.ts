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
import { MerchantSubscription } from 'src/platform-saas/subscriptions/merchant-subscriptions/entities/merchant-subscription.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { SubscriptionPlan } from '../../subscription-plan/entity/subscription-plan.entity';
import { CompanySubscription } from '../../company-subscriptions/entities/company-subscription.entity';

@Entity('subscription_payments')
export class SubscriptionPayment {
  @ApiProperty({
    example: 1,
    description: 'Unique Identifier of the Subscription Payment',
  })
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @ManyToOne(() => MerchantSubscription, { eager: true, nullable: true })
  @JoinColumn({ name: 'merchant_subscription_id' })
  merchantSubscription?: MerchantSubscription | null;

  @ManyToOne(() => CompanySubscription, { eager: true, nullable: true })
  @JoinColumn({ name: 'company_subscription_id' })
  companySubscription?: CompanySubscription | null;

  @ApiProperty({
    example: 1,
    description: 'Company identifier',
    required: false,
  })
  @Column({ type: 'int', name: 'company_id', nullable: true })
  company_id?: number | null;

  @ManyToOne(() => Company, { eager: false, nullable: true })
  @JoinColumn({ name: 'company_id' })
  company?: Company | null;

  @ApiProperty({
    example: 1,
    description: 'Selected subscription plan identifier',
    required: false,
  })
  @Column({ type: 'bigint', name: 'plan_id', nullable: true })
  plan_id?: number | null;

  @ManyToOne(() => SubscriptionPlan, { eager: true, nullable: true })
  @JoinColumn({ name: 'plan_id' })
  plan?: SubscriptionPlan | null;

  @ApiProperty({
    example: 'ext_123',
    description: 'External transaction identifier for auditing',
    required: false,
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  external_transaction_id?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  raw_payload?: Record<string, unknown> | null;

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
