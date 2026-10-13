//src/commerce/delivery-system/delivery-driver/dto/query-delivery-driver.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsNumber,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  FILTERABLE_DRIVER_STATUSES,
  VehicleType,
} from '../constants/delivery-driver.constants';
import { normalizeVehicleType } from '../utils/delivery-driver-normalize.util';

// Igual que en delivery-fee: acepta `?x=a,b` y `?x=a&x=b`.
const toList = (value: unknown): string[] | undefined =>
  value === undefined || value === null || value === ''
    ? undefined
    : (Array.isArray(value) ? value : [value])
        .flatMap((v) => String(v).split(','))
        .map((v) => v.trim())
        .filter(Boolean);

export class QueryDeliveryDriverDto {
  @ApiPropertyOptional({
    description:
      'Filter by one or more statuses (comma-separated or repeated parameter)',
    enum: FILTERABLE_DRIVER_STATUSES,
    isArray: true,
    example: 'active,on_delivery',
  })
  @Transform(({ value }: { value: unknown }) => toList(value))
  @IsOptional()
  @IsArray()
  @IsIn([...FILTERABLE_DRIVER_STATUSES], { each: true })
  status?: string[];

  @ApiPropertyOptional({
    description:
      'Filter by one or more vehicle types (stored values or UI labels, comma-separated or repeated)',
    enum: VehicleType,
    isArray: true,
    example: 'car,motorcycle',
  })
  @Transform(({ value }: { value: unknown }) =>
    toList(value)?.map((v) => normalizeVehicleType(v) ?? v),
  )
  @IsOptional()
  @IsArray()
  @IsEnum(VehicleType, { each: true })
  vehicleType?: VehicleType[];

  @ApiPropertyOptional({
    description: 'Case-insensitive search over name and phone',
    example: 'mario',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 10 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({
    description: 'Column to sort by',
    enum: ['id', 'name'],
    example: 'id',
  })
  @IsOptional()
  @IsIn(['id', 'name'])
  sortBy?: 'id' | 'name';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
