/**
 * Motor de aforo y ritmo de reservas. Funciones PURAS (sin base de datos) para que el cálculo
 * que decide si una reserva entra se pueda probar con precisión de minuto.
 *
 * Ocupación: la historia la define como la suma de comensales de las reservas CONFIRMED /
 * SEATED de la ventana [t, t + duración]. Sumar todo lo que roza la ventana sobrestima: dos
 * mesas de 19:00–20:30 y 20:30–22:00 nunca coinciden. Aquí se usa el PICO de comensales
 * simultáneos dentro de la ventana (barrido de eventos entrada/salida con ventanas
 * semiabiertas), que es la restricción física real: si en ningún instante se supera el aforo,
 * el comedor da abasto.
 */

import {
  LIMITED_THRESHOLD_PCT,
  SOLD_OUT_THRESHOLD_PCT,
  type ServiceShift,
} from './constants/capacity.constants';

const MINUTE_MS = 60_000;

export interface CapacityBooking {
  id: number;
  /** Inicio en ms epoch. */
  start: number;
  /** Fin (exclusivo) en ms epoch. */
  end: number;
  party_size: number;
}

export type OccupancyLevel = 'available' | 'limited' | 'sold_out';

/** Pico de comensales simultáneos dentro de [windowStart, windowEnd). */
export function peakLoad(
  bookings: CapacityBooking[],
  windowStart: number,
  windowEnd: number,
): number {
  const events: Array<[number, number]> = [];
  for (const b of bookings) {
    if (b.start >= windowEnd || b.end <= windowStart) continue;
    events.push([Math.max(b.start, windowStart), b.party_size]);
    events.push([Math.min(b.end, windowEnd), -b.party_size]);
  }
  // A igualdad de instante, las salidas antes que las entradas: una mesa que se libera a las
  // 20:30 deja sitio a la que llega a las 20:30.
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  let load = 0;
  let peak = 0;
  for (const [, delta] of events) {
    load += delta;
    if (load > peak) peak = load;
  }
  return peak;
}

/** Comensales que LLEGAN en [slotStart, slotStart + interval). */
export function arrivalsInSlot(
  bookings: CapacityBooking[],
  slotStart: number,
  intervalMinutes: number,
): number {
  const slotEnd = slotStart + intervalMinutes * MINUTE_MS;
  return bookings
    .filter((b) => b.start >= slotStart && b.start < slotEnd)
    .reduce((sum, b) => sum + b.party_size, 0);
}

/** Inicio de la franja (en hora local) que contiene `time`. */
export function slotStartFor(time: number, intervalMinutes: number): number {
  const d = new Date(time);
  const minutes = d.getHours() * 60 + d.getMinutes();
  const floored = Math.floor(minutes / intervalMinutes) * intervalMinutes;
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    Math.floor(floored / 60),
    floored % 60,
    0,
    0,
  ).getTime();
}

/** Verde < 70 %, ámbar 70–99 %, rojo ≥ 100 %. */
export function occupancyLevel(pct: number): OccupancyLevel {
  if (pct >= SOLD_OUT_THRESHOLD_PCT) return 'sold_out';
  if (pct >= LIMITED_THRESHOLD_PCT) return 'limited';
  return 'available';
}

export interface CapacityRules {
  /** 0 = aforo sin configurar (sin mesas ni ajuste): no se puede aplicar la guarda. */
  seatCapacity: number;
  slotIntervalMinutes: number;
  /** null = sin límite de llegadas. */
  maxCoversPerSlot: number | null;
}

export interface BookingEvaluation {
  /** Pico de comensales ya comprometidos en la ventana de la nueva reserva. */
  bookedSeats: number;
  /** bookedSeats + party_size. */
  projectedSeats: number;
  seatCapacity: number;
  /** Ocupación actual (sin la nueva reserva) en %; null si el aforo no está configurado. */
  occupancyPct: number | null;
  level: OccupancyLevel;
  slotStart: number;
  arrivals: number;
  maxCoversPerSlot: number | null;
  fitsCapacity: boolean;
  fitsThrottle: boolean;
  /** Entra sin override: cabe en el aforo Y respeta el ritmo de llegadas. */
  bookable: boolean;
}

