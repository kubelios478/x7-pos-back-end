import { ApiProperty } from '@nestjs/swagger';
import { ReservationResponseDto } from './reservation-response.dto';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

export class AllPaginatedReservations extends SuccessResponse {
  @ApiProperty({
    description: 'Array of reservations',
    type: [ReservationResponseDto],
  })
  data: ReservationResponseDto[];

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
    description: 'Total number of reservations',
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
