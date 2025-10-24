//src/subscriptions/subscription-plan/dto/subscription-plan-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { SubscriptionPlan } from '../entity/subscription-plan.entity';

export class SubscriptionPlanResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Basic Plan' })
  name: string;

  @ApiProperty({ example: 'Unlimited Acces' })
  description: string;

  @ApiProperty({ example: 9.99 })
  price: number;

  @ApiProperty({ example: 'monthly' })
  billingCycle: string;

  @ApiProperty({ example: 'active' })
  status: string;
}

export class OneSubscriptionPlanResponseDto extends SuccessResponse {
  @ApiProperty()
  data: SubscriptionPlan;
}

export class AllSubscriptionPlanResponseDto extends SuccessResponse {
  @ApiProperty()
  data: SubscriptionPlan[];
}
