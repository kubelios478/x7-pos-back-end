//src/subscriptions/merchant-subscriptions/dtos/update-merchant-subscriptions.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsDateString } from 'class-validator';

export class UpdateMerchantSubscriptionDto {
  @ApiPropertyOptional({ example: 1, description: 'ID of Merchant associated' })
  @IsNumber()
  @IsOptional()
  merchantId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID Subscription Plan associated',
  })
  @IsNumber()
  @IsOptional()
  planId?: number;

  @ApiPropertyOptional({
    example: '2025-10-07',
    description: 'Subscription Plan start date',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-10-07',
    description: 'Subscription Plan end date',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    example: '2026-09-07',
    description: 'Subscription Plan renewal date',
  })
  @IsDateString()
  @IsOptional()
  renewalDate?: string;

  @ApiPropertyOptional({
    example: 'active',
    description: 'Subscription Plan status',
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    example: 'credit_card',
    description: 'Payment method used',
  })
  @IsString()
  @IsOptional()
  paymentMethod?: string;
}
