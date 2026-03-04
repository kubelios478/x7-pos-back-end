import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min } from 'class-validator';
import { CreatePurchaseOrderItemDto } from './create-purchase-order-item.dto';
import { IsCalculatedTotalPrice } from 'src/common/validators/is-calculated-total-price.validator';

export class UpdatePurchaseOrderItemDto extends PartialType(
  CreatePurchaseOrderItemDto,
) {
  @ApiProperty({
    example: 55.0,
    description: 'Total item price (calculated from quantity * unitPrice)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @IsCalculatedTotalPrice({
    message:
      'Total price does not match the calculated price (quantity * unit price).',
  })
  totalPrice?: number;
}
