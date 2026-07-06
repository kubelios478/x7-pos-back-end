import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReservationStatus } from '../../reservation/constants/reservation.constants';

export class ReservationStatusHistoryResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  reservation_id: number;

  @ApiProperty({ enum: ReservationStatus })
  status: ReservationStatus;

  @ApiProperty()
  changed_at: Date;

  @ApiPropertyOptional({ example: 1 })
  changed_by?: number;

  @ApiProperty({ example: true })
  is_active: boolean;
}

export class OneReservationStatusHistoryResponse {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Operation successful' })
  message: string;

  @ApiProperty({ type: ReservationStatusHistoryResponseDto })
  data: ReservationStatusHistoryResponseDto;
}
