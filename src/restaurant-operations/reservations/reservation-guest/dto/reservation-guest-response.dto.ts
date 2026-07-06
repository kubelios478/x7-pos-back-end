import { ApiProperty } from '@nestjs/swagger';
import { ReservationGuest } from '../entities/reservation-guest.entity';

export class ReservationGuestResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  reservation_id: number;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty({ example: '+1234567890' })
  phone: string;

  @ApiProperty({ example: true })
  is_primary: boolean;

  @ApiProperty({ example: true })
  is_active: boolean;
}

export class OneReservationGuestResponse {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Guest retrieved successfully' })
  message: string;

  @ApiProperty({ type: ReservationGuestResponseDto })
  data: ReservationGuestResponseDto;
}
