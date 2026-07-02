//src/subscriptions/subscription-plan/dto/subscription-plan-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { SubscriptionPlan } from '../entity/subscription-plan.entity';

export class SubscriptionPlanResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Professional' })
  name: string;

  @ApiPropertyOptional({ example: 'professional' })
  slug?: string | null;

  @ApiPropertyOptional({ example: 'Full Restaurant' })
  badge?: string | null;

  @ApiProperty({ example: 'Full restaurant operations' })
  description: string;

  @ApiPropertyOptional({
    example: 149.0,
    nullable: true,
    description: 'Null when isCustomPricing is true',
  })
  price: number | null;

  @ApiPropertyOptional({ example: 'ANNUAL BILLING' })
  priceLabel?: string | null;

  @ApiProperty({ example: 'monthly' })
  billingCycle: string;

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiPropertyOptional({ example: true })
  recommended?: boolean;

  @ApiPropertyOptional({ example: false })
  isCustomPricing?: boolean;

  @ApiPropertyOptional()
  imageUrl?: string | null;
}

export class OneSubscriptionPlanResponseDto extends SuccessResponse {
  @ApiProperty()
  data: SubscriptionPlan;
}

export class AllSubscriptionPlanResponseDto extends SuccessResponse {
  @ApiProperty()
  data: SubscriptionPlan[];
}
