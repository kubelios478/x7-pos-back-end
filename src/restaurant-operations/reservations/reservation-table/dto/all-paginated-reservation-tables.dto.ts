import { ApiProperty } from '@nestjs/swagger';
import { ReservationTable } from '../entities/reservation-table.entity';

export class AllPaginatedReservationTables {
    @ApiProperty({ example: 200 })
    statusCode: number;

    @ApiProperty({ example: 'Reservation tables retrieved successfully' })
    message: string;

    @ApiProperty({ type: [ReservationTable] })
    data: ReservationTable[];

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
