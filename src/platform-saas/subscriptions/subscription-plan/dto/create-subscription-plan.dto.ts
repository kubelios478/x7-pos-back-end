//src/subscriptions/subscription-plan/dto/create-subscription-plan.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsPositive,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  ValidateIf,
} from 'class-validator';

export class CreateSubscriptionPlanDto {
  @ApiProperty({ example: 'Professional' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'professional' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'Full Restaurant' })
  @IsOptional()
  @IsString()
  badge?: string;

  @ApiProperty({ example: 'Includes advanced restaurant features' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    example: 149.0,
    description: 'Omit or null when isCustomPricing is true',
  })
  @ValidateIf((dto: CreateSubscriptionPlanDto) => !dto.isCustomPricing)
  @IsNumber()
  @IsPositive()
  price?: number | null;

  @ApiPropertyOptional({ example: 'ANNUAL BILLING' })
  @IsOptional()
  @IsString()
  priceLabel?: string;

  @ApiProperty({
    example: 'monthly',
    enum: ['daily', 'weekly', 'monthly', 'yearly', 'annual'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['daily', 'weekly', 'monthly', 'yearly', 'annual'])
  billingCycle: string;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive'])
  status: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  recommended?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Enterprise plans with negotiated per-client pricing',
  })
  @IsOptional()
  @IsBoolean()
  isCustomPricing?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
