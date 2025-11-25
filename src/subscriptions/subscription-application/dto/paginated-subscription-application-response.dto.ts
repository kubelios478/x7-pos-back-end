//src/subscriptions/subscription-application/dto/paginated-subscription-application-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { SubscriptionApplicationResponseDto } from './subscription-application-response.dto';

export class PaginatedSubscriptionApplicationResponseDto extends SuccessResponse {
  @ApiProperty({
    description: 'List of Subscription Application',
    type: [SubscriptionApplicationResponseDto],
  })
  data: SubscriptionApplicationResponseDto[];

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
