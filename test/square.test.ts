import { describe, expect, it } from 'vitest';
import { squareGrid } from '../src/square';
import { localProjection } from '../src/projection';
import type { GridFeature, LngLat } from '../src/types';

const origin: LngLat = [0, 0];

/** Geodesic-free planar distance via the local projection at `origin`. */
function metersBetween(a: LngLat, b: LngLat): number {
  const proj = localProjection(origin);
  const [ax, ay] = proj.toMeters(a);
  const [bx, by] = proj.toMeters(b);
  return Math.hypot(bx - ax, by - ay);
}

describe('squareGrid', () => {
  it('rejects non-positive cell sizes', () => {
    expect(() => squareGrid({ origin, cellSize: 0, bounds: [-1, -1, 1, 1] })).toThrow();
  });

  it('enforces maxCells', () => {
    expect(() =>
      squareGrid({ origin, cellSize: 1, bounds: [-1, -1, 1, 1], maxCells: 10 }),
    ).toThrow(/maxCells/);
  });

  it('produces exactly cols*rows cells for an aligned box', () => {
    // 100 m cells, box ~300 m x 200 m starting at origin.
    const cellSize = 100;
    const proj = localProjection(origin);
    const ne = proj.toLngLat(300, 200);
    const fc = squareGrid({ origin, cellSize, bounds: [0, 0, ne[0], ne[1]] });
    expect(fc.features).toHaveLength(3 * 2);
  });

  it('anchors cell (0,0) at the origin corner', () => {
    const cellSize = 50;
    const proj = localProjection(origin);
    const ne = proj.toLngLat(60, 60);
    const fc = squareGrid({ origin, cellSize, bounds: [0, 0, ne[0], ne[1]] });
    const cell00 = fc.features.find((f) => f.properties.col === 0 && f.properties.row === 0)!;
    const ring = cell00.geometry.coordinates[0] as LngLat[];
    expect(ring[0][0]).toBeCloseTo(origin[0], 9);
    expect(ring[0][1]).toBeCloseTo(origin[1], 9);
  });

  it('makes cells of the requested side length', () => {
    const cellSize = 75;
    const fc = squareGrid({ origin, cellSize, bounds: [-0.01, -0.01, 0.01, 0.01] });
    const f = fc.features[0] as GridFeature;
    const ring = f.geometry.coordinates[0] as LngLat[];
    expect(metersBetween(ring[0], ring[1])).toBeCloseTo(cellSize, 3);
    expect(metersBetween(ring[1], ring[2])).toBeCloseTo(cellSize, 3);
  });

  it('rotates the grid (90° swaps the local axes)', () => {
    const cellSize = 100;
    const fc = squareGrid({ origin, cellSize, rotation: 90, bounds: [-0.005, -0.005, 0.005, 0.005] });
    const cell00 = fc.features.find((f) => f.properties.col === 0 && f.properties.row === 0)!;
    const ring = cell00.geometry.coordinates[0] as LngLat[];
    const proj = localProjection(origin);
    // The (1,0) grid corner should map to local (0, -cellSize) after a 90° CW turn.
    const [e, n] = proj.toMeters(ring[1]);
    expect(e).toBeCloseTo(0, 3);
    expect(n).toBeCloseTo(-cellSize, 3);
  });
});
