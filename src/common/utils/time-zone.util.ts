/** Whether `timeZone` is an IANA zone this runtime knows (e.g. 'America/New_York'). */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Offset of `timeZone` from UTC at instant `at`, in milliseconds (New York in winter: -5 h). */
function offsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/**
 * Start (inclusive) and end (exclusive) of the calendar day that contains `at` in
 * `timeZone`, as instants. A restaurant's "today" starts at its own midnight, not at UTC
 * midnight. The day can be 23 or 25 hours long around a DST change.
 */
export function dayBoundsInTimeZone(
  at: Date,
  timeZone: string,
): { start: Date; end: Date } {
  const local = new Date(at.getTime() + offsetMs(at, timeZone));
  const midnight = (y: number, m: number, d: number) => {
    const guess = Date.UTC(y, m, d);
    // the offset at local midnight, not at `at`, so a DST change during the day is honoured
    return new Date(guess - offsetMs(new Date(guess), timeZone));
  };
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  return { start: midnight(y, m, d), end: midnight(y, m, d + 1) };
}
