import { ApiProperty } from '@nestjs/swagger';

export class ReservationTableResponseDto {
  @ApiProperty({ example: 1, description: 'Assignment row id (needed to unassign)' })
  id?: number;

  @ApiProperty({ example: 1 })
  reservation_id: number;

  @ApiProperty({ example: 1 })
  table_id: number;

  @ApiProperty({ example: true })
  is_active: boolean;

  @ApiProperty({ example: 'A1', required: false })
  table_number?: string;

  @ApiProperty({ example: 4, required: false })
  capacity?: number;

  @ApiProperty({ example: 3, required: false, description: 'Floor zone of the table' })
  zone_id?: number | null;

  @ApiProperty({ example: 'Main Dining', required: false })
  zone_name?: string | null;

  @ApiProperty({ example: '#D97706', required: false })
  zone_color?: string | null;
}

export class OneReservationTableResponse {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Table assignment created successfully' })
  message: string;

  @ApiProperty({ type: ReservationTableResponseDto })
  data: ReservationTableResponseDto;
}
