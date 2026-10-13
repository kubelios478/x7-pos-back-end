//src/commerce/delivery-system/delivery-zone/utils/zone-geojson.util.ts
//
// Validación y geometría del perímetro de una zona de reparto.
//
// Se acepta un Polygon, un MultiPolygon o un Feature que envuelva a uno de los dos, como
// objeto o como cadena JSON (el cliente puede pegar el texto crudo). Lo que se persiste es
// SIEMPRE la geometría normalizada como objeto: guardar la cadena en una columna `json`
// dejaba un string JSON dentro del JSON y obligaba a cada lector a parsear dos veces.
//
// Coordenadas en el orden GeoJSON (RFC 7946): [longitud, latitud].

export type Position = [number, number];
export type LinearRing = Position[];

export interface ZonePolygon {
  type: 'Polygon';
  coordinates: LinearRing[];
}

export interface ZoneMultiPolygon {
  type: 'MultiPolygon';
  coordinates: LinearRing[][];
}

export type ZoneGeometry = ZonePolygon | ZoneMultiPolygon;

export type ZoneGeoJsonResult =
  | { ok: true; geometry: ZoneGeometry }
  | { ok: false; error: string };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function validatePosition(value: unknown, where: string): string | null {
  if (!Array.isArray(value) || value.length < 2) {
    return `${where} must be a [longitude, latitude] pair`;
  }
  const [lng, lat] = value;
  if (typeof lng !== 'number' || typeof lat !== 'number') {
    return `${where} must contain numbers`;
  }
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return `${where} must contain finite numbers`;
  }
  if (lng < -180 || lng > 180)
    return `${where} longitude ${lng} is out of range`;
  if (lat < -90 || lat > 90) return `${where} latitude ${lat} is out of range`;
  return null;
}

function validateRing(ring: unknown, where: string): string | null {
  if (!Array.isArray(ring)) return `${where} must be an array of positions`;
  // Un anillo lineal cerrado necesita al menos 4 posiciones: 3 vértices + el cierre.
  if (ring.length < 4) {
    return `${where} needs at least 4 positions (3 vertices plus the closing point)`;
  }
  for (let i = 0; i < ring.length; i += 1) {
    const error = validatePosition(ring[i], `${where}, position ${i + 1}`);
    if (error) return error;
  }
  const first = ring[0] as number[];
  const last = ring[ring.length - 1] as number[];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return `${where} is not closed: the first and last positions must match`;
  }
  const distinct = new Set(
    (ring as number[][]).slice(0, -1).map((p) => `${p[0]},${p[1]}`),
  );
  if (distinct.size < 3) return `${where} needs at least 3 distinct vertices`;
  return null;
}

function validatePolygonCoordinates(
  coordinates: unknown,
  where: string,
): string | null {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return `${where} must contain at least one linear ring`;
  }
  for (let i = 0; i < coordinates.length; i += 1) {
    const error = validateRing(
      coordinates[i],
      i === 0 ? `${where} outer ring` : `${where} hole ${i}`,
    );
    if (error) return error;
  }
  return null;
}

// Sólo conserva [lng, lat]: una altitud o cualquier otro miembro extra no pinta nada en un
// perímetro de reparto y engordaría la columna.
const cleanRing = (ring: number[][]): LinearRing =>
  ring.map((p) => [p[0], p[1]] as Position);

