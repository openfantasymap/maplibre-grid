export type {
  BBox,
  BaseGridOptions,
  CellProps,
  GridFeature,
  GridFeatureCollection,
  HexGridOptions,
  HexOrientation,
  LngLat,
  SquareGridOptions,
} from './types';

export { METERS_PER_DEGREE_LAT, localProjection } from './projection';
export type { LocalProjection } from './projection';

export { rotator, boundsToGridRect, DEG2RAD, SQRT3 } from './geom';
export type { Rotator, GridRect } from './geom';

export { squareGrid } from './square';
export { hexGrid } from './hex';

export { GridLayer } from './grid-layer';
export type { GridLayerOptions } from './grid-layer';
