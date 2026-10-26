//src/commerce/delivery-system/delivery-fee/dto/query-delivery-fee.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsNumber,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class QueryDeliveryFeeDto {
  // Los checkboxes de estado pueden marcar varios a la vez: `?status=active,inactive` o
  // `?status=active&status=inactive`.
  @ApiPropertyOptional({
    description:
      'Filter by one or more statuses (comma-separated or repeated parameter)',
    enum: ['active', 'inactive', 'deleted'],
    isArray: true,
    example: 'active,inactive',
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

  @ApiPropertyOptional({ description: 'Filter by delivery zone', example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  delivery_zone_id?: number;

  @ApiPropertyOptional({
    description: 'Case-insensitive search over the delivery zone name',
    example: 'norte',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

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
    enum: ['id'],
    example: 'id',
  })
  @IsOptional()
  @IsIn(['id'])
  sortBy?: 'id';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
