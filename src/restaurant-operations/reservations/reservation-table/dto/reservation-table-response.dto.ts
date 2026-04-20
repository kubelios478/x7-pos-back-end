import { ApiProperty } from '@nestjs/swagger';

export class ReservationTableResponseDto {
    @ApiProperty({ example: 1 })
    reservation_id: number;

    @ApiProperty({ example: 1 })
    table_id: number;

    @ApiProperty({ example: true })
    is_active: boolean;
}

export class OneReservationTableResponse {
    @ApiProperty({ example: 200 })
    statusCode: number;

    @ApiProperty({ example: 'Table assignment created successfully' })
    message: string;

    @ApiProperty({ type: ReservationTableResponseDto })
    data: ReservationTableResponseDto;
}
