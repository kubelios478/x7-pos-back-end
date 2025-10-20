import { ApiProperty } from '@nestjs/swagger';
import { TableResponseDto } from './table-response.dto';

export class PaginatedTablesResponseDto {
  @ApiProperty({ 
    description: 'Array of tables',
    type: [TableResponseDto]
  })
  data: TableResponseDto[];

  @ApiProperty({ 
    example: 1, 
    description: 'Current page number'
  })
  page: number;

  @ApiProperty({ 
    example: 10, 
    description: 'Number of items per page'
  })
  limit: number;

  @ApiProperty({ 
    example: 25, 
    description: 'Total number of tables'
  })
  total: number;

  @ApiProperty({ 
    example: 3, 
    description: 'Total number of pages'
  })
  totalPages: number;

  @ApiProperty({ 
    example: true, 
    description: 'Whether there is a next page'
  })
  hasNext: boolean;

  @ApiProperty({ 
    example: false, 
    description: 'Whether there is a previous page'
  })
  hasPrev: boolean;
}



