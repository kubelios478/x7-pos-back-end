//src/commerce/delivery-system/delivery-tracking/dto/query-live-tracking.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { TELEMETRY_STATUSES } from '../constants/delivery-tracking.constants';

export class QueryLiveTrackingDto {
  // `?telemetry_status=active,signal_lost` o el parámetro repetido.
  @ApiPropertyOptional({
    description:
      'Filter by one or more telemetry states (comma-separated or repeated parameter)',
    enum: TELEMETRY_STATUSES,
    isArray: true,
    example: 'active,signal_lost',
  })
  @Transform(({ value }: { value: unknown }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : (Array.isArray(value) ? value : [value])
          .flatMap((v) => String(v).split(','))
          .map((v) => v.trim())
          .filter(Boolean),
  )
  @IsOptional()
  @IsArray()
  @IsIn([...TELEMETRY_STATUSES], { each: true })
  telemetry_status?: string[];

  @ApiPropertyOptional({ description: 'Isolate one driver', example: 2 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  delivery_driver_id?: number;

  @ApiPropertyOptional({ description: 'Isolate one assignment', example: 7 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  delivery_assignment_id?: number;
}
