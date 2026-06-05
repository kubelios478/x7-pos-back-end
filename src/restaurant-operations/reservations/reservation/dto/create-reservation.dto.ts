import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsDateString,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsPositive,
    IsString,
} from 'class-validator';
import { ReservationStatus } from '../constants/reservation.constants';

export class CreateReservationDto {
    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsInt()
    customer_id?: number;

    @ApiProperty({ example: '2026-04-16T19:00:00Z' })
    @IsDateString()
    @IsNotEmpty()
    reservation_date: string;

    @ApiPropertyOptional({ example: 90 })
    @IsOptional()
    @IsInt()
    @IsPositive()
    duration_minutes?: number;

    @ApiProperty({ example: 4 })
    @IsInt()
    @IsPositive()
    @IsNotEmpty()
    party_size: number;

    @ApiPropertyOptional({ enum: ReservationStatus, example: ReservationStatus.PENDING })
    @IsOptional()
    @IsEnum(ReservationStatus)
    status?: ReservationStatus;

    @ApiPropertyOptional({ example: 'phone' })
    @IsOptional()
    @IsString()
    source?: string;

    @ApiPropertyOptional({ example: 'Special requests' })
    @IsOptional()
    @IsString()
    special_requests?: string;

    @ApiPropertyOptional({ example: [1], description: 'List of table IDs' })
    @IsOptional()
    @IsInt({ each: true })
    table_ids?: number[];

    @ApiPropertyOptional({ example: '2026-04-16T19:05:00Z' })
    @IsDateString()
    @IsOptional()
    seated_at?: string;
}
