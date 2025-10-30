//src/subscriptions/subscription-plan/dto/create-subscription-plan.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsPositive,
  IsIn,
  IsNotEmpty,
} from 'class-validator';

export class CreateSubscriptionPlanDto {
  @ApiProperty({ example: 'Basic Plan' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Includes basic features' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 19.99 })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({
    example: 'monthly',
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['daily', 'weekly', 'monthly', 'yearly'])
  billingCycle: string;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive'])
  status: string;
}
