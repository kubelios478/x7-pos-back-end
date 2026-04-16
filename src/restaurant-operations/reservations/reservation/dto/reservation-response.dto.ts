import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { ReservationStatus } from '../constants/reservation.constants';

export class ReservationResponseDto {
    @ApiProperty({ example: 1 })
    id: number;

    @ApiProperty({ example: 1 })
    merchant_id: number;

    @ApiPropertyOptional({ example: 1 })
    customer_id: number | null;

    @ApiProperty({ example: '2026-04-16T19:00:00Z' })
    reservation_date: Date;

    @ApiProperty({ example: 90 })
    duration_minutes: number;

    @ApiPropertyOptional({ example: '2026-04-16T19:05:00Z' })
    seated_at: Date | null;

    @ApiProperty({ example: 4 })
    party_size: number;

    @ApiProperty({ enum: ReservationStatus })
    status: ReservationStatus;

    @ApiPropertyOptional({ example: 'phone' })
    source: string | null;

    @ApiPropertyOptional({ example: 'Special requests' })
    special_requests: string | null;

    @ApiPropertyOptional({ example: 1 })
    created_by: number | null;

    @ApiProperty({ example: '2026-04-16T14:00:00Z' })
    created_at: Date;
}

export class OneReservationResponse extends SuccessResponse {
    @ApiProperty({ type: ReservationResponseDto })
    data: ReservationResponseDto;
}

export class AllPaginatedReservations extends SuccessResponse {
    @ApiProperty({ type: [ReservationResponseDto] })
    data: ReservationResponseDto[];

    @ApiProperty({ example: 1 })
    page: number;

    @ApiProperty({ example: 10 })
    limit: number;

    @ApiProperty({ example: 100 })
    total: number;

    @ApiProperty({ example: 10 })
    totalPages: number;

    @ApiProperty({ example: true })
    hasNext: boolean;

    @ApiProperty({ example: false })
    hasPrev: boolean;
}
