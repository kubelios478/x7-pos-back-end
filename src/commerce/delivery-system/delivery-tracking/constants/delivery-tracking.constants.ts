//src/commerce/delivery-system/delivery-tracking/constants/delivery-tracking.constants.ts

/** Estados que se guardan en cada ping. `deleted` es sólo el borrado lógico. */
export const TRACKING_STATUSES = ['active', 'inactive'] as const;
export type TrackingStatus = (typeof TRACKING_STATUSES)[number];

/**
 * Estados de asignación en los que ya no tiene sentido recibir posiciones: el reparto
 * terminó. `failed` se incluye aunque el enum aún no lo tenga, para no depender de él.
 */
export const TERMINAL_ASSIGNMENT_STATUSES = [
  'delivered',
  'cancelled',
  'failed',
];

/** Tope de puntos que devuelve una ruta: un reparto de 1 h con un ping cada 5 s son 720. */
export const ROUTE_MAX_POINTS = 2000;

/** Repartos en curso: los únicos que deberían estar emitiendo posición. */
export const LIVE_ASSIGNMENT_STATUSES = ['assigned', 'picked_up', 'in_transit'];

/**
 * Sin ping en 3 minutos el marcador pasa a `signal_lost` (GPS apagado, sin cobertura…).
 * Se calcula al leer, no se guarda: un móvil sin señal no puede avisar de que la perdió.
 */
export const SIGNAL_LOST_AFTER_MS = 3 * 60 * 1000;

/** Estado de la telemetría en el mapa: `inactive` = el repartidor cerró el seguimiento. */
export const TELEMETRY_STATUSES = [
  'active',
  'signal_lost',
  'inactive',
] as const;
export type TelemetryStatus = (typeof TELEMETRY_STATUSES)[number];
