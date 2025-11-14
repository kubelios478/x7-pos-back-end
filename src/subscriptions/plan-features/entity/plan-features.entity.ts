// src/subscriptions/plan-features/entity/plan-features.entity.ts
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlan } from 'src/subscriptions/subscription-plan/entity/subscription-plan.entity';
import { FeatureEntity } from 'src/subscriptions/features/entity/features.entity';
import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity({ name: 'plan_features' })
export class PlanFeature {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Plan Features',
  })
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  planFeature: number;

  @ApiProperty({
    example: 'MySubscriptionPlan',
  })
  @ManyToOne(() => SubscriptionPlan, { eager: true })
  @JoinColumn({ name: 'subscription_plan_id' })
  subscriptionPlan: SubscriptionPlan;

  @ApiProperty({
    example: 'MyFeature',
  })
  @ManyToOne(() => FeatureEntity, { eager: true })
  @JoinColumn({ name: 'feature_id' })
  feature: FeatureEntity;

  @ApiProperty({
    example: '10990',
  })
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  limit_value: number;

  @ApiProperty({
    example: 'active',
    description: 'Status of the subscription plan',
  })
  @Column({ type: 'varchar', length: 50 })
  status: string;
}
