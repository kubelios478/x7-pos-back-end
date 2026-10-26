//src/commerce/delivery-system/delivery-tracking/dto/query-delivery-tracking.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class QueryDeliveryTrackingDto {
  // `?status=active,inactive` o `?status=active&status=inactive`.
  @ApiPropertyOptional({
    description:
      'Filter by one or more statuses (comma-separated or repeated parameter)',
    enum: ['active', 'inactive', 'deleted'],
    isArray: true,
    example: 'active',
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
  @IsIn(['active', 'inactive', 'deleted'], { each: true })
  status?: string[];

  @ApiPropertyOptional({
    description: 'Filter by delivery assignment',
    example: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  delivery_assignment_id?: number;

  @ApiPropertyOptional({ description: 'Filter by delivery driver', example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  delivery_driver_id?: number;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({
    description: 'Column to sort by',
    enum: ['id', 'recorded_at'],
    example: 'id',
  })
  @IsOptional()
  @IsIn(['id', 'recorded_at'])
  sortBy?: 'id' | 'recorded_at';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
