import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, MaxLength } from 'class-validator';

export class CreatePlanAplicationDto {
  @ApiProperty({
    example: 1,
    description:
      'Unique identifier of the Subscription Plan to be linked in this Plan-Aplication',
  })
  @IsNumber()
  planId: number;

  @ApiProperty({
    example: 10,
    description:
      'Unique identifier of the Application to be linked in this Plan-Aplication',
  })
  @IsNumber()
  applicationId: number;

  @ApiProperty({
    example: 'Basic usage limit: 100 users per month',
    description:
      'Defines the usage limits or restrictions for the Plan-Aplication',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  limits?: string;
}
