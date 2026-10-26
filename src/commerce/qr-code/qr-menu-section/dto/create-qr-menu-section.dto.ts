//src/qr-code/qr-menu-section/dto/create-qr-menu-section.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsIn, IsOptional } from 'class-validator';

export class CreateQRMenuSectionDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  qrMenu?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  qr_menu_id?: number;

  @ApiProperty({ example: 'Ice cream Section' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Includes a variety of flavors' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive', 'archived'] })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  display_order: number;
}
