export enum OrderBusinessStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  PAID = 'paid',
  /** Something was paid but a balance is still due (split bill, or items added after paying). */
  PARTIALLY_PAID = 'partially_paid',
  PARTIALLY_REFUNDED = 'partially_refunded',
}
