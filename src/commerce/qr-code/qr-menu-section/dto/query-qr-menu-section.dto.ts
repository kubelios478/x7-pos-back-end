//src/qr-code/qr-menu-section/dto/query-qr-menu-section.dto.ts
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

export class QueryQRMenuSectionDto {
  @ApiPropertyOptional({
    description: 'Filter by QR Menu ID',
    example: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  qr_menu_id?: number;

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
    example: 'display_order',
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
