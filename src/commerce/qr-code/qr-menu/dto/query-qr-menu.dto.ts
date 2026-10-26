//src/qr-code/qr-menu/dto/query-qr-menu.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryQRMenuDto {
  @ApiPropertyOptional({
    description: 'Filter by Merchant ID',
    example: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  merchant_id?: number;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['active', 'inactive', 'archived', 'deleted'],
    example: 'active',
  })
  @IsOptional()
  @IsString()
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
    description: 'Items per page',
    example: 10,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit: number = 100;

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
