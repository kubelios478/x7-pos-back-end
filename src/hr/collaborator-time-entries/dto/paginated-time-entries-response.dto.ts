import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { TimeEntryResponseDto } from './time-entry-response.dto';

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 25 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNext: boolean;

  @ApiProperty({ example: false })
  hasPrev: boolean;
}

export class PaginatedTimeEntriesResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => [TimeEntryResponseDto] })
  data: TimeEntryResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  paginationMeta: PaginationMetaDto;
}
