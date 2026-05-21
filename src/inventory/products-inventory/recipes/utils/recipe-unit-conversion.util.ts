import { RecipeQuantityUnit } from '../constants/recipe-quantity-unit.enum';
import { VariantStockBasisKind } from '../constants/variant-stock-basis-kind.enum';

/**
 * Converts one recipe quantity (in `unit`) to a canonical amount:
 * mass → grams, volume → milliliters, {@link RecipeQuantityUnit.UNIT} → count.
 */
export function recipeQuantityToCanonicalPerSoldUnit(
  quantityPerSoldUnit: number,
  unit: RecipeQuantityUnit,
): number {
  if (!Number.isFinite(quantityPerSoldUnit)) {
    return 0;
  }
  switch (unit) {
    case RecipeQuantityUnit.GRAM:
      return quantityPerSoldUnit;
    case RecipeQuantityUnit.KILOGRAM:
      return quantityPerSoldUnit * 1000;
    case RecipeQuantityUnit.MILLILITER:
      return quantityPerSoldUnit;
    case RecipeQuantityUnit.LITER:
      return quantityPerSoldUnit * 1000;
    case RecipeQuantityUnit.UNIT:
      return quantityPerSoldUnit;
    default:
      return quantityPerSoldUnit;
  }
}

export function isRecipeUnitCompatibleWithStockBasis(
  unit: RecipeQuantityUnit,
  basis: VariantStockBasisKind,
): boolean {
  if (basis === VariantStockBasisKind.MASS_GRAM) {
    return (
      unit === RecipeQuantityUnit.GRAM || unit === RecipeQuantityUnit.KILOGRAM
    );
  }
  if (basis === VariantStockBasisKind.VOLUME_ML) {
    return (
      unit === RecipeQuantityUnit.MILLILITER ||
      unit === RecipeQuantityUnit.LITER
    );
  }
  return unit === RecipeQuantityUnit.UNIT;
}

function parseBaseUnitsPerIncrement(
  baseUnitsPerStockIncrement: string | null | undefined,
): number | null {
  if (baseUnitsPerStockIncrement == null || baseUnitsPerStockIncrement === '') {
    return null;
  }
  const n = Number(baseUnitsPerStockIncrement);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return n;
}

/**
 * Integer stock quantity (`Item.currentQty`) to deduct for one recipe line,
 * given quantity per sold unit, line UOM, and optional variant stock mapping.
 *
 * Legacy: when both `stockBasisKind` and `baseUnitsPerStockIncrement` are unset,
 * uses {@link Math.ceil} of `quantityPerSoldUnit * soldQty` (same as pre–UOM behavior).
 */
export function stockIncrementsForRecipeLine(
  quantityPerSoldUnit: number,
  quantityUnit: RecipeQuantityUnit,
  soldQty: number,
  stockBasisKind: VariantStockBasisKind | null | undefined,
  baseUnitsPerStockIncrement: string | null | undefined,
): number {
  const raw = quantityPerSoldUnit * soldQty;
  if (!Number.isFinite(raw) || soldQty <= 0) {
    return 0;
  }

  const baseParsed = parseBaseUnitsPerIncrement(baseUnitsPerStockIncrement);
  const hasStockMapping = stockBasisKind != null && baseParsed != null;

  if (!hasStockMapping) {
    return Math.ceil(raw);
  }

  if (!isRecipeUnitCompatibleWithStockBasis(quantityUnit, stockBasisKind)) {
    return Math.ceil(raw);
  }

  const canonicalPerSold = recipeQuantityToCanonicalPerSoldUnit(
    quantityPerSoldUnit,
    quantityUnit,
  );
  const canonicalTotal = canonicalPerSold * soldQty;
  return Math.ceil(canonicalTotal / baseParsed);
}
