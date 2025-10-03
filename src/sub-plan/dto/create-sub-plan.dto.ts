import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsPositive, IsIn } from 'class-validator';

export class CreateSubPlanDto {
  @ApiProperty({
    example: 'Plan Basic',
    description: 'Name of the subscription plan',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Includes basic features and limited support',
    description: 'Description of the subscription plan',
  })
  @IsString()
  description: string;

  @ApiProperty({
    example: 19.99,
    description: 'Price of the subscription plan',
  })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({
    example: 'monthly',
    description: 'Billing cycle of the subscription plan',
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
  })
  @IsString()
  @IsIn(['daily', 'weekly', 'monthly', 'yearly'])
  billingCycle: string;

  @ApiProperty({
    example: 'active',
    description: 'Status of the subscription plan',
    enum: ['active', 'inactive'],
  })
  @IsString()
  @IsIn(['active', 'inactive'])
  status: string;
}
