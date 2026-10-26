//src/qr-code/qr-order-item/dto/query-qr-order-item.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryQROrderItemDto {
  @ApiPropertyOptional({
    description: 'Filter by merchant ID',
    example: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  merchant_id?: number;

  @ApiPropertyOptional({
    description: 'Filter by QR order ID',
    example: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  qr_order_id?: number;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['active', 'inactive', 'deleted'],
    example: 'active',
  })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'deleted'])
  status?: string;

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
    maximum: 100,
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
