export enum MovementsStatus {
  IN = 'IN',
  OUT = 'OUT',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
  WASTE = 'WASTE',
  SALE = 'SALE',
  /** Stock consumption for a paid POS / checkout order (kardex). */
  OUT_FOR_SALE = 'OUT_FOR_SALE',
  /** Stock increase from a posted supplier purchase invoice. */
  PURCHASE_ENTRY = 'PURCHASE_ENTRY',
  RETURN = 'RETURN',
}
