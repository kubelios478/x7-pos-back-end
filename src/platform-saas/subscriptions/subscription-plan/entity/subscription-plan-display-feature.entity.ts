import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SubscriptionPlan } from './subscription-plan.entity';

@Entity({ name: 'subscription_plan_display_feature' })
export class SubscriptionPlanDisplayFeature {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ name: 'subscription_plan_id', type: 'bigint' })
  subscriptionPlanId: number;

  @ManyToOne(() => SubscriptionPlan, (plan) => plan.displayFeatures, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'subscription_plan_id' })
  subscriptionPlan: SubscriptionPlan;

  @ApiProperty({ example: 'Unlimited Terminals' })
  @Column({ type: 'varchar', length: 255 })
  label: string;

  @ApiProperty({ example: 1 })
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
