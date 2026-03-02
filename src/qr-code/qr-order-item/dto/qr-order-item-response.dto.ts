//src/qr-code/qr-code-item/dto/qr-order-item-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { QROrderItem } from '../entity/qr-order-item.entity';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

export class QROrderItemResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the QR Order Item',
  })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the QR Order related',
  })
  qrOrder: { id: number };

  @ApiProperty({ example: 1, description: 'Identifier of the Product related' })
  product: { id: number };

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Variant related (if applicable)',
  })
  variant?: { id: number };

  @ApiProperty({ example: 2, description: 'Quantity of the product ordered' })
  quantity: number;

  @ApiProperty({ example: 19.99, description: 'Price per unit of the product' })
  price: number;

  @ApiProperty({
    example: 39.98,
    description: 'Total price for the quantity ordered',
  })
  total_price: number;

  @ApiProperty({
    example: 'No onions, please',
    description: 'Additional notes or instructions for the order item',
  })
  notes?: string;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  status: string;
}

export class OneQROrderItemResponseDto extends SuccessResponse {
  @ApiProperty()
  data: QROrderItem;
}

export class AllQROrderItemsResponseDto extends SuccessResponse {
  @ApiProperty()
  data: QROrderItem[];
}
