/** Emitted after DB commit when a POS order first becomes fully paid (`is_paid`). */
export const ORDER_FULLY_PAID_EVENT = 'order.fully_paid' as const;

export type OrderFullyPaidPayload = {
  orderId: number;
  /** When provided by checkout (e.g. POS payment DTO), used for kardex shift link. */
  shiftId?: number | null;
};

/** Emitted after commit when a paid order must roll back loyalty points (cancel/refund). */
export const ORDER_LOYALTY_REVERSAL_EVENT = 'order.loyalty_reversal' as const;

export type OrderLoyaltyReversalPayload = {
  orderId: number;
};
