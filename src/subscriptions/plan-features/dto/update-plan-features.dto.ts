// src/subscriptions/plan-features/dto/update-plan-features.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsNotEmpty } from 'class-validator';

export class UpdatePlanFeatureDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'ID of Subscription Plan associated',
  })
  @IsNumber()
  @IsOptional()
  subscriptionPlanId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID of Feature associated',
  })
  @IsNumber()
  @IsOptional()
  featureId?: number;

  @ApiPropertyOptional({
    example: 30900,
    description: 'Limit_value of the Plan Feature',
  })
  @IsNumber()
  @IsNotEmpty()
  limit_value?: number;
}
