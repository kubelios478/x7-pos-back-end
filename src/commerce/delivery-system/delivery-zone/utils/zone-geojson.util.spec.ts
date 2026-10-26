//src/commerce/delivery-system/delivery-zone/utils/zone-geojson.util.spec.ts
import {
  circleZonePolygon,
  parseZoneGeoJson,
  pointInZone,
  readStoredGeometry,
  vertexCount,
  ZoneGeometry,
} from './zone-geojson.util';

// Cuadrado de 0.02° alrededor de (18.46, -69.93) — orden GeoJSON [lng, lat].
const SQUARE = {
  type: 'Polygon',
  coordinates: [
    [
      [-69.94, 18.45],
      [-69.92, 18.45],
      [-69.92, 18.47],
      [-69.94, 18.47],
      [-69.94, 18.45],
    ],
  ],
};

describe('parseZoneGeoJson', () => {
  it('accepts a closed Polygon object', () => {
    const result = parseZoneGeoJson(SQUARE);
    expect(result.ok).toBe(true);
  });

  it('accepts the same polygon as a JSON string and returns an object', () => {
    const result = parseZoneGeoJson(JSON.stringify(SQUARE));
    expect(result).toEqual({ ok: true, geometry: SQUARE });
  });

  it('unwraps a Feature', () => {
    const result = parseZoneGeoJson({
      type: 'Feature',
      properties: {},
      geometry: SQUARE,
    });
    expect(result).toEqual({ ok: true, geometry: SQUARE });
  });

  it('accepts a MultiPolygon', () => {
    const result = parseZoneGeoJson({
      type: 'MultiPolygon',
      coordinates: [SQUARE.coordinates],
    });
    expect(result.ok).toBe(true);
  });

  it('rejects invalid JSON text', () => {
    expect(parseZoneGeoJson('{"type":"Polygon",')).toEqual({
      ok: false,
      error: 'geojson is not valid JSON',
    });
  });

  it('rejects an unclosed ring', () => {
    const open = {
      type: 'Polygon',
      coordinates: [
        SQUARE.coordinates[0].slice(0, -1).concat([[-69.95, 18.44]]),
      ],
    };
    const result = parseZoneGeoJson(open);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/not closed/);
  });

  it('rejects rings with fewer than 4 positions', () => {
    const result = parseZoneGeoJson({
      type: 'Polygon',
      coordinates: [
        [
          [-69.94, 18.45],
          [-69.92, 18.45],
          [-69.94, 18.45],
        ],
      ],
    });
    expect(!result.ok && result.error).toMatch(/at least 4 positions/);
  });

  it('rejects a degenerate ring whose vertices repeat', () => {
    const result = parseZoneGeoJson({
      type: 'Polygon',
      coordinates: [
        [
          [-69.9384, 18.4662],
          [-69.9384, 18.4662],
          [-69.9384, 18.4662],
          [-69.9384, 18.4662],
        ],
      ],
    });
    expect(!result.ok && result.error).toMatch(/3 distinct vertices/);
  });

  it('rejects out-of-range coordinates (lat/lng swapped past 90)', () => {
    const result = parseZoneGeoJson({
      type: 'Polygon',
      coordinates: [
        [
          [18.45, -169.94],
          [18.45, -169.92],
          [18.47, -169.92],
          [18.45, -169.94],
        ],
      ],
    });
    expect(!result.ok && result.error).toMatch(/out of range/);
  });

  it('rejects unsupported geometry types', () => {
    const result = parseZoneGeoJson({ type: 'Point', coordinates: [0, 0] });
    expect(!result.ok && result.error).toMatch(/not supported/);
  });

  it('strips altitude from positions', () => {
    const result = parseZoneGeoJson({
      type: 'Polygon',
      coordinates: [SQUARE.coordinates[0].map(([x, y]) => [x, y, 12])],
    });
    expect(result).toEqual({ ok: true, geometry: SQUARE });
  });
});

