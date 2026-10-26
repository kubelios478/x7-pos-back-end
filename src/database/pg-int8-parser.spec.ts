import { types } from 'pg';
import { parseInt8 } from './pg-int8-parser';

describe('pg int8 parser', () => {
  it('is registered for bigint columns', () => {
    expect(types.getTypeParser(types.builtins.INT8)('42')).toBe(42);
  });

  it('reads ids and counts as numbers', () => {
    expect(parseInt8('2')).toBe(2);
    expect(parseInt8('0')).toBe(0);
    expect(parseInt8('-7')).toBe(-7);
  });

  it('keeps a value beyond the safe integer range as its exact string', () => {
    expect(parseInt8('9007199254740993')).toBe('9007199254740993');
  });
});
