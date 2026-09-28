import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
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
    description:
      'Filter reservations by a single local calendar day (YYYY-MM-DD). Resolved as the ' +
      'half-open range [date, date+1) so the query stays sargable on the ' +
      '[merchant_id, reservation_date] composite index.',
  })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({
    example: '2026-04-16T00:00:00Z',
    description:
      'Start of an explicit booking window (inclusive). Used by the week/month calendar ' +
      'views, which cannot be expressed with the single-day `date` filter.',
  })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({
    example: '2026-04-23T00:00:00Z',
    description: 'End of an explicit booking window (exclusive).',
  })
  @IsOptional()
  @IsDateString()
  date_to?: string;

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
