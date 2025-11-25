//src/subscriptions/features/dto/paginated-feature-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { FeatureResponseDto } from './feature-response.dto';

export class PaginatedFeatureResponseDto extends SuccessResponse {
  @ApiProperty({
    description: 'List of Applications',
    type: [FeatureResponseDto],
  })
  data: FeatureResponseDto[];

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
