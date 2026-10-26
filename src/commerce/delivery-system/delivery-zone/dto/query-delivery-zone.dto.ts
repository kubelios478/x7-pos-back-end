//src/commerce/delivery-system/delivery-zone/dto/query-delivery-zone.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsNumber,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class QueryDeliveryZoneDto {
  // Los checkboxes de estado pueden marcar varios a la vez: `?status=active,maintenance` o
  // `?status=active&status=maintenance`.
  @ApiPropertyOptional({
    description:
      'Filter by one or more statuses (comma-separated or repeated parameter)',
    enum: ['active', 'inactive', 'maintenance', 'deleted'],
    isArray: true,
    example: 'active,maintenance',
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
  @IsIn(['active', 'inactive', 'maintenance', 'deleted'], { each: true })
  status?: string[];

  @ApiPropertyOptional({
    description: 'Case-insensitive text search over name and description',
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
