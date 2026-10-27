//src/qr-code/qr-menu-item/dto/create-qr-menu-item.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreateQRMenuItemDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  qrMenuSection?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  qr_menu_section_id?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  product?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  product_id?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  variant?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  variant_id?: number;

  @ApiPropertyOptional({ example: 'Dish Title' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 15.5 })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ example: 'Dish description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://images.unsplash.com/...' })
  @IsOptional()
  @IsString()
  image_url?: string;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive', 'archived'] })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  display_order: number;

  @ApiPropertyOptional({ example: 'Special instructions for this item' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_visible?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_available?: boolean;
}
