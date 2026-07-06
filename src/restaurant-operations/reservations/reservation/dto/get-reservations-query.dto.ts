import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReservationStatus } from '../constants/reservation.constants';

export class GetReservationsQueryDto {
  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: '2026-04-16',
    description: 'Filter reservations by date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by customer ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customer_id?: number;

  @ApiPropertyOptional({
    enum: ReservationStatus,
    description: 'Filter by reservation status',
  })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Filter by guest name (partial match)',
  })
  @IsOptional()
  @IsString()
  guest_name?: string;
}
