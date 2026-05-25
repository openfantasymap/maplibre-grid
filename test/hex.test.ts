import { describe, expect, it } from 'vitest';
import { hexGrid } from '../src/hex';
import { localProjection } from '../src/projection';
import type { LngLat } from '../src/types';

const origin: LngLat = [0, 0];

function metersBetween(a: LngLat, b: LngLat): number {
  const proj = localProjection(origin);
  const [ax, ay] = proj.toMeters(a);
  const [bx, by] = proj.toMeters(b);
  return Math.hypot(bx - ax, by - ay);
}

describe('hexGrid', () => {
  it('rejects non-positive cell sizes', () => {
    expect(() => hexGrid({ origin, cellSize: -5, bounds: [-1, -1, 1, 1] })).toThrow();
  });

  it('produces hexagons (7 ring positions, closed)', () => {
    const fc = hexGrid({ origin, cellSize: 50, bounds: [-0.01, -0.01, 0.01, 0.01] });
    expect(fc.features.length).toBeGreaterThan(0);
    for (const f of fc.features) {
      const ring = f.geometry.coordinates[0] as LngLat[];
      expect(ring).toHaveLength(7);
      expect(ring[0]).toEqual(ring[6]);
    }
  });

  it('uses the requested edge length', () => {
    const cellSize = 40;
    const fc = hexGrid({ origin, cellSize, bounds: [-0.01, -0.01, 0.01, 0.01] });
    const ring = fc.features[0].geometry.coordinates[0] as LngLat[];
    for (let k = 0; k < 6; k++) {
      expect(metersBetween(ring[k], ring[k + 1])).toBeCloseTo(cellSize, 2);
    }
  });

  it('anchors hex (0,0) centre at the origin', () => {
    const fc = hexGrid({ origin, cellSize: 50, bounds: [-0.01, -0.01, 0.01, 0.01] });
    const hex00 = fc.features.find((f) => f.properties.col === 0 && f.properties.row === 0)!;
    expect(hex00.properties.center[0]).toBeCloseTo(origin[0], 9);
    expect(hex00.properties.center[1]).toBeCloseTo(origin[1], 9);
  });

  it('flat and pointy orientations differ', () => {
    const flat = hexGrid({ origin, cellSize: 50, orientation: 'flat', bounds: [-0.005, -0.005, 0.005, 0.005] });
    const pointy = hexGrid({ origin, cellSize: 50, orientation: 'pointy', bounds: [-0.005, -0.005, 0.005, 0.005] });
    const flatRing = flat.features.find((f) => f.properties.col === 0 && f.properties.row === 0)!.geometry.coordinates[0] as LngLat[];
    const pointyRing = pointy.features.find((f) => f.properties.col === 0 && f.properties.row === 0)!.geometry.coordinates[0] as LngLat[];
    // Flat-top has a vertex due east of centre; pointy-top has one due north.
    const proj = localProjection(origin);
    const [fe] = proj.toMeters(flatRing[0]);
    const [, pn] = proj.toMeters(pointyRing[0]);
    expect(fe).toBeCloseTo(50, 2); // flat: first corner at angle 0° → (+s, 0)
    expect(pn).toBeCloseTo(25, 2); // pointy: first corner at 30° → (s*cos30, s*sin30) → n = s/2
  });

  it('enforces maxCells', () => {
    expect(() =>
      hexGrid({ origin, cellSize: 1, bounds: [-0.05, -0.05, 0.05, 0.05], maxCells: 50 }),
    ).toThrow(/maxCells/);
  });
});
