import { ApiProperty } from '@nestjs/swagger';
import { ReservationGuest } from '../entities/reservation-guest.entity';

export class AllPaginatedReservationGuests {
    @ApiProperty({ example: 200 })
    statusCode: number;

    @ApiProperty({ example: 'Guests retrieved successfully' })
    message: string;

    @ApiProperty({ type: [ReservationGuest] })
    data: ReservationGuest[];

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
