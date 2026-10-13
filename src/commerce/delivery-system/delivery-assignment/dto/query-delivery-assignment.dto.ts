//src/commerce/delivery-system/delivery-assignment/dto/query-delivery-assignment.dto.ts
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
import { DeliveryStatus } from '../constants/delivery-status.enum';
import { AssignmentType } from '../constants/assignment-type.enum';

// Igual que en delivery-fee: acepta `?x=a,b` y `?x=a&x=b`.
const toList = ({ value }: { value: unknown }) =>
  value === undefined || value === null || value === ''
    ? undefined
    : (Array.isArray(value) ? value : [value])
        .flatMap((v) => String(v).split(','))
        .map((v) => v.trim())
        .filter(Boolean);

export class QueryDeliveryAssignmentDto {
  @ApiPropertyOptional({
    description:
      'Filter by one or more logical statuses (comma-separated or repeated parameter)',
    enum: ['active', 'inactive', 'deleted'],
    isArray: true,
    example: 'active,inactive',
  })
  @Transform(toList)
  @IsOptional()
  @IsArray()
  @IsIn(['active', 'inactive', 'deleted'], { each: true })
  status?: string[];

  // Columnas del tablero de despacho: se pueden marcar varias a la vez.
  @ApiPropertyOptional({
    description:
      'Filter by one or more delivery statuses (comma-separated or repeated parameter)',
    enum: DeliveryStatus,
    isArray: true,
    example: 'picked_up,in_transit',
  })
  @Transform(toList)
  @IsOptional()
  @IsArray()
  @IsEnum(DeliveryStatus, { each: true })
  delivery_status?: DeliveryStatus[];

  @ApiPropertyOptional({
    description:
      'Filter by one or more assignment types (comma-separated or repeated parameter)',
    enum: AssignmentType,
    isArray: true,
    example: 'doordash_drive,uber_direct',
  })
  @Transform(toList)
  @IsOptional()
  @IsArray()
  @IsEnum(AssignmentType, { each: true })
  assignment_type?: AssignmentType[];

  @ApiPropertyOptional({
    description:
      'Case-insensitive search over driver name, order id / order number and delivery address',
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
    enum: ['id', 'assigned_at', 'created_at'],
    example: 'id',
  })
  @IsOptional()
  @IsIn(['id', 'assigned_at', 'created_at'])
  sortBy?: 'id' | 'assigned_at' | 'created_at';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
