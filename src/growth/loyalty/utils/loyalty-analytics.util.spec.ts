import {
  computeLiabilityAmount,
  computeRedemptionRatePercent,
} from './loyalty-analytics.util';

describe('loyalty-analytics.util', () => {
  it('computes redemption rate on the server', () => {
    expect(computeRedemptionRatePercent(10000, 2500)).toBe(25);
  });

  it('returns 0 when no points were issued', () => {
    expect(computeRedemptionRatePercent(0, 100)).toBe(0);
  });

  it('computes monetary liability from outstanding points', () => {
    expect(computeLiabilityAmount(5000, 100)).toBe(50);
  });

  it('returns 0 liability when exchange rate is not configured', () => {
    expect(computeLiabilityAmount(5000, 0)).toBe(0);
  });
});
