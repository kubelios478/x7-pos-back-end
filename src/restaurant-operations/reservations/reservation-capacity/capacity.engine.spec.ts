import {
  arrivalsInSlot,
  buildAvailability,
  capacityConflictMessage,
  evaluateBooking,
  occupancyLevel,
  parseClock,
  peakLoad,
  shiftWindow,
  slotStartFor,
  type CapacityBooking,
} from './capacity.engine';

// Hora local del 16/04/2026, igual que el reloj del local.
const at = (h: number, m = 0) => new Date(2026, 3, 16, h, m, 0, 0).getTime();
const booking = (
  id: number,
  h: number,
  m: number,
  minutes: number,
  party: number,
): CapacityBooking => ({
  id,
  start: at(h, m),
  end: at(h, m) + minutes * 60_000,
  party_size: party,
});

const RULES = { seatCapacity: 20, slotIntervalMinutes: 15, maxCoversPerSlot: null };

describe('peakLoad', () => {
  it('sums only guests that are seated at the same time', () => {
    const book = [booking(1, 19, 0, 90, 8), booking(2, 20, 30, 90, 10)];
    // Back-to-back: nunca coinciden, el pico es la mayor de las dos.
    expect(peakLoad(book, at(19), at(22))).toBe(10);
  });

  it('adds overlapping parties', () => {
    const book = [booking(1, 19, 0, 90, 8), booking(2, 20, 0, 90, 6)];
    expect(peakLoad(book, at(19), at(21))).toBe(14);
  });

  it('ignores bookings outside the window (half-open)', () => {
    const book = [booking(1, 17, 30, 90, 8), booking(2, 21, 0, 60, 6)];
    expect(peakLoad(book, at(19), at(21))).toBe(0);
  });
});

describe('arrivalsInSlot', () => {
  it('counts guests whose arrival falls in [slot, slot + interval)', () => {
    const book = [booking(1, 19, 0, 90, 4), booking(2, 19, 14, 90, 6), booking(3, 19, 15, 90, 5)];
    expect(arrivalsInSlot(book, at(19), 15)).toBe(10);
    expect(arrivalsInSlot(book, at(19), 30)).toBe(15);
  });
});

describe('slotStartFor', () => {
  it('floors to the interval in local time', () => {
    expect(slotStartFor(at(19, 22), 15)).toBe(at(19, 15));
    expect(slotStartFor(at(19, 22), 30)).toBe(at(19, 0));
  });
});

describe('occupancyLevel', () => {
  it('maps the story thresholds', () => {
    expect(occupancyLevel(69.9)).toBe('available');
    expect(occupancyLevel(70)).toBe('limited');
    expect(occupancyLevel(99.9)).toBe('limited');
    expect(occupancyLevel(100)).toBe('sold_out');
  });
});

describe('evaluateBooking', () => {
  const book = [booking(1, 19, 0, 90, 8), booking(2, 19, 30, 90, 6)];

  it('accepts a party that fits: current occupancy + party ≤ capacity', () => {
    const e = evaluateBooking(book, at(19), 90, 6, RULES);
    expect(e.bookedSeats).toBe(14);
    expect(e.projectedSeats).toBe(20);
    expect(e.occupancyPct).toBe(70);
    expect(e.level).toBe('limited');
    expect(e.bookable).toBe(true);
  });

  it('rejects a party that would overbook, and paints the slot red', () => {
    const e = evaluateBooking(book, at(19), 90, 7, RULES);
    expect(e.fitsCapacity).toBe(false);
    expect(e.bookable).toBe(false);
    expect(e.level).toBe('sold_out');
    expect(capacityConflictMessage(e, 7)).toContain('14 of 20 seats');
  });

  it('enforces the arrival throttle per slot', () => {
    const rules = { ...RULES, seatCapacity: 100, maxCoversPerSlot: 12 };
    const e = evaluateBooking(book, at(19, 5), 90, 5, rules);
    expect(e.arrivals).toBe(8);
    expect(e.fitsCapacity).toBe(true);
    expect(e.fitsThrottle).toBe(false);
    expect(e.bookable).toBe(false);
    expect(capacityConflictMessage(e, 5)).toContain('Arrival pacing limit: 8 of 12');
  });

  it('does not guard capacity when it is not configured', () => {
    const e = evaluateBooking(book, at(19), 90, 50, { ...RULES, seatCapacity: 0 });
    expect(e.occupancyPct).toBeNull();
    expect(e.bookable).toBe(true);
  });
});

describe('shifts and availability', () => {
  it('parses HH:mm and rejects garbage', () => {
    expect(parseClock('19:30')).toBe(1170);
    expect(parseClock('24:00')).toBeNull();
    expect(parseClock('7pm')).toBeNull();
  });

  it('wraps shifts that cross midnight', () => {
    const w = shiftWindow(new Date(2026, 3, 16), { name: 'Late', start: '22:00', end: '01:00' })!;
    expect((w.end - w.start) / 60_000).toBe(180);
  });

  it('builds 15-minute slots up to the last arrival time', () => {
    const shifts = buildAvailability(
      [booking(1, 19, 0, 90, 16)],
      new Date(2026, 3, 16),
      [{ name: 'Dinner', start: '19:00', end: '20:00' }],
      4,
      90,
      RULES,
    );
    expect(shifts[0].slots.map((s) => s.time)).toEqual(['19:00', '19:15', '19:30', '19:45']);
    expect(shifts[0].slots[0]).toEqual(
      expect.objectContaining({ bookedSeats: 16, occupancyPct: 80, level: 'limited', bookable: true }),
    );
    expect(shifts[0].occupancyPct).toBe(80);
  });
});
