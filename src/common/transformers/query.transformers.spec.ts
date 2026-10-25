import { toInt } from './query.transformers';

describe('toInt', () => {
  it.each([
    ['12', 12],
    ['12abc', 12],
    ['  7', 7],
    ['-3', -3],
    [5, 5],
    [['4', '9'], 4],
  ])('matches parseInt(value) for %p', (value, expected) => {
    expect(toInt(value)).toBe(expected);
    expect(toInt(value)).toBe(parseInt(value as string));
  });

  it.each([[''], ['abc'], [undefined], [null]])(
    'gives NaN for %p, as parseInt does (the DTO validators then reject it)',
    (value) => {
      expect(toInt(value)).toBeNaN();
      expect(parseInt(value as string)).toBeNaN();
    },
  );
});
