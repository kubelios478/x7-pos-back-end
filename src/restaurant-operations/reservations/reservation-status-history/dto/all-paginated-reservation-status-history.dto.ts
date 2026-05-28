import { ApiProperty } from '@nestjs/swagger';
import { ReservationStatusHistoryResponseDto } from './reservation-status-history-response.dto';

export class AllPaginatedReservationStatusHistory {
    @ApiProperty({ example: 200 })
    statusCode: number;

    @ApiProperty({ example: 'Status history retrieved successfully' })
    message: string;

    @ApiProperty({ type: [ReservationStatusHistoryResponseDto] })
    data: ReservationStatusHistoryResponseDto[];

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
