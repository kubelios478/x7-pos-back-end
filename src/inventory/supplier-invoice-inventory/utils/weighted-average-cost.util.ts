/**
 * Weighted average unit cost (WACC / CPP).
 * newWacc = ((prevQty * prevWacc) + (purchasedQty * purchasePrice)) / (prevQty + purchasedQty)
 */
export function computeWeightedAverageUnitCost(
  previousQty: number,
  previousWacc: number | null,
  purchasedQty: number,
  purchaseUnitPrice: number,
): number {
  if (!Number.isFinite(purchasedQty) || purchasedQty <= 0) {
    return previousWacc ?? 0;
  }
  if (!Number.isFinite(purchaseUnitPrice) || purchaseUnitPrice < 0) {
    return previousWacc ?? 0;
  }

  const prevQty = Math.max(0, Math.floor(previousQty));
  const prevWacc =
    previousWacc != null && Number.isFinite(previousWacc) ? previousWacc : null;

  if (prevQty === 0 || prevWacc == null) {
    return purchaseUnitPrice;
  }

  const newQty = prevQty + purchasedQty;
  if (newQty <= 0) {
    return purchaseUnitPrice;
  }

  return (prevQty * prevWacc + purchasedQty * purchaseUnitPrice) / newQty;
}

export function formatUnitCost(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return '0.0000';
  }
  return value.toFixed(4);
}
