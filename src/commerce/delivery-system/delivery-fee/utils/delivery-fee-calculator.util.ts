//src/commerce/delivery-system/delivery-fee/utils/delivery-fee-calculator.util.ts
//
// Motor de tarifa de reparto. Orden de evaluación:
//   1. Pedido mínimo: subtotal < min_order_amount → no se puede enviar (con lo que falta).
//   2. Envío gratis: free_above definido y subtotal >= free_above → 0.00.
//   3. Tarifa = base_fee + distancia_km × per_km_fee (per_km_fee nulo o 0 → tarifa plana).
//
// Todo el cálculo va en céntimos enteros: 5.99 + 3 × 1.1 en coma flotante da
// 9.290000000000001, y ese céntimo fantasma acaba en el ticket.

export interface FeeSchedule {
  base_fee: number | string;
  per_km_fee?: number | string | null;
  min_order_amount?: number | string | null;
  free_above?: number | string | null;
}

export interface FeeQuote {
  eligible: boolean;
  /** Lo que falta para llegar al pedido mínimo (0 si ya llega). */
  shortfall: number;
  free_delivery: boolean;
  base_fee: number;
  per_km_fee: number;
  distance_km: number;
  distance_charge: number;
  fee: number;
}

const toCents = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
};

const fromCents = (cents: number): number => cents / 100;

export function computeDeliveryFee(
  schedule: FeeSchedule,
  subtotal: number,
  distanceKm = 0,
): FeeQuote {
  const subtotalCents = toCents(subtotal) ?? 0;
  const baseCents = toCents(schedule.base_fee) ?? 0;
  const perKmCents = toCents(schedule.per_km_fee) ?? 0;
  const minCents = toCents(schedule.min_order_amount);
  const freeCents = toCents(schedule.free_above);
  const distance =
    Number.isFinite(distanceKm) && distanceKm > 0 ? distanceKm : 0;

  const shortfallCents =
    minCents !== null && subtotalCents < minCents
      ? minCents - subtotalCents
      : 0;
  const eligible = shortfallCents === 0;
  const free = freeCents !== null && subtotalCents >= freeCents;
  const distanceChargeCents = Math.round(distance * perKmCents);
  const feeCents = free ? 0 : baseCents + distanceChargeCents;

  return {
    eligible,
    shortfall: fromCents(shortfallCents),
    free_delivery: free,
    base_fee: fromCents(baseCents),
    per_km_fee: fromCents(perKmCents),
    distance_km: distance,
    distance_charge: free ? 0 : fromCents(distanceChargeCents),
    fee: fromCents(feeCents),
  };
}
