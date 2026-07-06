import { RecipeQuantityUnit } from '../constants/recipe-quantity-unit.enum';
import { VariantStockBasisKind } from '../constants/variant-stock-basis-kind.enum';
import {
  isRecipeUnitCompatibleWithStockBasis,
  recipeQuantityToCanonicalPerSoldUnit,
  stockIncrementsForRecipeLine,
} from './recipe-unit-conversion.util';

describe('recipeQuantityToCanonicalPerSoldUnit', () => {
  it('converts KILOGRAM to grams', () => {
    expect(
      recipeQuantityToCanonicalPerSoldUnit(2, RecipeQuantityUnit.KILOGRAM),
    ).toBe(2000);
  });

  it('converts LITER to milliliters', () => {
    expect(
      recipeQuantityToCanonicalPerSoldUnit(0.5, RecipeQuantityUnit.LITER),
    ).toBe(500);
  });
});

describe('isRecipeUnitCompatibleWithStockBasis', () => {
  it('matches mass units with MASS_GRAM', () => {
    expect(
      isRecipeUnitCompatibleWithStockBasis(
        RecipeQuantityUnit.GRAM,
        VariantStockBasisKind.MASS_GRAM,
      ),
    ).toBe(true);
    expect(
      isRecipeUnitCompatibleWithStockBasis(
        RecipeQuantityUnit.MILLILITER,
        VariantStockBasisKind.MASS_GRAM,
      ),
    ).toBe(false);
  });
});

describe('stockIncrementsForRecipeLine', () => {
  it('uses legacy ceil when stock mapping is missing', () => {
    expect(
      stockIncrementsForRecipeLine(1.1, RecipeQuantityUnit.UNIT, 3, null, null),
    ).toBe(4);
  });

  it('converts grams to stock increments', () => {
    expect(
      stockIncrementsForRecipeLine(
        150,
        RecipeQuantityUnit.GRAM,
        1,
        VariantStockBasisKind.MASS_GRAM,
        '100',
      ),
    ).toBe(2);
  });
});
