import { LoyaltyPointsRoundingMode } from '../constants/loyalty-points-rounding-mode.enum';
import {
  applyPointsRounding,
  computeEarnedLoyaltyPoints,
  computeNetOrderValueForLoyalty,
} from './loyalty-points-calculation.util';

describe('loyalty-points-calculation.util', () => {
  it('computes net value excluding tax and tips', () => {
    expect(
      computeNetOrderValueForLoyalty({
        subtotal: 100,
        discount_total: 15,
      }),
    ).toBe(85);
  });

  it('uses earn_rate_percent when configured', () => {
    const points = computeEarnedLoyaltyPoints(
      200,
      {
        earn_rate_percent: 5,
        points_per_currency: 1,
        points_rounding_mode: LoyaltyPointsRoundingMode.NEAREST,
      },
      1,
    );
    expect(points).toBe(10);
  });

  it('applies FLOOR rounding policy', () => {
    expect(applyPointsRounding(4.9, LoyaltyPointsRoundingMode.FLOOR)).toBe(4);
    expect(applyPointsRounding(4.4, LoyaltyPointsRoundingMode.NEAREST)).toBe(4);
  });

  it('falls back to points_per_currency when earn rate is zero', () => {
    const points = computeEarnedLoyaltyPoints(
      50,
      {
        earn_rate_percent: 0,
        points_per_currency: 2,
        points_rounding_mode: LoyaltyPointsRoundingMode.NEAREST,
      },
      1.5,
    );
    expect(points).toBe(150);
  });
});
