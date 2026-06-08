import { RecipeLineType } from '../constants/recipe-line-type.enum';

/**
 * Whether a recipe line consumes stock for a POS line given selected modifiers.
 */
export function recipeLineShouldDeduct(
  lineType: RecipeLineType,
  modifierId: number | null,
  selectedModifierIds: Set<number>,
): boolean {
  if (lineType === RecipeLineType.REQUIRED) {
    return true;
  }
  if (lineType === RecipeLineType.OPTIONAL) {
    if (modifierId == null) {
      return true;
    }
    return selectedModifierIds.has(modifierId);
  }
  if (lineType === RecipeLineType.MODIFIER) {
    if (modifierId == null) {
      return false;
    }
    return selectedModifierIds.has(modifierId);
  }
  return true;
}
