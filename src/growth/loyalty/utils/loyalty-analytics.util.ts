import { roundMoney } from 'src/restaurant-operations/pos/orders/order-aggregation.util';

/** (Points redeemed / points issued) × 100, server-side only. */
export function computeRedemptionRatePercent(
  pointsIssued: number,
  pointsRedeemed: number,
): number {
  if (pointsIssued <= 0) {
    return 0;
  }
  const rate = (pointsRedeemed / pointsIssued) * 100;
  return roundMoney(rate);
}

export function computeLiabilityAmount(
  outstandingPoints: number,
  redeemPointsPerCurrency: number,
): number {
  if (redeemPointsPerCurrency <= 0) {
    return 0;
  }
  return roundMoney(outstandingPoints / redeemPointsPerCurrency);
}
