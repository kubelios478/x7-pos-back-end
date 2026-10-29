/**
 * Typed replacements for the conversions query DTOs do in `@Transform`, where the incoming
 * value is `any` (whatever the query string held).
 */

/**
 * `parseInt` of a query value, exactly as `parseInt(value)` did: parseInt converts its
 * argument to a string first, so `parseInt(String(value))` returns the same for any input
 * ('12' → 12, '12abc' → 12, '' / undefined / 'abc' → NaN).
 */
export function toInt(value: unknown): number {
  return parseInt(String(value));
}
