// src/subscriptions/subscription-application/entity/subscription-application.entity.ts
import { ApiProperty } from '@nestjs/swagger';
import { MerchantSubscription } from 'src/platform-saas/subscriptions/merchant-subscriptions/entities/merchant-subscription.entity';
import { ApplicationEntity } from 'src/platform-saas/subscriptions/applications/entity/application-entity';
import { CompanySubscription } from 'src/platform-saas/subscriptions/company-subscriptions/entities/company-subscription.entity';
import {
  Entity,
  ManyToOne,
  JoinColumn,
  Column,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'subscription_applications' })
export class SubscriptionApplication {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Subscription-Application',
  })
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @ApiProperty({
    example: 'MyMerchantSubscription',
  })
  @ManyToOne(() => MerchantSubscription, { eager: true, nullable: true })
  @JoinColumn({ name: 'merchant_subscription_id' })
  merchantSubscription?: MerchantSubscription | null;

  @ApiProperty({ example: 'MyCompanySubscription', required: false })
  @ManyToOne(() => CompanySubscription, { eager: true, nullable: true })
  @JoinColumn({ name: 'company_subscription_id' })
  companySubscription?: CompanySubscription | null;

  @ApiProperty({
    example: 'MyApplication',
  })
  @ManyToOne(() => ApplicationEntity, { eager: true })
  @JoinColumn({ name: 'application_id' })
  application: ApplicationEntity;

  @ApiProperty({
    example: 'Active',
  })
  @Column({ type: 'varchar', length: 20 })
  status: string;
}
