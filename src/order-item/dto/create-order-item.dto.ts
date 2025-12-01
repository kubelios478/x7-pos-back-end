import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsPositive, IsOptional, IsString, Min } from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({
    example: 1,
    description: 'Identifier of the Order associated with this item',
  })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  orderId: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Product associated with this item',
  })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  productId: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the Variant associated with this item',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  variantId?: number;

  @ApiProperty({
    example: 2,
    description: 'Quantity of the item',
  })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  quantity: number;

  @ApiProperty({
    example: 125.50,
    description: 'Price of the item',
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    example: 10.00,
    description: 'Discount applied to the item',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the Modifier associated with this item',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  modifierId?: number;

  @ApiPropertyOptional({
    example: 'Extra sauce on the side',
    description: 'Notes about the item',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
