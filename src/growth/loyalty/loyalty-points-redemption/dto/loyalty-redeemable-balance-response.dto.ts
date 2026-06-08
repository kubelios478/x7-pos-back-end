import { ApiProperty } from '@nestjs/swagger';

export class LoyaltyRedeemableBalanceResponseDto {
  @ApiProperty({ example: 123 })
  loyaltyCustomerId: number;

  @ApiProperty({ example: 5000 })
  currentPoints: number;

  @ApiProperty({ example: 1200 })
  reservedPoints: number;

  @ApiProperty({ example: 3800 })
  availablePoints: number;

  @ApiProperty({
    example: 100,
    description:
      'Points required to redeem 1 currency unit (e.g., 100 points = $1.00)',
  })
  redeemPointsPerCurrency: number;

  @ApiProperty({
    example: 38.0,
    description:
      'Monetary value of availablePoints using the merchant current exchange rate',
  })
  availableAmount: number;
}
