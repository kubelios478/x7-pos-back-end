import { ApiProperty } from '@nestjs/swagger';

export class ReservationNoteResponseDto {
    @ApiProperty({ example: 1 })
    id: number;

    @ApiProperty({ example: 1 })
    reservation_id: number;

    @ApiProperty({ example: 'Some note content' })
    note: string;

    @ApiProperty({ example: 1 })
    created_by: number;

    @ApiProperty()
    created_at: Date;

    @ApiProperty({ example: true })
    is_active: boolean;
}

export class OneReservationNoteResponse {
    @ApiProperty({ example: 200 })
    statusCode: number;

    @ApiProperty({ example: 'Note retrieved successfully' })
    message: string;

    @ApiProperty({ type: ReservationNoteResponseDto })
    data: ReservationNoteResponseDto;
}
