import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { ProductResponseDto } from 'src/products-inventory/products/dto/product-response.dto';
import { VariantLittleResponseDto } from 'src/products-inventory/variants/dto/variant-response.dto';

export class PurchaseOrderItemResponseDto {
  @ApiProperty({ example: 1, description: 'Purchase Order ID' })
  id: number;

  @ApiProperty({ example: 5, description: 'Current quantity' })
  quantity: number;

  @ApiProperty({ example: 5, description: 'Price of the purchase order item' })
  unitPrice: number;

  @ApiProperty({
    example: 25,
    description: 'Total price of the purchase order item',
  })
  totalPrice: number;

  @ApiProperty({
    type: () => ProductResponseDto,
    nullable: true,
    description: 'Associated product details',
  })
  product: ProductResponseDto | null;

  @ApiProperty({
    type: () => VariantLittleResponseDto,
    nullable: true,
    description: 'Associated variant details',
  })
  variant: VariantLittleResponseDto | null;
}

export class OnePurchaseOrderResponse extends SuccessResponse {
  @ApiProperty()
  data: PurchaseOrderItemResponseDto;
}
