//src/commerce/delivery-system/delivery-assignment/constants/delivery-status.enum.ts
//
// Ciclo de vida de una asignación de reparto. Sustituye al enum compartido de
// `delivery-system/constants` (que tenía UNASSIGNED y no tenía FAILED): `pending` ya
// expresa "sin repartidor", y hacía falta un estado de salida para los repartos fallidos.
export enum DeliveryStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}
