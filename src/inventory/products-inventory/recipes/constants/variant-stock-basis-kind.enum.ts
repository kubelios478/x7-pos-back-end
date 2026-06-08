/**
 * What one integer increment of `Item.currentQty` represents for conversion
 * together with `Variant.baseUnitsPerStockIncrement`.
 */
export enum VariantStockBasisKind {
  MASS_GRAM = 'MASS_GRAM',
  VOLUME_ML = 'VOLUME_ML',
  UNIT_COUNT = 'UNIT_COUNT',
}
