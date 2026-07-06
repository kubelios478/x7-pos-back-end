export enum RecipeLineType {
  /** Always deducted and included in base theoretical cost. */
  REQUIRED = 'REQUIRED',
  /**
   * When `modifierId` is set: deducted only if that modifier is on the order line.
   * When `modifierId` is null: treated like required for deduction and base cost.
   */
  OPTIONAL = 'OPTIONAL',
  /** Deducted only when `modifierId` is present on the order line (e.g. extra cheese). */
  MODIFIER = 'MODIFIER',
}
