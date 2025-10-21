import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsPositive,
  IsIn,
  IsNotEmpty,
} from 'class-validator';

export class CreateSuscriptionPlanDto {
  @ApiProperty({ example: 'Plan Basic' })
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
