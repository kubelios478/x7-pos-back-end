//src/subscriptions/merchant-subscriptions/dtos/create-merchant-subscriptions.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsDate,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMerchantSubscriptionDto {
  @ApiProperty({ example: 1, description: 'ID of Merchant Associated' })
  @IsNumber()
  @IsNotEmpty()
  merchantId: number;

  @ApiProperty({
    example: 1,
    description: 'ID of Subscription Plan Associated',
  })
  @IsNumber()
  @IsNotEmpty()
  planId: number;

  @ApiProperty({
    example: '2025-10-07',
    description: 'Subscription Start Date',
  })
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  renewalDate?: Date;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive'])
  status: string;

  @ApiProperty({
    example: 'credit_card',
    description: 'Payment Method Used',
  })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;
}
