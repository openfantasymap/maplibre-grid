import type {
  GeoJSONSource,
  Map as MapLibreMap,
  MapGeoJSONFeature,
} from 'maplibre-gl';
import { hexGrid } from './hex';
import { squareGrid } from './square';
import type { BBox, GridFeatureCollection, HexOrientation, LngLat } from './types';

export interface GridLayerOptions {
  /** Source/layer id prefix. Default `maplibre-grid`. */
  id?: string;
  /** Grid type. */
  type: 'square' | 'hex';
  /** Anchor corner `[lng, lat]`. */
  origin: LngLat;
  /** Cell side length in metres. */
  cellSize: number;
  /** Clockwise rotation in degrees. Default `0`. */
  rotation?: number;
  /** Hex orientation (ignored for square grids). Default `flat`. */
  orientation?: HexOrientation;
  /** Safety cap forwarded to the generators. Default `50000`. */
  maxCells?: number;

  /** Line colour. Default `#000000`. */
  lineColor?: string;
  /** Line width in px. Default `1`. */
  lineWidth?: number;
  /** Line opacity. Default `0.5`. */
  lineOpacity?: number;
  /** Optional cell fill colour. Default none (no fill layer). */
  fillColor?: string;
  /** Cell fill opacity. Default `0.1`. */
  fillOpacity?: number;

  /** Insert the layers before this existing layer id. */
  beforeId?: string;
  /**
   * Extra padding around the viewport, as a fraction of its size, used when
   * regenerating so cells exist slightly beyond the visible area. Default `0.1`.
   */
  padding?: number;
}

/**
 * Manages a live grid overlay on a MapLibre map: it adds a GeoJSON source and
 * line (plus optional fill) layers, and regenerates the grid to cover the
 * current viewport on every `moveend`.
 *
 * ```ts
 * const grid = new GridLayer(map, {
 *   type: 'hex',
 *   origin: [12.49, 41.89],
 *   cellSize: 25,
 *   rotation: 15,
 * });
 * grid.attach();
 * ```
 */
export class GridLayer {
  private readonly map: MapLibreMap;
  private opts: Required<
    Pick<
      GridLayerOptions,
      | 'id'
      | 'type'
      | 'origin'
      | 'cellSize'
      | 'rotation'
      | 'orientation'
      | 'maxCells'
      | 'lineColor'
      | 'lineWidth'
      | 'lineOpacity'
      | 'fillOpacity'
      | 'padding'
    >
  > &
    Pick<GridLayerOptions, 'fillColor' | 'beforeId'>;

  private attached = false;
  private readonly onMoveEnd = () => this.update();

  constructor(map: MapLibreMap, options: GridLayerOptions) {
    this.map = map;
    this.opts = {
      id: 'maplibre-grid',
      rotation: 0,
      orientation: 'flat',
      maxCells: 50_000,
      lineColor: '#000000',
      lineWidth: 1,
      lineOpacity: 0.5,
      fillOpacity: 0.1,
      padding: 0.1,
      ...options,
    };
  }

  private get sourceId() {
    return this.opts.id;
  }
  private get lineLayerId() {
    return `${this.opts.id}-line`;
  }
  private get fillLayerId() {
    return `${this.opts.id}-fill`;
  }

  /** Adds the source and layers and starts tracking the viewport. */
  attach(): this {
    if (this.attached) return this;
    this.attached = true;

    this.map.addSource(this.sourceId, {
      type: 'geojson',
      data: this.generate(),
    });

    if (this.opts.fillColor) {
      this.map.addLayer(
        {
          id: this.fillLayerId,
          type: 'fill',
          source: this.sourceId,
          paint: {
            'fill-color': this.opts.fillColor,
            'fill-opacity': this.opts.fillOpacity,
          },
        },
        this.opts.beforeId,
      );
    }

    this.map.addLayer(
      {
        id: this.lineLayerId,
        type: 'line',
        source: this.sourceId,
        paint: {
          'line-color': this.opts.lineColor,
          'line-width': this.opts.lineWidth,
          'line-opacity': this.opts.lineOpacity,
        },
      },
      this.opts.beforeId,
    );

    this.map.on('moveend', this.onMoveEnd);
    return this;
  }

  /** Regenerates the grid for the current viewport. */
  update(): this {
    const src = this.map.getSource(this.sourceId) as GeoJSONSource | undefined;
    if (src) src.setData(this.generate());
    return this;
  }

  /** Updates configuration in place and regenerates. */
  setOptions(patch: Partial<GridLayerOptions>): this {
    Object.assign(this.opts, patch);
    if (this.attached) {
      this.applyPaint();
      this.update();
    }
    return this;
  }

  /** Shows or hides the grid without removing it. */
  setVisible(visible: boolean): this {
    const v = visible ? 'visible' : 'none';
    if (this.map.getLayer(this.lineLayerId)) {
      this.map.setLayoutProperty(this.lineLayerId, 'visibility', v);
    }
    if (this.map.getLayer(this.fillLayerId)) {
      this.map.setLayoutProperty(this.fillLayerId, 'visibility', v);
    }
    return this;
  }

  /** Removes all layers/sources and stops tracking the viewport. */
  remove(): this {
    this.map.off('moveend', this.onMoveEnd);
    if (this.map.getLayer(this.lineLayerId)) this.map.removeLayer(this.lineLayerId);
    if (this.map.getLayer(this.fillLayerId)) this.map.removeLayer(this.fillLayerId);
    if (this.map.getSource(this.sourceId)) this.map.removeSource(this.sourceId);
    this.attached = false;
    return this;
  }

  /** Returns the feature at a screen point, if the grid covers it. */
  cellAt(point: { x: number; y: number }): MapGeoJSONFeature | undefined {
    return this.map.queryRenderedFeatures([point.x, point.y], {
      layers: [this.lineLayerId],
    })[0];
  }

  private applyPaint(): void {
    if (this.map.getLayer(this.lineLayerId)) {
      this.map.setPaintProperty(this.lineLayerId, 'line-color', this.opts.lineColor);
      this.map.setPaintProperty(this.lineLayerId, 'line-width', this.opts.lineWidth);
      this.map.setPaintProperty(this.lineLayerId, 'line-opacity', this.opts.lineOpacity);
    }
  }

  private paddedBounds(): BBox {
    const b = this.map.getBounds();
    const w = b.getWest();
    const s = b.getSouth();
    const e = b.getEast();
    const n = b.getNorth();
    const px = (e - w) * this.opts.padding;
    const py = (n - s) * this.opts.padding;
    return [w - px, s - py, e + px, n + py];
  }

  private generate(): GridFeatureCollection {
    const { type, origin, cellSize, rotation, orientation, maxCells } = this.opts;
    const bounds = this.paddedBounds();
    return type === 'hex'
      ? hexGrid({ origin, cellSize, bounds, rotation, orientation, maxCells })
      : squareGrid({ origin, cellSize, bounds, rotation, maxCells });
  }
}