export function parseZoneGeoJson(input: unknown): ZoneGeoJsonResult {
  let value = input;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return { ok: false, error: 'geojson is not valid JSON' };
    }
  }
  if (!isObject(value)) {
    return { ok: false, error: 'geojson must be a GeoJSON object' };
  }
  if (value.type === 'Feature') {
    return parseZoneGeoJson(value.geometry ?? null);
  }
  if (value.type === 'Polygon') {
    const error = validatePolygonCoordinates(value.coordinates, 'Polygon');
    if (error) return { ok: false, error };
    return {
      ok: true,
      geometry: {
        type: 'Polygon',
        coordinates: (value.coordinates as number[][][]).map(cleanRing),
      },
    };
  }
  if (value.type === 'MultiPolygon') {
    const polygons = value.coordinates;
    if (!Array.isArray(polygons) || polygons.length === 0) {
      return {
        ok: false,
        error: 'MultiPolygon must contain at least one polygon',
      };
    }
    for (let i = 0; i < polygons.length; i += 1) {
      const error = validatePolygonCoordinates(polygons[i], `Polygon ${i + 1}`);
      if (error) return { ok: false, error };
    }
    return {
      ok: true,
      geometry: {
        type: 'MultiPolygon',
        coordinates: (polygons as number[][][][]).map((poly) =>
          poly.map(cleanRing),
        ),
      },
    };
  }
  return {
    ok: false,
    error: `geojson type "${String(value.type)}" is not supported; use Polygon or MultiPolygon`,
  };
}

/**
 * Lectura tolerante de lo que ya hay en la base: filas antiguas pueden guardar la geometría
 * como cadena. Devuelve null si no hay un perímetro válido.
 */
export function readStoredGeometry(stored: unknown): ZoneGeometry | null {
  if (stored == null) return null;
  const result = parseZoneGeoJson(stored);
  return result.ok ? result.geometry : null;
}

/** Vértices distintos del perímetro (sin contar el punto de cierre de cada anillo). */
export function vertexCount(geometry: ZoneGeometry): number {
  const polygons =
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.reduce(
    (sum, rings) => sum + rings.reduce((acc, ring) => acc + ring.length - 1, 0),
    0,
  );
}

// Ray casting (par-impar). Un punto sobre el borde puede caer a un lado u otro; para un
// perímetro de reparto trazado a mano esa ambigüedad de centímetros no importa.
function insideRing(lng: number, lat: number, ring: LinearRing): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function insidePolygon(lng: number, lat: number, rings: LinearRing[]): boolean {
  if (!insideRing(lng, lat, rings[0])) return false;
  // Dentro del anillo exterior pero dentro de un hueco = fuera de la zona.
  return !rings.slice(1).some((hole) => insideRing(lng, lat, hole));
}

export function pointInZone(
  lat: number,
  lng: number,
  geometry: ZoneGeometry,
): boolean {
  if (geometry.type === 'Polygon') {
    return insidePolygon(lng, lat, geometry.coordinates);
  }
  return geometry.coordinates.some((rings) => insidePolygon(lng, lat, rings));
}

const EARTH_RADIUS_KM = 6371.0088;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;
// 6 decimales ≈ 11 cm: de sobra para un perímetro y no infla la columna.
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * Plantilla rápida "X km desde la tienda": aproxima el círculo con `segments` vértices
 * calculados sobre la esfera (no en grados planos, que achatan el círculo lejos del
 * ecuador). El anillo sale cerrado y en orden antihorario, como pide RFC 7946.
 */
export function circleZonePolygon(
  lat: number,
  lng: number,
  radiusKm: number,
  segments = 64,
): ZonePolygon {
  const angular = radiusKm / EARTH_RADIUS_KM;
  const lat1 = toRad(lat);
  const lng1 = toRad(lng);
  const ring: LinearRing = [];
  for (let i = 0; i < segments; i += 1) {
    // Rumbo de 0 → 360 en sentido horario desde el norte; recorrerlo al revés da el
    // orden antihorario del anillo exterior.
    const bearing = toRad(360 - (360 * i) / segments);
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angular) +
        Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
    );
    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
        Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
      );
    // Normaliza a [-180, 180] por si el círculo cruza el antimeridiano.
    const lngDeg = ((toDeg(lng2) + 540) % 360) - 180;
    ring.push([round6(lngDeg), round6(toDeg(lat2))]);
  }
  ring.push([ring[0][0], ring[0][1]]);
  return { type: 'Polygon', coordinates: [ring] };
}
