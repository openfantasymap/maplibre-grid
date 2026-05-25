import { describe, expect, it } from 'vitest';
import { localProjection, METERS_PER_DEGREE_LAT } from '../src/projection';
import type { LngLat } from '../src/types';

describe('localProjection', () => {
  it('round-trips lng/lat through metres', () => {
    const proj = localProjection([12.49, 41.89]);
    const p: LngLat = [12.5, 41.9];
    const [e, n] = proj.toMeters(p);
    const back = proj.toLngLat(e, n);
    expect(back[0]).toBeCloseTo(p[0], 9);
    expect(back[1]).toBeCloseTo(p[1], 9);
  });

  it('maps one degree of latitude to ~111.32 km', () => {
    const proj = localProjection([0, 0]);
    const [, n] = proj.toMeters([0, 1]);
    expect(n).toBeCloseTo(METERS_PER_DEGREE_LAT, 6);
  });

  it('shrinks longitude metres by cos(lat)', () => {
    const lat = 60;
    const proj = localProjection([0, lat]);
    const [e] = proj.toMeters([1, lat]);
    expect(e).toBeCloseTo(METERS_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180), 6);
  });
});
