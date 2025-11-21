import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class CreatePurchaseOrderItemDto {
  @ApiProperty({ example: 1, description: 'ID of the purchase order' })
  @IsNotEmpty()
  @IsNumber()
  purchaseOrderId: number;

  @ApiProperty({ example: 1, description: 'ID of the product' })
  @IsOptional()
  @IsNumber()
  productId?: number;

  @ApiProperty({ example: 1, description: 'ID of the variant' })
  @IsOptional()
  @IsNumber()
  variantId?: number;

  @ApiProperty({ example: 5, description: 'Quantity of the item' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 5.99, description: 'Unit price of the item' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  unitPrice: number;
}
