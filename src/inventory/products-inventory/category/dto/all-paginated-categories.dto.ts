import { ApiProperty } from '@nestjs/swagger';
import { CategoryResponseDto } from './category-response.dto';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

export class AllPaginatedCategories extends SuccessResponse {
  @ApiProperty({
    description: 'Array of categories',
    type: [CategoryResponseDto],
  })
  data: CategoryResponseDto[];

  @ApiProperty({
    example: 1,
    description: 'Current page number',
  })
  page: number;

  @ApiProperty({
    example: 10,
    description: 'Number of items per page',
  })
  limit: number;

  @ApiProperty({
    example: 25,
    description: 'Total number of categories',
  })
  total: number;

  @ApiProperty({
    example: 3,
    description: 'Total number of pages',
  })
  totalPages: number;

  @ApiProperty({
    example: true,
    description: 'Whether there is a next page',
  })
  hasNext: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether there is a previous page',
  })
  hasPrev: boolean;
}
