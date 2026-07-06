import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Min, IsOptional, IsString } from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({ example: 3, description: 'Subscription plan identifier' })
  @IsInt()
  @Min(1)
  planId: number;

  @ApiProperty({ example: 'CLP', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  currency?: string;

  @ApiProperty({ example: 'manual_admin', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  paymentMethod?: string;
}
