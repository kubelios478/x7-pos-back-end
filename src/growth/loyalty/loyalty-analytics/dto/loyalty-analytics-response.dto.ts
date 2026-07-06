import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

export class LoyaltyMonthlyTrendDto {
  @ApiProperty({ example: '2026-03', description: 'Year-month (YYYY-MM)' })
  month: string;

  @ApiProperty({ example: 12000 })
  pointsIssued: number;

  @ApiProperty({ example: 3500 })
  pointsRedeemed: number;

  @ApiProperty({
    example: 29.17,
    description: '(pointsRedeemed / pointsIssued) × 100 for the month',
  })
  redemptionRatePercent: number;
}

export class LoyaltyAnalyticsReportDto {
  @ApiProperty({ example: '2026-01-01' })
  fromDate: string;

  @ApiProperty({ example: '2026-06-30' })
  toDate: string;

  @ApiProperty({
    example: 5000,
    nullable: true,
    description: 'VIP filter applied (lifetime points threshold), if any',
  })
  minLifetimePoints: number | null;

  @ApiProperty({
    example: 45000,
    description: 'Total points issued (EARNED) in the period',
  })
  totalPointsIssued: number;

  @ApiProperty({
    example: 12000,
    description: 'Total points redeemed in the period',
  })
  totalPointsRedeemed: number;

  @ApiProperty({
    example: 26.67,
    description:
      'Redemption rate: (totalPointsRedeemed / totalPointsIssued) × 100, calculated on the server',
  })
  redemptionRatePercent: number;

  @ApiProperty({
    type: [LoyaltyMonthlyTrendDto],
    description: 'Monthly segmentation of issued vs redeemed points',
  })
  monthlyTrends: LoyaltyMonthlyTrendDto[];

  @ApiProperty({
    example: 33000,
    description:
      'Outstanding points balance (liability): sum of current redeemable points across active customers',
  })
  outstandingPointsBalance: number;

  @ApiProperty({
    example: 330.0,
    description:
      'Monetary liability using redeem_points_per_currency (e.g. 100 points = $1)',
  })
  outstandingLiabilityAmount: number;

  @ApiProperty({
    example: 100,
    description: 'Exchange rate used for liability conversion',
  })
  redeemPointsPerCurrency: number;
}

export class OneLoyaltyAnalyticsResponseDto extends SuccessResponse {
  @ApiProperty({ type: LoyaltyAnalyticsReportDto })
  data: LoyaltyAnalyticsReportDto;
}
