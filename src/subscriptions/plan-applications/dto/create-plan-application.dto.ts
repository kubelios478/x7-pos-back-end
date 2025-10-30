//src/subscriptions/plan-applications/dto/create-plan-applications.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsOptional,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

export class CreatePlanApplicationDto {
  @ApiProperty({
    example: 1,
    description:
      'Unique identifier of the Application to be linked in this Plan-Application',
  })
  @IsNumber()
  @IsNotEmpty()
  application: number;

  @ApiProperty({
    example: 1,
    description:
      'Unique identifier of the Subscription Plan to be linked in this Plan-Application',
  })
  @IsNumber()
  @IsNotEmpty()
  subscriptionPlan: number;

  @ApiProperty({
    example: 'Basic usage limit: 100 users per month',
    description:
      'Defines the usage limits or restrictions for the Plan-Application',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  limits?: string;
}
