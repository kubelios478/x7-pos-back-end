import { ReservationStatus } from '../../reservation/constants/reservation.constants';

/** Tramo de servicio del local, en hora LOCAL del servidor ("HH:mm"). */
export interface ServiceShift {
  name: string;
  start: string;
  end: string;
}

/**
 * Turnos por defecto de un comercio sin configuración propia (los de la historia). Un turno
 * cuyo `end` es anterior o igual a su `start` cruza la medianoche.
 */
export const DEFAULT_SHIFTS: ServiceShift[] = [
  { name: 'Lunch', start: '12:00', end: '16:00' },
  { name: 'Dinner', start: '19:00', end: '23:00' },
];

export const DEFAULT_SLOT_INTERVAL_MINUTES = 15;
export const ALLOWED_SLOT_INTERVALS = [15, 30];

/**
 * Estados que ocupan sillas en la fórmula de la historia: sólo CONFIRMED y SEATED. Una
 * PENDING todavía no ha comprometido el sitio (por eso la comprobación se repite al
 * confirmarla) y la lista de espera es, por definición, lo que no cabe.
 */
export const SEAT_HOLDING_STATUSES: ReservationStatus[] = [
  ReservationStatus.CONFIRMED,
  ReservationStatus.SEATED,
];

/** Umbrales del semáforo de ocupación (%). */
export const LIMITED_THRESHOLD_PCT = 70;
export const SOLD_OUT_THRESHOLD_PCT = 100;

/** Estados de mesa que NO aportan sillas al aforo calculado desde el inventario. */
export const NON_SEATING_TABLE_STATUSES = ['deleted', 'out_of_service'];

/**
 * Espacio de nombres del cerrojo consultivo (pg_advisory_xact_lock) que serializa las
 * altas/confirmaciones de un mismo comercio: sin él, dos anfitrionas que reservan la última
 * mesa a la vez leen el mismo aforo libre y las dos pasan la guarda.
 */
export const CAPACITY_LOCK_NAMESPACE = 72_031;

/** Código máquina del 409 que la UI usa para ofrecer el override del encargado. */
export const CAPACITY_OVERRIDE_REQUIRED = 'CAPACITY_OVERRIDE_REQUIRED';
