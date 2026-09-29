import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReservationStatus } from '../../reservation/constants/reservation.constants';

/**
 * Contexto mínimo de la reserva madre. Viaja con cada entrada para que el feed pueda medir
 * la espera en recepción y detectar las anulaciones de última hora (ambas se miden contra
 * `reservation_date`) sin una segunda llamada por reserva.
 */
export class StatusHistoryReservationSummaryDto {
  @ApiProperty({ example: 14 })
  id: number;

  @ApiProperty({ example: '2026-04-16T19:00:00.000Z' })
  reservation_date: Date;

  @ApiProperty({ example: 90 })
  duration_minutes: number;

  @ApiPropertyOptional({ example: '2026-04-16T19:07:12.000Z', nullable: true })
  seated_at: Date | null;

  @ApiProperty({ example: 4 })
  party_size: number;

  @ApiProperty({ enum: ReservationStatus, example: ReservationStatus.COMPLETED })
  status: ReservationStatus;

  @ApiPropertyOptional({
    example: 'Carlos Mendoza',
    nullable: true,
    description: 'CRM customer name, else the primary guest',
  })
  guest_name: string | null;
}

export class ReservationStatusHistoryResponseDto {
  @ApiProperty({ example: 33 })
  id: number;

  @ApiProperty({ example: 14 })
  reservation_id: number;

  @ApiProperty({
    enum: ReservationStatus,
    example: ReservationStatus.COMPLETED,
    description: 'Status the reservation moved INTO',
  })
  status: ReservationStatus;

  @ApiPropertyOptional({
    enum: ReservationStatus,
    example: ReservationStatus.SEATED,
    nullable: true,
    description: 'Status it left; null for the entry logged at creation',
  })
  previous_status: ReservationStatus | null;

  @ApiPropertyOptional({
    example: '2026-04-16T19:07:12.000Z',
    nullable: true,
    description:
      'changed_at of the previous entry; changed_at − previous_changed_at is the time spent in previous_status',
  })
  previous_changed_at: Date | null;

  @ApiProperty({ example: '2026-04-16T20:52:03.000Z' })
  changed_at: Date;

  @ApiPropertyOptional({
    example: 2,
    nullable: true,
    description: 'Staff user id, or null when an automated process made the change',
  })
  changed_by: number | null;

  @ApiProperty({ example: true })
  is_active: boolean;

  @ApiPropertyOptional({ type: StatusHistoryReservationSummaryDto })
  reservation?: StatusHistoryReservationSummaryDto;
}

export class OneReservationStatusHistoryResponse {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Operation successful' })
  message: string;

  @ApiProperty({ type: ReservationStatusHistoryResponseDto })
  data: ReservationStatusHistoryResponseDto;
}
