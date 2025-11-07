// src/subscriptions/subscription-application/dto/create-subscription-application.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsIn, IsString } from 'class-validator';

export class CreateSubscriptionApplicationDto {
  @ApiProperty({
    example: 1,
    description:
      'Unique identifier of the Application to be linked in this Subscription-Application',
  })
  @IsNumber()
  @IsNotEmpty()
  applicationId: number;

  @ApiProperty({
    example: 1,
    description:
      'Unique identifier of the Merchant Subscription to be linked in this Subscription-Application',
  })
  @IsNumber()
  @IsNotEmpty()
  merchantSubscriptionId: number;

  @ApiProperty({
    example: 'Active',
    description: 'Status of the Subscription-Application',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive'])
  status: string;
}
