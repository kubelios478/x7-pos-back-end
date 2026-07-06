import {
  computeWeightedAverageUnitCost,
  formatUnitCost,
} from './weighted-average-cost.util';

describe('computeWeightedAverageUnitCost', () => {
  it('uses purchase price when stock is zero and WACC is null', () => {
    expect(computeWeightedAverageUnitCost(0, null, 10, 5.5)).toBe(5.5);
  });

  it('uses purchase price when previous WACC is null even with stock on hand', () => {
    expect(computeWeightedAverageUnitCost(100, null, 10, 4)).toBe(4);
  });

  it('blends previous WACC with new purchase', () => {
    const result = computeWeightedAverageUnitCost(100, 10, 50, 12);
    expect(result).toBeCloseTo((100 * 10 + 50 * 12) / 150, 6);
  });

  it('rounds via formatUnitCost to four decimals', () => {
    expect(formatUnitCost(12.34567)).toBe('12.3457');
  });
});
