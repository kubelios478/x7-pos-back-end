//src/subscriptions/plan-applications/entity/plan-applications.entity.ts
import { ApplicationEntity } from 'src/subscriptions/applications/entity/application-entity';
import { SubscriptionPlan } from 'src/subscriptions/subscription-plan/entity/subscription-plan.entity';
import {
  Entity,
  ManyToOne,
  JoinColumn,
  Column,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: 'plan_applications' })
export class PlanApplication {
  @ApiProperty({
    example: 1,
    description:
      'Unique identifier of the Subscription Plan related to this Plan-Application',
  })
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @ApiProperty({
    example: 'MySubscriptionPlan',
  })
  @ManyToOne(() => SubscriptionPlan, { eager: true })
  @JoinColumn({ name: 'subscriptionplan_id' })
  subscriptionPlan: SubscriptionPlan;

  @ApiProperty({
    example: 'MyApplication',
  })
  @ManyToOne(() => ApplicationEntity, { eager: true })
  @JoinColumn({ name: 'application_id' })
  application: ApplicationEntity;

  @ApiProperty({
    example: 'Basic usage limit: 100 users per month',
  })
  @Column({ type: 'varchar', length: 50 })
  limits: string;

  @ApiProperty({
    example: 'active',
    description: 'Status of the subscription plan',
  })
  @Column({ type: 'varchar', length: 50 })
  status: string;
}
