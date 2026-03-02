import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { SupplierResponseDto } from './supplier-response.dto';

export class AllPaginatedSuppliers extends SuccessResponse {
  @ApiProperty({ type: [SupplierResponseDto] })
  data: SupplierResponseDto[];

  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 10, description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ example: 100, description: 'Total number of items' })
  total: number;

  @ApiProperty({ example: 10, description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({
    example: true,
    description: 'Indicates if there is a next page',
  })
  hasNext: boolean;

  @ApiProperty({
    example: false,
    description: 'Indicates if there is a previous page',
  })
  hasPrev: boolean;
}
