import type { BBox, LngLat } from './types';

export const DEG2RAD = Math.PI / 180;
export const SQRT3 = Math.sqrt(3);

export interface Rotator {
  /** Grid coordinates `(u, v)` → local east/north metres `(e, n)`. */
  gridToWorld(u: number, v: number): [number, number];
  /** Local east/north metres `(e, n)` → grid coordinates `(u, v)`. */
  worldToGrid(e: number, n: number): [number, number];
}

/**
 * Clockwise rotation (map-bearing convention) between grid axes and local
 * east/north metres. At `rotationDeg = 0` the grid u-axis points east and the
 * v-axis points north.
 */
export function rotator(rotationDeg: number): Rotator {
  const t = rotationDeg * DEG2RAD;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return {
    gridToWorld: (u, v) => [u * c + v * s, -u * s + v * c],
    worldToGrid: (e, n) => [e * c - n * s, e * s + n * c],
  };
}

export interface GridRect {
  minU: number;
  maxU: number;
  minV: number;
  maxV: number;
}

/**
 * Projects the four corners of a lng/lat bounding box into grid space and
 * returns their axis-aligned extent, so callers can decide which integer cell
 * indices need to be generated to cover the box.
 */
export function boundsToGridRect(
  bounds: BBox,
  toMeters: (p: LngLat) => [number, number],
  worldToGrid: (e: number, n: number) => [number, number],
): GridRect {
  const [w, s, e, n] = bounds;
  const corners: LngLat[] = [
    [w, s],
    [e, s],
    [e, n],
    [w, n],
  ];
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const c of corners) {
    const [em, nm] = toMeters(c);
    const [u, v] = worldToGrid(em, nm);
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }
  return { minU, maxU, minV, maxV };
}
