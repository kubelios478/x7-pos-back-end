import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsString,
  IsOptional,
  IsInt,
  Length,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';
import { PaymentItemDto } from './payment-item.dto';

export class ProcessPaymentDto {
  @ApiProperty({
    example: 42,
    description: "ID of the order to pay; it must be in 'completed' status",
  })
  @IsNumber()
  orderId: number;

  @ApiProperty({
    type: [PaymentItemDto],
    description:
      'One or more payments (split payment). The sum of `amount` must match the order total (±0.01).',
    example: [
      { amount: 30, method: 'card', tipAmount: 3 },
      { amount: 15.5, method: 'cash' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  payments: PaymentItemDto[];

  @ApiProperty({
    example: 'pos',
    description:
      'Channel that registers the payment (stored on each order payment)',
  })
  @IsString()
  source: string;

  @ApiPropertyOptional({
    example: 1,
    description:
      "Merchant tip rule to apply; when omitted the merchant's active rule is used",
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  merchantTipRuleId?: number;

  @ApiProperty({
    example: 'USD',
    minLength: 3,
    maxLength: 3,
    description: 'ISO-4217 currency code (exactly 3 characters)',
  })
  @IsString()
  @Length(3, 3)
  currency: string;
}
