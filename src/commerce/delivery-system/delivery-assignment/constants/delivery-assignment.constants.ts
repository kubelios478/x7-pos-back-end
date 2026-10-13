//src/commerce/delivery-system/delivery-assignment/constants/delivery-assignment.constants.ts
import { DeliveryStatus } from './delivery-status.enum';

/** Estado lógico del registro (borrado suave), independiente del ciclo de reparto. */
export const LIVE_RECORD_STATUSES = ['active', 'inactive'];

/** Estados de los que ya no se sale: el reparto terminó (bien o mal). */
export const TERMINAL_DELIVERY_STATUSES: readonly DeliveryStatus[] = [
  DeliveryStatus.DELIVERED,
  DeliveryStatus.FAILED,
  DeliveryStatus.CANCELLED,
];

/** No terminales: el pedido sigue "en manos" de esta asignación. */
export const OPEN_DELIVERY_STATUSES: readonly DeliveryStatus[] = [
  DeliveryStatus.PENDING,
  DeliveryStatus.ASSIGNED,
  DeliveryStatus.PICKED_UP,
  DeliveryStatus.IN_TRANSIT,
];

/** Con un repartidor (propio o del DSP) ya comprometido con el pedido. */
export const DISPATCHED_DELIVERY_STATUSES: readonly DeliveryStatus[] = [
  DeliveryStatus.ASSIGNED,
  DeliveryStatus.PICKED_UP,
  DeliveryStatus.IN_TRANSIT,
];

/**
 * Transiciones permitidas. FAILED y CANCELLED son salidas desde cualquier estado no
 * terminal. PICKED_UP → DELIVERED se admite sin pasar por IN_TRANSIT: los DSP no envían
 * un evento "en camino" y un reparto corto puede no marcarlo nunca a mano; sin este atajo
 * esas asignaciones no podrían cerrarse.
 */
export const DELIVERY_STATUS_TRANSITIONS: Record<
  DeliveryStatus,
  readonly DeliveryStatus[]
> = {
  [DeliveryStatus.PENDING]: [
    DeliveryStatus.ASSIGNED,
    DeliveryStatus.FAILED,
    DeliveryStatus.CANCELLED,
  ],
  [DeliveryStatus.ASSIGNED]: [
    DeliveryStatus.PICKED_UP,
    DeliveryStatus.FAILED,
    DeliveryStatus.CANCELLED,
  ],
  [DeliveryStatus.PICKED_UP]: [
    DeliveryStatus.IN_TRANSIT,
    DeliveryStatus.DELIVERED,
    DeliveryStatus.FAILED,
    DeliveryStatus.CANCELLED,
  ],
  [DeliveryStatus.IN_TRANSIT]: [
    DeliveryStatus.DELIVERED,
    DeliveryStatus.FAILED,
    DeliveryStatus.CANCELLED,
  ],
  [DeliveryStatus.DELIVERED]: [],
  [DeliveryStatus.FAILED]: [],
  [DeliveryStatus.CANCELLED]: [],
};

/** Orden del camino feliz; sirve para saber si un evento de webhook ya quedó atrás. */
export const DELIVERY_STATUS_PROGRESS: readonly DeliveryStatus[] = [
  DeliveryStatus.PENDING,
  DeliveryStatus.ASSIGNED,
  DeliveryStatus.PICKED_UP,
  DeliveryStatus.IN_TRANSIT,
  DeliveryStatus.DELIVERED,
];

export const isTerminalStatus = (status: DeliveryStatus): boolean =>
  TERMINAL_DELIVERY_STATUSES.includes(status);

export const canTransition = (
  from: DeliveryStatus,
  to: DeliveryStatus,
): boolean => DELIVERY_STATUS_TRANSITIONS[from]?.includes(to) ?? false;

/**
 * No hay campo de hora estimada de entrega en `orders` ni en la asignación: se usa este
 * umbral fijo desde `assigned_at` para marcar un reparto como retrasado.
 */
export const DELIVERY_DELAY_THRESHOLD_MINUTES = 45;

/** Ventana del KPI de tiempo medio de entrega (entregas cerradas en las últimas N horas). */
export const AVG_COMPLETION_WINDOW_HOURS = 24;
