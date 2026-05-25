import type { LngLat } from './types';

/** Mean metres per degree of latitude on the WGS84 ellipsoid. */
export const METERS_PER_DEGREE_LAT = 111_320;

const DEG2RAD = Math.PI / 180;

export interface LocalProjection {
  /** Local east/north metres (relative to origin) → `[lng, lat]`. */
  toLngLat(e: number, n: number): LngLat;
  /** `[lng, lat]` → local east/north metres (relative to origin). */
  toMeters(p: LngLat): [number, number];
}

/**
 * Builds a local equirectangular projection anchored at `origin`.
 *
 * Longitude scaling uses the origin latitude, so that a column of grid cells
 * keeps a constant longitude spacing (straight vertical lines on the map). The
 * approximation is excellent for VTT-scale extents (tens of km); distortion
 * only becomes visible across very large north/south spans.
 */
export function localProjection(origin: LngLat): LocalProjection {
  const [lon0, lat0] = origin;
  // Guard against the poles where cos(lat) → 0.
  const cosLat = Math.max(Math.cos(lat0 * DEG2RAD), 1e-6);
  const mPerDegLon = METERS_PER_DEGREE_LAT * cosLat;

  return {
    toLngLat(e, n) {
      return [lon0 + e / mPerDegLon, lat0 + n / METERS_PER_DEGREE_LAT];
    },
    toMeters(p) {
      return [(p[0] - lon0) * mPerDegLon, (p[1] - lat0) * METERS_PER_DEGREE_LAT];
    },
  };
}
