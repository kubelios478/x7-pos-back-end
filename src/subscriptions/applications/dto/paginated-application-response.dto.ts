//src/subscriptions/applications/dto/paginated-application-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { ApplicationResponseDto } from './application-response.dto';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

export class PaginatedApplicationResponseDto extends SuccessResponse {
  @ApiProperty({
    description: 'List of Applications',
    type: [ApplicationResponseDto],
  })
  data: ApplicationResponseDto[];

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
