import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class PaymentItemDto {
  @ApiProperty({
    example: 30,
    minimum: 0.01,
    description: 'Amount charged with this payment method',
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    example: 'card',
    description:
      "Payment method (free text: cash, card, online, qr...). Any value other than 'cash' settles tips by bank transfer.",
  })
  @IsString()
  method: string;

  @ApiPropertyOptional({
    example: 3,
    minimum: 0,
    description: 'Tip included with this payment (not part of the order total)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tipAmount?: number;
}
