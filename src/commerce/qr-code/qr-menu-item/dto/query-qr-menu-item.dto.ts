//src/qr-code/qr-menu-item/dto/query-qr-menu-item.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryQRMenuItemDto {
  @ApiPropertyOptional({
    description: 'Filter by merchant ID',
    example: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  merchant_id?: number;

  @ApiPropertyOptional({
    description: 'Filter by QR Menu Section ID',
    example: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  qr_menu_section_id?: number;

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
    example: 'id',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'display_order';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    example: 'ASC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
