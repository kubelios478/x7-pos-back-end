//src/subscriptions/plan-applications/dto/paginated-plan-application-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { PlanApplicationSummaryDto } from './summary-plan-applications.dto';

export class PaginatedPlanApplicationResponseDto extends SuccessResponse {
  @ApiProperty({
    description: 'List of Plan Application',
    type: [PlanApplicationSummaryDto],
  })
  data: PlanApplicationSummaryDto[];

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
