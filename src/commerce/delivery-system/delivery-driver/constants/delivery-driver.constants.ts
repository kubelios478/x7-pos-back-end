//src/commerce/delivery-system/delivery-driver/constants/delivery-driver.constants.ts

/**
 * Estado operativo del repartidor (columna varchar `status`).
 * - active: de turno y libre → es el ÚNICO asignable.
 * - on_delivery: con una asignación en curso. Sólo lo pone/quita el flujo de asignaciones.
 * - off_duty: fuera de turno (lo cambia el endpoint de turno).
 * - inactive: dado de baja temporalmente por el administrador.
 * - deleted: borrado suave.
 */
export enum DriverStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ON_DELIVERY = 'on_delivery',
  OFF_DUTY = 'off_duty',
  DELETED = 'deleted',
}

/** Lo que un administrador puede fijar a mano: on_delivery queda reservado al flujo de asignación. */
export const EDITABLE_DRIVER_STATUSES = [
  DriverStatus.ACTIVE,
  DriverStatus.INACTIVE,
  DriverStatus.OFF_DUTY,
] as const;

export const LIVE_DRIVER_STATUSES = [
  DriverStatus.ACTIVE,
  DriverStatus.INACTIVE,
  DriverStatus.ON_DELIVERY,
  DriverStatus.OFF_DUTY,
] as const;

export const FILTERABLE_DRIVER_STATUSES = [
  ...LIVE_DRIVER_STATUSES,
  DriverStatus.DELETED,
] as const;

/**
 * Valores guardados (estables, en minúsculas) → etiqueta de la UI:
 * car = Car, motorcycle = Motorcycle, bicycle = Bicycle, e_scooter = E-Scooter, on_foot = On Foot.
 */
export enum VehicleType {
  CAR = 'car',
  MOTORCYCLE = 'motorcycle',
  BICYCLE = 'bicycle',
  E_SCOOTER = 'e_scooter',
  ON_FOOT = 'on_foot',
}
