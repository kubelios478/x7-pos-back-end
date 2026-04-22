import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsEnum, IsNotEmpty } from 'class-validator';
import { ReservationStatus } from '../../reservation/constants/reservation.constants';

export class CreateReservationStatusHistoryDto {
    @ApiProperty({ example: 1 })
    @IsNumber()
    @IsNotEmpty()
    reservation_id: number;

    @ApiProperty({ enum: ReservationStatus, example: ReservationStatus.CONFIRMED })
    @IsEnum(ReservationStatus)
    @IsNotEmpty()
    status: ReservationStatus;

    @ApiProperty({ example: 1 })
    @IsNumber()
    @IsNotEmpty()
    changed_by: number;
}
