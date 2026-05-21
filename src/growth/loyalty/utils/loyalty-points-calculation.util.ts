import { roundMoney } from 'src/restaurant-operations/pos/orders/order-aggregation.util';
import { LoyaltyPointsRoundingMode } from '../constants/loyalty-points-rounding-mode.enum';
import type { LoyaltyProgram } from '../loyalty-programs/entities/loyalty-program.entity';

/** Net merchandise value: subtotal minus discounts; excludes tax and tips. */
export function computeNetOrderValueForLoyalty(order: {
  subtotal: number;
  discount_total: number;
}): number {
  const net = roundMoney(
    roundMoney(Number(order.subtotal)) -
      roundMoney(Number(order.discount_total)),
  );
  return Math.max(0, net);
}

export function applyPointsRounding(
  rawPoints: number,
  mode: LoyaltyPointsRoundingMode,
): number {
  if (!Number.isFinite(rawPoints) || rawPoints <= 0) {
    return 0;
  }
  if (mode === LoyaltyPointsRoundingMode.FLOOR) {
    return Math.floor(rawPoints);
  }
  return Math.round(rawPoints);
}

/**
 * Earned points from net order value and program rules (earn % or points_per_currency),
 * multiplied by the customer's tier multiplier.
 */
export function computeEarnedLoyaltyPoints(
  netOrderValue: number,
  program: Pick<
    LoyaltyProgram,
    'earn_rate_percent' | 'points_per_currency' | 'points_rounding_mode'
  >,
  tierMultiplier: number,
): number {
  if (netOrderValue <= 0) {
    return 0;
  }

  const multiplier = tierMultiplier > 0 ? tierMultiplier : 1;
  const earnRate = Number(program.earn_rate_percent ?? 0);
  let raw: number;
  if (earnRate > 0) {
    raw = netOrderValue * (earnRate / 100) * multiplier;
  } else {
    raw = netOrderValue * Number(program.points_per_currency ?? 0) * multiplier;
  }

  return applyPointsRounding(
    raw,
    program.points_rounding_mode ?? LoyaltyPointsRoundingMode.NEAREST,
  );
}
