//src/subscriptions/subscription-payments/dto/create-subscription-payments.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsIn, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSubscriptionPaymentDto {
  @ApiProperty({
    example: 1,
    description: 'ID of the Merchant Subscription Associated',
  })
  @IsNumber()
  @IsNotEmpty()
  merchantSubscriptionId: number;

  @ApiProperty({ example: 10900 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ example: 'Pesos' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive'])
  status: string;

  @ApiProperty({
    example: '2025-10-07',
    description: 'Subscription Start Date',
  })
  @Type(() => Date)
  @IsDate()
  paymentDate: Date;

  @ApiProperty({
    example: 'credit_card',
    description: 'Payment Method Used',
  })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;
}
