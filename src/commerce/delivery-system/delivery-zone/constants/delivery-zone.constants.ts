//src/commerce/delivery-system/delivery-zone/constants/delivery-zone.constants.ts

/** Estados que puede elegir el usuario. `deleted` es sólo el borrado lógico. */
export const DELIVERY_ZONE_STATUSES = [
  'active',
  'inactive',
  'maintenance',
] as const;
export type DeliveryZoneStatus = (typeof DELIVERY_ZONE_STATUSES)[number];

/** Sólo una zona `active` acepta pedidos: `inactive` y `maintenance` los bloquean. */
export const ORDERABLE_ZONE_STATUS: DeliveryZoneStatus = 'active';

export const DELIVERY_ZONE_NAME_MAX = 200;
export const DELIVERY_ZONE_DESCRIPTION_MAX = 500;
