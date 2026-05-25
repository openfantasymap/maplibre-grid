import { localProjection } from './projection';
import { boundsToGridRect, DEG2RAD, rotator, SQRT3 } from './geom';
import type {
  GridFeature,
  GridFeatureCollection,
  HexGridOptions,
  HexOrientation,
  LngLat,
} from './types';

/** Returns the six grid-space corner offsets of a hexagon centred at the origin. */
function hexCorners(s: number, orientation: HexOrientation): [number, number][] {
  const startDeg = orientation === 'flat' ? 0 : 30;
  const pts: [number, number][] = [];
  for (let k = 0; k < 6; k++) {
    const a = (startDeg + 60 * k) * DEG2RAD;
    pts.push([s * Math.cos(a), s * Math.sin(a)]);
  }
  return pts;
}

/**
 * Generates a hexagonal VTT grid as a GeoJSON FeatureCollection of cell
 * polygons.
 *
 * `origin` maps to the centre of hex `(0, 0)`. `cellSize` is the hexagon edge
 * length in metres. Hexes use an offset layout (`flat` → odd-q vertical,
 * `pointy` → odd-r horizontal) so neighbouring cells interlock. The grid is
 * rotated by `rotation` degrees clockwise; only hexes overlapping `bounds` are
 * produced.
 */
export function hexGrid(opts: HexGridOptions): GridFeatureCollection {
  const {
    origin,
    cellSize: s,
    bounds,
    rotation = 0,
    orientation = 'flat',
    maxCells = 50_000,
  } = opts;
  if (!(s > 0)) {
    throw new Error('hexGrid: cellSize must be a positive number');
  }

  const proj = localProjection(origin);
  const { gridToWorld, worldToGrid } = rotator(rotation);
  const rect = boundsToGridRect(bounds, proj.toMeters, worldToGrid);
  const corners = hexCorners(s, orientation);

  const toLL = (u: number, v: number): LngLat => {
    const [e, n] = gridToWorld(u, v);
    return proj.toLngLat(e, n);
  };

  // Per-orientation centre placement and index ranges (with a one-cell margin
  // so offset rows/columns near the edges are not missed).
  const flat = orientation === 'flat';
  const colStep = flat ? 1.5 * s : SQRT3 * s;
  const rowStep = flat ? SQRT3 * s : 1.5 * s;

  const i0 = Math.floor((rect.minU - s) / colStep) - 1;
  const i1 = Math.ceil((rect.maxU + s) / colStep) + 1;
  const j0 = Math.floor((rect.minV - s) / rowStep) - 1;
  const j1 = Math.ceil((rect.maxV + s) / rowStep) + 1;

  const est = (i1 - i0 + 1) * (j1 - j0 + 1);
  if (est > maxCells) {
    throw new Error(
      `hexGrid: would generate ~${est} cells (> maxCells=${maxCells}); ` +
        'increase cellSize, shrink bounds, or raise maxCells',
    );
  }

  const features: GridFeature[] = [];
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const cx = flat ? colStep * i : SQRT3 * s * (i + (j & 1 ? 0.5 : 0));
      const cy = flat ? rowStep * (j + (i & 1 ? 0.5 : 0)) : rowStep * j;

      // Cull hexes whose centre lies well outside the target rectangle.
      if (cx < rect.minU - s || cx > rect.maxU + s) continue;
      if (cy < rect.minV - s || cy > rect.maxV + s) continue;

      const ring: LngLat[] = corners.map(([dx, dy]) => toLL(cx + dx, cy + dy));
      ring.push(ring[0]);

      features.push({
        type: 'Feature',
        id: `${i},${j}`,
        properties: { col: i, row: j, center: toLL(cx, cy) },
        geometry: { type: 'Polygon', coordinates: [ring] },
      });
    }
  }

  return { type: 'FeatureCollection', features };
}
