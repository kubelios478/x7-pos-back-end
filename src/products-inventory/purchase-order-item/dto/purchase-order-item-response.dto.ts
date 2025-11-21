import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { ProductLittleResponseDto } from 'src/products-inventory/products/dto/product-response.dto';
import { PurchaseOrderLittleResponseDto } from 'src/products-inventory/purchase-order/dto/purchase-order-response.dto';
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
    type: () => ProductLittleResponseDto,
    nullable: true,
    description: 'Associated product details',
  })
  product: ProductLittleResponseDto | null;

  @ApiProperty({
    type: () => VariantLittleResponseDto,
    nullable: true,
    description: 'Associated variant details',
  })
  variant: VariantLittleResponseDto | null;

  @ApiProperty({
    type: () => PurchaseOrderLittleResponseDto,
    nullable: true,
    description: 'Associated purchase order details',
  })
  purchaseOrder: PurchaseOrderLittleResponseDto | null;
}

export class OnePurchaseOrderItemResponse extends SuccessResponse {
  @ApiProperty()
  data: PurchaseOrderItemResponseDto;
}
