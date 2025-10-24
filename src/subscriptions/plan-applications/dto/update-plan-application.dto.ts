//src/subscriptions/plan-applications/dto/update-plan-applications.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString } from 'class-validator';

export class UpdatePlanApplicationDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'ID of Application associated',
  })
  @IsNumber()
  @IsOptional()
  application?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID of Subscription Plan associated',
  })
  @IsNumber()
  @IsOptional()
  subscriptionPlan?: number;

  @ApiPropertyOptional({
    example: 'Basic usage limit: 100 users per month',
    description: 'Limits description',
  })
  @IsString()
  @IsOptional()
  limits?: string;
}
