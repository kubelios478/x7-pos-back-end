//src/commerce/delivery-system/delivery-driver/utils/delivery-driver-normalize.util.ts
import { VehicleType } from '../constants/delivery-driver.constants';

// Variantes conocidas (etiquetas de la UI y texto libre de filas antiguas) → valor canónico.
// La clave se compara en minúsculas y sin espacios, guiones ni guiones bajos.
const VEHICLE_ALIASES: Record<string, VehicleType> = {
  car: VehicleType.CAR,
  auto: VehicleType.CAR,
  automobile: VehicleType.CAR,
  carro: VehicleType.CAR,
  coche: VehicleType.CAR,
  motorcycle: VehicleType.MOTORCYCLE,
  motorbike: VehicleType.MOTORCYCLE,
  moto: VehicleType.MOTORCYCLE,
  motocicleta: VehicleType.MOTORCYCLE,
  bicycle: VehicleType.BICYCLE,
  bike: VehicleType.BICYCLE,
  bicicleta: VehicleType.BICYCLE,
  escooter: VehicleType.E_SCOOTER,
  scooter: VehicleType.E_SCOOTER,
  patinete: VehicleType.E_SCOOTER,
  onfoot: VehicleType.ON_FOOT,
  foot: VehicleType.ON_FOOT,
  walking: VehicleType.ON_FOOT,
  apie: VehicleType.ON_FOOT,
};

/** Devuelve el valor canónico o null si no se reconoce. */
export const normalizeVehicleType = (value: unknown): VehicleType | null => {
  if (typeof value !== 'string') return null;
  const key = value
    .trim()
    .toLowerCase()
    .replace(/[\s\-_]+/g, '');
  return VEHICLE_ALIASES[key] ?? null;
};

/**
 * Teléfono apto para `tel:`: sin espacios, guiones, puntos ni paréntesis y con el `+`
 * inicial si lo había ("+1 (809) 555-1234" → "+18095551234"). Se GUARDA así, de modo que la
 * unicidad se compara sobre la misma forma que se almacena.
 */
export const normalizePhone = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  const plus = trimmed.startsWith('+') ? '+' : '';
  return plus + trimmed.replace(/^\+/, '').replace(/[\s\-.()]/g, '');
};

export const PHONE_PATTERN = /^\+?[0-9]{4,19}$/;

/**
 * Claves normalizadas (minúsculas, sin espacios/guiones/guiones bajos) que equivalen a los
 * tipos pedidos. Permite filtrar en SQL también las filas antiguas con texto libre.
 */
export const vehicleAliasKeys = (types: readonly VehicleType[]): string[] =>
  Object.entries(VEHICLE_ALIASES)
    .filter(([, type]) => types.includes(type))
    .map(([key]) => key);