export function evaluateBooking(
  bookings: CapacityBooking[],
  start: number,
  durationMinutes: number,
  partySize: number,
  rules: CapacityRules,
): BookingEvaluation {
  const end = start + durationMinutes * MINUTE_MS;
  const bookedSeats = peakLoad(bookings, start, end);
  const projectedSeats = bookedSeats + partySize;

  const configured = rules.seatCapacity > 0;
  const occupancyPct = configured
    ? Math.round((bookedSeats / rules.seatCapacity) * 1000) / 10
    : null;
  const fitsCapacity = !configured || projectedSeats <= rules.seatCapacity;

  const slotStart = slotStartFor(start, rules.slotIntervalMinutes);
  const arrivals = arrivalsInSlot(bookings, slotStart, rules.slotIntervalMinutes);
  const fitsThrottle =
    rules.maxCoversPerSlot == null || arrivals + partySize <= rules.maxCoversPerSlot;

  // Un hueco lleno para ESTE grupo se pinta rojo aunque su ocupación actual sea ámbar: lo que
  // la anfitriona necesita saber es si puede darle esa hora a quien tiene al teléfono.
  const level: OccupancyLevel =
    !fitsCapacity || !fitsThrottle ? 'sold_out' : occupancyLevel(occupancyPct ?? 0);

  return {
    bookedSeats,
    projectedSeats,
    seatCapacity: rules.seatCapacity,
    occupancyPct,
    level,
    slotStart,
    arrivals,
    maxCoversPerSlot: rules.maxCoversPerSlot,
    fitsCapacity,
    fitsThrottle,
    bookable: fitsCapacity && fitsThrottle,
  };
}

/** "19:30" → minutos desde medianoche; null si no es HH:mm válido. */
export function parseClock(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value ?? '');
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Ventana [inicio, fin) de un turno en un día LOCAL; cruza la medianoche si end ≤ start. */
export function shiftWindow(
  day: Date,
  shift: ServiceShift,
): { start: number; end: number } | null {
  const startMin = parseClock(shift.start);
  const endMin = parseClock(shift.end);
  if (startMin == null || endMin == null) return null;
  const base = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
  const start = base.getTime() + startMin * MINUTE_MS;
  const endOffset = endMin <= startMin ? endMin + 24 * 60 : endMin;
  return { start, end: base.getTime() + endOffset * MINUTE_MS };
}

export interface SlotAvailability extends BookingEvaluation {
  /** "19:15" en hora local. */
  time: string;
}

export interface ShiftAvailability {
  name: string;
  start: string;
  end: string;
  /** Pico de ocupación del turno completo, en %; null sin aforo configurado. */
  occupancyPct: number | null;
  level: OccupancyLevel;
  slots: SlotAvailability[];
}

const clockOf = (time: number): string => {
  const d = new Date(time);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * Matriz de franjas de un día: cada franja evaluada para un grupo de `partySize` que se
 * quedase `durationMinutes`. La última franja de un turno es la última hora de LLEGADA
 * (turno.fin − intervalo), no la de salida.
 */
export function buildAvailability(
  bookings: CapacityBooking[],
  day: Date,
  shifts: ServiceShift[],
  partySize: number,
  durationMinutes: number,
  rules: CapacityRules,
): ShiftAvailability[] {
  const intervalMs = rules.slotIntervalMinutes * MINUTE_MS;
  const result: ShiftAvailability[] = [];

  for (const shift of shifts) {
    const window = shiftWindow(day, shift);
    if (!window) continue;

    const slots: SlotAvailability[] = [];
    for (let t = window.start; t < window.end; t += intervalMs) {
      slots.push({
        time: clockOf(t),
        ...evaluateBooking(bookings, t, durationMinutes, partySize, rules),
      });
    }

    const shiftPeak = peakLoad(bookings, window.start, window.end);
    const occupancyPct =
      rules.seatCapacity > 0
        ? Math.round((shiftPeak / rules.seatCapacity) * 1000) / 10
        : null;

    result.push({
      name: shift.name,
      start: shift.start,
      end: shift.end,
      occupancyPct,
      level: occupancyLevel(occupancyPct ?? 0),
      slots,
    });
  }
  return result;
}

/** Mensaje del 409 que explica por qué la franja no admite la reserva sin override. */
export function capacityConflictMessage(
  evaluation: BookingEvaluation,
  partySize: number,
): string {
  const from = clockOf(evaluation.slotStart);
  if (!evaluation.fitsCapacity) {
    const free = Math.max(evaluation.seatCapacity - evaluation.bookedSeats, 0);
    return (
      `Over capacity: ${evaluation.bookedSeats} of ${evaluation.seatCapacity} seats are already ` +
      `committed around ${from}, so a party of ${partySize} does not fit (${free} free). ` +
      'A manager override is required to overbook.'
    );
  }
  return (
    `Arrival pacing limit: ${evaluation.arrivals} of ${evaluation.maxCoversPerSlot} guests already ` +
    `arrive in the ${from} slot, so a party of ${partySize} would exceed it. ` +
    'A manager override is required.'
  );
}
