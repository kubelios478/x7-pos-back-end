import { ApiProperty } from '@nestjs/swagger';
import { ReservationNoteResponseDto } from './reservation-note-response.dto';

export class AllPaginatedReservationNotes {
    @ApiProperty({ example: 200 })
    statusCode: number;

    @ApiProperty({ example: 'Notes retrieved successfully' })
    message: string;

    @ApiProperty({ type: [ReservationNoteResponseDto] })
    data: ReservationNoteResponseDto[];

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