describe('pointInZone', () => {
  const square = SQUARE as ZoneGeometry;

  it('finds a point inside the polygon', () => {
    expect(pointInZone(18.46, -69.93, square)).toBe(true);
  });

  it('rejects a point outside the polygon', () => {
    expect(pointInZone(18.5, -69.93, square)).toBe(false);
  });

  it('does not confuse lat and lng order', () => {
    expect(pointInZone(-69.93, 18.46, square)).toBe(false);
  });

  it('treats holes as outside', () => {
    const withHole: ZoneGeometry = {
      type: 'Polygon',
      coordinates: [
        SQUARE.coordinates[0] as [number, number][],
        [
          [-69.935, 18.455],
          [-69.925, 18.455],
          [-69.925, 18.465],
          [-69.935, 18.465],
          [-69.935, 18.455],
        ],
      ],
    };
    expect(pointInZone(18.46, -69.93, withHole)).toBe(false);
    expect(pointInZone(18.451, -69.939, withHole)).toBe(true);
  });

  it('handles concave polygons (L shape)', () => {
    const lShape: ZoneGeometry = {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [2, 0],
          [2, 1],
          [1, 1],
          [1, 2],
          [0, 2],
          [0, 0],
        ],
      ],
    };
    expect(pointInZone(0.5, 0.5, lShape)).toBe(true);
    expect(pointInZone(1.5, 1.5, lShape)).toBe(false);
  });

  it('matches any member of a MultiPolygon', () => {
    const multi: ZoneGeometry = {
      type: 'MultiPolygon',
      coordinates: [
        SQUARE.coordinates as [number, number][][],
        [
          [
            [10, 10],
            [11, 10],
            [11, 11],
            [10, 10],
          ],
        ],
      ],
    };
    expect(pointInZone(10.2, 10.8, multi)).toBe(true);
  });
});

describe('vertexCount / readStoredGeometry', () => {
  it('counts vertices without the closing point', () => {
    expect(vertexCount(SQUARE as ZoneGeometry)).toBe(4);
  });

  it('reads legacy string rows and ignores broken ones', () => {
    expect(readStoredGeometry(JSON.stringify(SQUARE))).toEqual(SQUARE);
    expect(readStoredGeometry('nope')).toBeNull();
    expect(readStoredGeometry(null)).toBeNull();
  });
});

describe('circleZonePolygon', () => {
  const haversineKm = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ) => {
    const r = (d: number) => (d * Math.PI) / 180;
    const a =
      Math.sin(r(lat2 - lat1) / 2) ** 2 +
      Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
    return 2 * 6371.0088 * Math.asin(Math.sqrt(a));
  };

  it('builds a closed ring that passes the zone validator', () => {
    const polygon = circleZonePolygon(18.4662, -69.9384, 3, 32);
    const ring = polygon.coordinates[0];
    expect(ring).toHaveLength(33);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(parseZoneGeoJson(polygon)).toEqual({ ok: true, geometry: polygon });
    expect(vertexCount(polygon)).toBe(32);
  });

  it('places every vertex at the requested radius and contains the center', () => {
    const polygon = circleZonePolygon(18.4662, -69.9384, 3);
    for (const [lng, lat] of polygon.coordinates[0]) {
      expect(haversineKm(18.4662, -69.9384, lat, lng)).toBeCloseTo(3, 2);
    }
    expect(pointInZone(18.4662, -69.9384, polygon)).toBe(true);
    expect(pointInZone(18.5, -69.9384, polygon)).toBe(false);
  });

  it('winds the outer ring counter-clockwise (RFC 7946)', () => {
    const ring = circleZonePolygon(40.4168, -3.7038, 2, 16).coordinates[0];
    let area2 = 0;
    for (let i = 0; i < ring.length - 1; i += 1) {
      area2 += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    }
    expect(area2).toBeGreaterThan(0);
  });
});
