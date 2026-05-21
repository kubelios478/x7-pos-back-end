/** How earned loyalty points are rounded before persisting. */
export enum LoyaltyPointsRoundingMode {
  /** Round down (floor). */
  FLOOR = 'FLOOR',
  /** Round to nearest integer. */
  NEAREST = 'NEAREST',
}
