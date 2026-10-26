import { types } from 'pg';

/**
 * `bigint` (int8) values are read as numbers.
 *
 * pg returns them as strings, because an int8 can exceed Number.MAX_SAFE_INTEGER. The
 * entities declare these columns as `number`, and the API then sent ids like `"2"` — and
 * COUNT(*) / SUM(int) results, which Postgres also types as bigint, as strings. Ids and
 * counts here stay far below 2^53; a value beyond it is kept as the exact string rather
 * than silently rounded.
 */
export function parseInt8(value: string): number | string {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : value;
}

types.setTypeParser(types.builtins.INT8, parseInt8);
