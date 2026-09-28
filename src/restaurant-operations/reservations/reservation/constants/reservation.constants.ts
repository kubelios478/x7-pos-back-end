export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SEATED = 'seated',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  WAIT_LIST = 'white_list',
  NO_SHOW = 'no_show',
}

/**
 * Estados en los que una reserva YA NO retiene su mesa.
 *
 * Es la definición compartida de "esta reserva libera el sitio": la usan tanto el chequeo de
 * disponibilidad del alta de reservas como la guarda de solape de las asignaciones de mesa.
 * Tenerla por duplicado era la vía rápida a que una de las dos considerase ocupada una mesa
 * que la otra da por libre.
 */
export const TABLE_RELEASING_STATUSES: ReservationStatus[] = [
  ReservationStatus.CANCELLED,
  ReservationStatus.NO_SHOW,
  ReservationStatus.COMPLETED,
];
