import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, Min } from 'class-validator';

export class CreateLoyaltyPointsLockDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsPositive()
  loyaltyCustomerId: number;

  @ApiProperty({ example: 10, description: 'POS order id being paid' })
  @IsNumber()
  @IsPositive()
  orderId: number;

  @ApiProperty({
    example: 5.25,
    description:
      'Monetary amount to pay with points (server validates against balance)',
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    example: 120,
    description: 'Lock TTL. Defaults to 120 seconds.',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  expiresInSeconds?: number;
}
