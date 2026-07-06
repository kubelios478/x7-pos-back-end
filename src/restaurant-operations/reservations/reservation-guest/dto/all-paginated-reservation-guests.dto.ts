import { ApiProperty } from '@nestjs/swagger';
import { ReservationGuestResponseDto } from './reservation-guest-response.dto';

export class AllPaginatedReservationGuests {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Guests retrieved successfully' })
  message: string;

  @ApiProperty({ type: [ReservationGuestResponseDto] })
  data: ReservationGuestResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 1 })
  total: number;

  @ApiProperty({ example: 1 })
  totalPages: number;

  @ApiProperty({ example: false })
  hasNext: boolean;

  @ApiProperty({ example: false })
  hasPrev: boolean;
}
