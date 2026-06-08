import { RecipeLineType } from '../constants/recipe-line-type.enum';
import { recipeLineShouldDeduct } from './recipe-deduction-rules.util';

describe('recipeLineShouldDeduct', () => {
  it('includes MODIFIER line only when modifier is selected', () => {
    const selected = new Set<number>([7]);
    expect(recipeLineShouldDeduct(RecipeLineType.MODIFIER, 7, selected)).toBe(
      true,
    );
    expect(recipeLineShouldDeduct(RecipeLineType.MODIFIER, 8, selected)).toBe(
      false,
    );
  });

  it('includes OPTIONAL without modifier always', () => {
    expect(
      recipeLineShouldDeduct(RecipeLineType.OPTIONAL, null, new Set()),
    ).toBe(true);
  });
});
