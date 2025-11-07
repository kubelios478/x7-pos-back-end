// src/subscriptions/subscription-application/dto/update-subscription-application.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsNumber,
  IsNotEmpty,
  IsString,
  IsIn,
} from 'class-validator';
export class UpdateSubscriptionApplicationDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'ID of Application associated',
  })
  @IsNumber()
  @IsOptional()
  applicationId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID of Merchant Subscription associated',
  })
  @IsNumber()
  @IsOptional()
  merchantSubscriptionId?: number;

  @ApiPropertyOptional({
    example: 'active',
    description: 'Status of the Subscription Application',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive'])
  status: string;
}
