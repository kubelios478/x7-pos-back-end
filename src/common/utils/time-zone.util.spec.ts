import { dayBoundsInTimeZone, isValidTimeZone } from './time-zone.util';

describe('time-zone util', () => {
  it('accepts IANA zones and rejects anything else', () => {
    expect(isValidTimeZone('America/New_York')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('America/Atlantis')).toBe(false);
    expect(isValidTimeZone('GMT-3 local')).toBe(false);
  });

  it('a New York day starts at its own midnight, not UTC midnight', () => {
    // 23:30 on 24 Oct in New York (EDT, UTC-4) is already 03:30 on 25 Oct in UTC
    const at = new Date('2026-10-25T03:30:00Z');
    const { start, end } = dayBoundsInTimeZone(at, 'America/New_York');
    expect(start.toISOString()).toBe('2026-10-24T04:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-25T04:00:00.000Z');
  });

  it('UTC keeps the previous behaviour', () => {
    const { start, end } = dayBoundsInTimeZone(
      new Date('2026-10-25T15:00:00Z'),
      'UTC',
    );
    expect(start.toISOString()).toBe('2026-10-25T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-26T00:00:00.000Z');
  });

  it('handles a 25-hour day (DST ends in New York on 1 Nov 2026)', () => {
    const { start, end } = dayBoundsInTimeZone(
      new Date('2026-11-01T15:00:00Z'),
      'America/New_York',
    );
    expect(start.toISOString()).toBe('2026-11-01T04:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-02T05:00:00.000Z');
  });

  it('works for other zones (Santiago is UTC-3 in October)', () => {
    const { start } = dayBoundsInTimeZone(
      new Date('2026-10-25T01:00:00Z'),
      'America/Santiago',
    );
    expect(start.toISOString()).toBe('2026-10-24T03:00:00.000Z');
  });
});
