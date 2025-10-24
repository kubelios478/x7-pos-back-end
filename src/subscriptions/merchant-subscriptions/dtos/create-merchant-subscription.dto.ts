//src/subscriptions/merchant-subscriptions/dtos/create-merchant-subscriptions.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';

export class CreateMerchantSubscriptionDto {
  @ApiProperty({ example: 1, description: 'ID of Merchant Associated' })
  @IsNumber()
  @IsNotEmpty()
  merchantId: number;

  @ApiProperty({
    example: 2,
    description: 'ID of Subscription Plan Associated',
  })
  @IsNumber()
  @IsNotEmpty()
  planId: number;

  @ApiProperty({
    example: '2025-10-07',
    description: 'Subscription Start Date',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: Date;

  @ApiProperty({ example: '2026-10-07', required: false })
  @IsDateString()
  @IsOptional()
  endDate: Date;

  @ApiProperty({ example: '2025-11-07', required: false })
  @IsDateString()
  @IsOptional()
  renewalDate?: Date;

  @ApiProperty({ example: 'active', description: 'Subscription State' })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({
    example: 'credit_card',
    description: 'Payment Method Used',
  })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;
}
