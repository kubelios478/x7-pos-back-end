//src/subscriptions/subscription-plan/dto/paginated-subscription-plan.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlanResponseDto } from './subscription-plan-response.dto';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

export class PaginatedSubscriptionPlanResponseDto extends SuccessResponse {
  @ApiProperty({
    description: 'List of subscription plans',
    type: [SubscriptionPlanResponseDto],
  })
  data: SubscriptionPlanResponseDto[];

  @ApiProperty({
    description: 'Pagination info',
    example: {
      total: 42,
      page: 1,
      limit: 10,
      totalPages: 5,
    },
  })
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
