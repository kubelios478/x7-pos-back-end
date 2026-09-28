import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, Matches, Max, Min } from 'class-validator';

export class AvailabilityQueryDto {
  @ApiProperty({ example: '2026-04-16', description: 'Local service day (YYYY-MM-DD)' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date: string;

  @ApiPropertyOptional({ example: 4, default: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  party_size?: number = 2;

  @ApiPropertyOptional({ example: 90, default: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  // Mismo mínimo que el formulario de reserva (durationError en el backoffice).
  @Min(5)
  @Max(720)
  duration_minutes?: number = 90;

  @ApiPropertyOptional({
    example: 14,
    description: 'Reservation being edited, so it does not count against itself',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  exclude_reservation_id?: number;
}
