//src/subscriptions/subscription-payment/dto/paginated-subscription-payment.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { SubscriptionPaymentResponseDto } from './subscription-payments-response.dto';

export class PaginatedSubscriptionPaymentResponseDto extends SuccessResponse {
  @ApiProperty({ type: [SubscriptionPaymentResponseDto] })
  data: SubscriptionPaymentResponseDto[];

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
