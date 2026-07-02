//src/subscriptions/subscription-plan/entity/subscription-plan.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPlanDisplayFeature } from './subscription-plan-display-feature.entity';

@Entity('subscription_plan')
export class SubscriptionPlan {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the subscription plan',
  })
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @ApiProperty({
    example: 'Professional',
    description: 'Public display name of the subscription plan',
  })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiPropertyOptional({
    example: 'professional',
    description: 'Stable slug used by onboarding and APIs',
  })
  @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
  slug?: string | null;

  @ApiPropertyOptional({
    example: 'Full Restaurant',
    description: 'Marketing badge shown on plan cards',
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  badge?: string | null;

  @ApiProperty({
    example: 'For full service restaurants with table operations',
    description: 'Description of the subscription plan',
  })
  @Column({ type: 'text' })
  description: string;

  @ApiPropertyOptional({
    example: 149.0,
    description:
      'List price. Null when isCustomPricing is true (negotiated per client).',
  })
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  price: number | null;

  @ApiPropertyOptional({
    example: 'ANNUAL BILLING',
    description: 'Secondary price label for custom-priced plans',
  })
  @Column({ name: 'price_label', type: 'varchar', length: 100, nullable: true })
  priceLabel?: string | null;

  @ApiProperty({
    example: 'monthly',
    description: 'Billing cycle of the subscription plan',
  })
  @Column({ type: 'varchar', length: 50 })
  billingCycle: string;

  @ApiProperty({
    example: 'active',
    description: 'Status of the subscription plan',
  })
  @Column({ type: 'varchar', length: 50 })
  status: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Highlights this plan as recommended in onboarding',
  })
  @Column({ type: 'boolean', default: false })
  recommended: boolean;

  @ApiPropertyOptional({
    example: false,
    description:
      'When true, list price is negotiated per client (Enterprise). price may be null.',
  })
  @Column({ name: 'is_custom_pricing', type: 'boolean', default: false })
  isCustomPricing: boolean;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/plans/professional.png',
  })
  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl?: string | null;

  @OneToMany(
    () => SubscriptionPlanDisplayFeature,
    (feature) => feature.subscriptionPlan,
  )
  displayFeatures: SubscriptionPlanDisplayFeature[];
}
