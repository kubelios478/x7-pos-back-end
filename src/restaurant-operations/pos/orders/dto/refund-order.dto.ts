import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsArray,
  IsString,
  IsBoolean,
} from 'class-validator';

export class RefundOrderDto {
  @ApiProperty({
    example: 42,
    description: "ID of the order to refund; it must be in 'paid' status",
  })
  @IsNumber()
  orderId: number;

  @ApiPropertyOptional({
    example: [101, 102],
    type: [Number],
    description:
      'Order item IDs to refund (partial refund). Required when `fullRefund` is not true.',
  })
  @IsOptional()
  @IsArray()
  itemIds?: number[];

  @ApiPropertyOptional({
    example: false,
    description: 'Refund the whole order total; `itemIds` is ignored when true',
  })
  @IsOptional()
  @IsBoolean()
  fullRefund?: boolean;

  @ApiProperty({
    example: 'Customer returned a cold dish',
    description: 'Refund reason (stored on the order as refund_reason)',
  })
  @IsString()
  reason: string;
}
