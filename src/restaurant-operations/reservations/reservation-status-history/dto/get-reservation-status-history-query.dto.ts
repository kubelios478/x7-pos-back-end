import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ReservationStatus } from '../../reservation/constants/reservation.constants';

export class GetReservationStatusHistoryQueryDto {
    @ApiPropertyOptional({ example: 1, minimum: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @ApiPropertyOptional({ example: 1, description: 'Filter by reservation ID' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    reservation_id?: number;

    @ApiPropertyOptional({ enum: ReservationStatus, description: 'Filter by status' })
    @IsOptional()
    @IsEnum(ReservationStatus)
    status?: ReservationStatus;
}
