import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateReservationTableDto {
    @ApiProperty({ example: 1 })
    @IsNumber()
    @IsNotEmpty()
    reservation_id: number;

    @ApiProperty({ example: 1 })
    @IsNumber()
    @IsNotEmpty()
    table_id: number;
}
