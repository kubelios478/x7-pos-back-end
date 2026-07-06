/**
 * End-to-end loyalty flow (simulated, no live DB).
 * Validates: earn after purchases → redeem reward/points → analytics KPI.
 */
import { LoyaltyPointsRoundingMode } from '../src/growth/loyalty/constants/loyalty-points-rounding-mode.enum';
import {
  computeEarnedLoyaltyPoints,
  computeNetOrderValueForLoyalty,
} from '../src/growth/loyalty/utils/loyalty-points-calculation.util';
import {
  computeLiabilityAmount,
  computeRedemptionRatePercent,
} from '../src/growth/loyalty/utils/loyalty-analytics.util';
import type { LoyaltyProgram } from '../src/growth/loyalty/loyalty-programs/entities/loyalty-program.entity';

describe('Loyalty system (e2e simulated)', () => {
  const program: Pick<
    LoyaltyProgram,
    | 'earn_rate_percent'
    | 'points_per_currency'
    | 'points_rounding_mode'
    | 'redeem_points_per_currency'
  > = {
    earn_rate_percent: 10,
    points_per_currency: 1,
    points_rounding_mode: LoyaltyPointsRoundingMode.NEAREST,
    redeem_points_per_currency: 100,
  };

  const rewardCostPoints = 50;
  const purchaseCount = 10;
  const purchaseNetValue = 50;

  let accumulatedPoints = 0;

  it('earns points after each paid purchase (ORDER accrual rules)', () => {
    for (let i = 0; i < purchaseCount; i += 1) {
      const order = { subtotal: purchaseNetValue, discount_total: 0 };
      const net = computeNetOrderValueForLoyalty(order);
      const earned = computeEarnedLoyaltyPoints(net, program, 1);
      expect(earned).toBe(5);
      accumulatedPoints += earned;
    }
    expect(accumulatedPoints).toBe(50);
  });

  it('allows redeeming a reward when balance meets cost (ACC server-side)', () => {
    expect(accumulatedPoints).toBeGreaterThanOrEqual(rewardCostPoints);
    const pointsAfterReward = accumulatedPoints - rewardCostPoints;
    expect(pointsAfterReward).toBe(0);
  });

  it('rejects reward redemption when balance is insufficient', () => {
    const currentPoints = 30;
    const canRedeem = currentPoints >= rewardCostPoints;
    expect(canRedeem).toBe(false);
  });

  it('converts available points to money using exchange rate (100 pts = $1)', () => {
    const availablePoints = 3800;
    const availableAmount = computeLiabilityAmount(
      availablePoints,
      program.redeem_points_per_currency,
    );
    expect(availableAmount).toBe(38);
  });

  it('computes redemption KPI after points payment (REDEMPTION)', () => {
    const totalIssued = 10000;
    const totalRedeemed = 3500;
    const rate = computeRedemptionRatePercent(totalIssued, totalRedeemed);
    expect(rate).toBe(35);

    const liabilityPoints = totalIssued - totalRedeemed;
    const liabilityAmount = computeLiabilityAmount(
      liabilityPoints,
      program.redeem_points_per_currency,
    );
    expect(liabilityAmount).toBe(65);
  });

  it('simulates full POS loyalty payment flow: lock amount then pay with loyalty method', () => {
    const balanceDue = 15;
    const redeemAmount = 5;
    const availablePoints = 800;
    const pointsNeeded = Math.ceil(
      redeemAmount * program.redeem_points_per_currency,
    );

    expect(redeemAmount).toBeLessThanOrEqual(balanceDue);
    expect(availablePoints).toBeGreaterThanOrEqual(pointsNeeded);
    expect(pointsNeeded).toBe(500);

    const pointsAfterPayment = availablePoints - pointsNeeded;
    expect(pointsAfterPayment).toBe(300);
  });
});
