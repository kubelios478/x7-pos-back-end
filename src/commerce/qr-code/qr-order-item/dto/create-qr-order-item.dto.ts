//src/qr-code/qr-order-item/dto/create-qr-order-item.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateQROrderItemDto {
  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  qrMenuItem?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  qrOrder?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  qr_order_id?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  product?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  product_id?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  qr_menu_item_id?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  variant?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  variant_id?: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @IsNotEmpty()
  quantity: number;

  @ApiPropertyOptional({ example: 19.99 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ example: 19.99 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  unit_price?: number;

  @ApiPropertyOptional({ example: 'No onions, please' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    example: 'active',
    enum: ['active', 'inactive', 'served', 'cancelled'],
  })
  @IsString()
  @IsNotEmpty()
  status: string;
}
