import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { MerchantResponseDto } from 'src/merchants/dtos/merchant-response.dto';
import { SupplierLittleResponseDto } from 'src/products-inventory/suppliers/dto/supplier-response.dto';

export class PurchaseOrderResponseDto {
  @ApiProperty({ example: 1, description: 'Purchase Order ID' })
  id: number;

  @ApiProperty({
    example: '2023-10-26T10:00:00Z',
    description: 'Date the purchase order was created',
  })
  orderDate: Date;

  @ApiProperty({
    example: 'PENDING',
    description: 'Status of the purchase order',
  })
  status: string;

  @ApiProperty({
    example: 100.5,
    description: 'Total amount of the purchase order',
  })
  totalAmount: number;

  @ApiProperty({
    type: () => MerchantResponseDto,
    description: 'Associated merchant details',
  })
  merchant: MerchantResponseDto | null;

  @ApiProperty({
    type: () => SupplierLittleResponseDto,
    description: 'Associated supplier details',
  })
  supplier: SupplierLittleResponseDto | null;
}

export class OnePurchaseOrderResponse extends SuccessResponse {
  @ApiProperty()
  data: PurchaseOrderResponseDto;
}
