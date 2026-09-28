import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
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

  @ApiPropertyOptional({
    enum: ReservationStatus,
    description: 'Filter by the status the reservation moved INTO',
  })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @ApiPropertyOptional({
    example: '2026-04-16',
    description:
      'Local calendar day (YYYY-MM-DD) the change was LOGGED on (changed_at), ' +
      'as a half-open range [day, day+1) in the restaurant clock.',
  })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({
    example: '2026-04-16T00:00:00Z',
    description: 'Start of an explicit changed_at window (inclusive).',
  })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({
    example: '2026-04-17T00:00:00Z',
    description: 'End of an explicit changed_at window (exclusive).',
  })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @ApiPropertyOptional({
    example: 2,
    description: 'Only changes made by this staff user id',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  changed_by?: number;

  @ApiPropertyOptional({
    example: true,
    description:
      'Only changes made by automated system jobs (changed_by = null). ' +
      'Takes precedence over changed_by.',
  })
  @IsOptional()
  // Se lee el valor CRUDO (`obj[key]`): con enableImplicitConversion global, `value` ya llega
  // convertido y Boolean('false') es true.
  @Transform(({ obj, key }) => {
    const raw = obj[key];
    if (raw === true || raw === 'true') return true;
    if (raw === false || raw === 'false') return false;
    return raw;
  })
  @IsBoolean()
  automated?: boolean;
}
