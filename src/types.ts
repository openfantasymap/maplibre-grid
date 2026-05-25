import type { Feature, FeatureCollection, Polygon } from 'geojson';

/** A geographic position as `[longitude, latitude]` (GeoJSON order). */
export type LngLat = [number, number];

/** A bounding box as `[west, south, east, north]` in degrees. */
export type BBox = [number, number, number, number];

/** Hexagon orientation: `flat` (flat-top) or `pointy` (pointy-top). */
export type HexOrientation = 'flat' | 'pointy';

export interface BaseGridOptions {
  /**
   * Anchor point `[lng, lat]`. This maps exactly to grid-plane origin `(0, 0)`.
   * For square grids it is a cell corner; for hex grids it is the centre of
   * cell `(0, 0)`.
   */
  origin: LngLat;

  /** Cell side length in metres (square edge length / hexagon edge length). */
  cellSize: number;

  /**
   * Area to fill, `[west, south, east, north]` in degrees — typically the
   * current map bounds (`map.getBounds()`). Only cells overlapping this box
   * are generated.
   */
  bounds: BBox;

  /**
   * Clockwise rotation in degrees, using the map-bearing convention
   * (0 = grid axes aligned with east/north). Default `0`.
   */
  rotation?: number;

  /**
   * Safety cap on the number of generated cells; throws if exceeded.
   * Default `50000`.
   */
  maxCells?: number;
}

export type SquareGridOptions = BaseGridOptions;

export interface HexGridOptions extends BaseGridOptions {
  /** Hexagon orientation. Default `flat`. */
  orientation?: HexOrientation;
}

/** Per-cell properties attached to every generated feature. */
export interface CellProps {
  /** Column index in grid space (can be negative). */
  col: number;
  /** Row index in grid space (can be negative). */
  row: number;
  /** Cell centre `[lng, lat]`. */
  center: LngLat;
}

/** A single grid cell as a GeoJSON Polygon feature. */
export type GridFeature = Feature<Polygon, CellProps> & { id: string };

/** A complete grid as a GeoJSON FeatureCollection of polygons. */
export type GridFeatureCollection = FeatureCollection<Polygon, CellProps>;
