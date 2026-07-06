import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsInt,
  Min,
} from 'class-validator';

export class SubscriptionPaymentWebhookDto {
  @ApiProperty({ example: 1, description: 'Internal payment identifier' })
  @IsInt()
  @Min(1)
  paymentId: number;

  @ApiProperty({
    example: 'ext_123',
    description: 'External transaction identifier',
  })
  @IsString()
  @IsNotEmpty()
  externalTransactionId: string;

  @ApiProperty({ example: 'paid', enum: ['paid', 'rejected'] })
  @IsString()
  @IsIn(['paid', 'rejected'])
  status: 'paid' | 'rejected';

  @ApiProperty({
    example: 0,
    description: 'Amount paid (must match plan price)',
  })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'CLP' })
  @IsString()
  @IsNotEmpty()
  currency: string;
}
