import { localProjection } from './projection';
import { boundsToGridRect, rotator } from './geom';
import type {
  GridFeature,
  GridFeatureCollection,
  LngLat,
  SquareGridOptions,
} from './types';

/**
 * Generates a square VTT grid as a GeoJSON FeatureCollection of cell polygons.
 *
 * The grid is anchored so that `origin` maps to the `(0, 0)` corner of cell
 * `(0, 0)`, with cells of `cellSize` metres rotated by `rotation` degrees
 * clockwise. Only cells overlapping `bounds` are produced.
 */
export function squareGrid(opts: SquareGridOptions): GridFeatureCollection {
  const { origin, cellSize, bounds, rotation = 0, maxCells = 50_000 } = opts;
  if (!(cellSize > 0)) {
    throw new Error('squareGrid: cellSize must be a positive number');
  }

  const proj = localProjection(origin);
  const { gridToWorld, worldToGrid } = rotator(rotation);
  const rect = boundsToGridRect(bounds, proj.toMeters, worldToGrid);

  const i0 = Math.floor(rect.minU / cellSize);
  const i1 = Math.ceil(rect.maxU / cellSize);
  const j0 = Math.floor(rect.minV / cellSize);
  const j1 = Math.ceil(rect.maxV / cellSize);

  const cols = i1 - i0;
  const rows = j1 - j0;
  if (cols * rows > maxCells) {
    throw new Error(
      `squareGrid: would generate ${cols * rows} cells (> maxCells=${maxCells}); ` +
        'increase cellSize, shrink bounds, or raise maxCells',
    );
  }

  const toLL = (u: number, v: number): LngLat => {
    const [e, n] = gridToWorld(u, v);
    return proj.toLngLat(e, n);
  };

  const features: GridFeature[] = [];
  for (let j = j0; j < j1; j++) {
    for (let i = i0; i < i1; i++) {
      const x0 = i * cellSize;
      const y0 = j * cellSize;
      const x1 = x0 + cellSize;
      const y1 = y0 + cellSize;
      const ring: LngLat[] = [
        toLL(x0, y0),
        toLL(x1, y0),
        toLL(x1, y1),
        toLL(x0, y1),
        toLL(x0, y0),
      ];
      features.push({
        type: 'Feature',
        id: `${i},${j}`,
        properties: { col: i, row: j, center: toLL(x0 + cellSize / 2, y0 + cellSize / 2) },
        geometry: { type: 'Polygon', coordinates: [ring] },
      });
    }
  }

  return { type: 'FeatureCollection', features };
}
