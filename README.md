# @openfantasymap/maplibre-grid

[![npm](https://img.shields.io/npm/v/@openfantasymap/maplibre-grid.svg)](https://www.npmjs.com/package/@openfantasymap/maplibre-grid)
[![CI](https://github.com/openfantasymap/maplibre-grid/actions/workflows/ci.yml/badge.svg)](https://github.com/openfantasymap/maplibre-grid/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

Client-side generation of **VTT grids** — square and hexagonal — for
[MapLibre GL JS](https://maplibre.org/). A grid is defined by three things:

- **cell side length** (`cellSize`, in metres),
- **rotation** (degrees, map-bearing / clockwise),
- **one corner position** (`origin`, `[lng, lat]`).

The core generators have **zero runtime dependencies** and just return GeoJSON,
so you can use them with any renderer. An optional `GridLayer` helper wires the
grid into a MapLibre map and keeps it filled to the viewport.

## Install

```bash
npm install @openfantasymap/maplibre-grid
# maplibre-gl is an optional peer dependency, only needed for GridLayer
npm install maplibre-gl
```

## Quick start (GridLayer)

```ts
import maplibregl from 'maplibre-gl';
import { GridLayer } from '@openfantasymap/maplibre-grid';

const map = new maplibregl.Map({ /* … */ });

const grid = new GridLayer(map, {
  type: 'hex',           // 'square' | 'hex'
  origin: [12.49, 41.89],// one corner [lng, lat]
  cellSize: 25,          // metres
  rotation: 15,          // degrees clockwise
  orientation: 'flat',   // hex only: 'flat' | 'pointy'
  lineColor: '#ff3b30',
  fillColor: '#ff3b30',  // omit for outline-only
});

map.on('load', () => grid.attach());

// later
grid.setOptions({ cellSize: 50, rotation: 0 }); // live update
grid.setVisible(false);
grid.remove();
```

`GridLayer` regenerates the grid on every `moveend` so it always covers the
current viewport (plus a configurable `padding`). Each cell carries
`{ col, row, center }` properties and a stable string `id` (`"col,row"`), so you
can use MapLibre `feature-state` for hover/selection and `queryRenderedFeatures`
(or `grid.cellAt(point)`) to map a screen point to a cell.

## Quick start (pure GeoJSON)

```ts
import { squareGrid, hexGrid } from '@openfantasymap/maplibre-grid';

const fc = squareGrid({
  origin: [12.49, 41.89],
  cellSize: 50,
  rotation: 30,
  bounds: [12.48, 41.88, 12.50, 41.90], // [w, s, e, n] to fill
});

map.addSource('grid', { type: 'geojson', data: fc });
map.addLayer({ id: 'grid', type: 'line', source: 'grid',
  paint: { 'line-color': '#000', 'line-width': 1 } });
```

Both `squareGrid` and `hexGrid` return a
`FeatureCollection<Polygon, { col, row, center }>`.

## API

### `squareGrid(options) → FeatureCollection`
### `hexGrid(options) → FeatureCollection`

| option        | type                          | default   | notes |
|---------------|-------------------------------|-----------|-------|
| `origin`      | `[lng, lat]`                  | —         | Anchor → grid `(0,0)`. Square: a cell corner. Hex: centre of hex `(0,0)`. |
| `cellSize`    | `number`                      | —         | Side length in metres (square edge / hex edge). |
| `bounds`      | `[w, s, e, n]`                | —         | Lng/lat box to fill (usually `map.getBounds()`). |
| `rotation`    | `number`                      | `0`       | Degrees, clockwise (map bearing). |
| `orientation` | `'flat' \| 'pointy'`          | `'flat'`  | Hex only. |
| `maxCells`    | `number`                      | `50000`   | Throws if the grid would exceed this. |

### Geometry helpers (also exported)

- `localProjection(origin)` → `{ toLngLat, toMeters }` local equirectangular
  projection anchored at `origin`.
- `rotator(deg)` → `{ gridToWorld, worldToGrid }` clockwise rotation between grid
  axes and local east/north metres.
- `boundsToGridRect(bounds, toMeters, worldToGrid)` → grid-space extent of a box.
- `METERS_PER_DEGREE_LAT`, `DEG2RAD`, `SQRT3` constants.

## How it works

The origin corner defines a local tangent plane (equirectangular, scaled by
`cos(originLatitude)` for longitude). The grid is laid out in metres on that
plane, rotated by `rotation`, and each cell vertex is projected back to
`[lng, lat]`. Only the cells overlapping `bounds` are emitted. The flat
approximation is accurate to well under a metre across typical VTT extents (tens
of km); it is not intended for continent-scale grids.

## Development

Local Node may be too old, so every task runs inside Docker:

```bash
make install     # npm install (node:20-alpine)
make check       # typecheck + test + build
make test        # vitest
make build       # tsup → dist/ (ESM + CJS + d.ts)
make demo        # interactive demo at http://localhost:5173
```

Override the image with `make IMAGE=node:22 check`.

## Contributing

Issues and pull requests are welcome at
[openfantasymap/maplibre-grid](https://github.com/openfantasymap/maplibre-grid).
Please run `make check` (typecheck + tests + build) before opening a PR. By
contributing you agree that your contributions are licensed under the
project's Apache-2.0 license.

## Releasing

Publishing is automated by `.github/workflows/publish.yml`: create a GitHub
Release (tag `vX.Y.Z`) and the package is built and pushed to npm as
`@openfantasymap/maplibre-grid`.

The workflow uses [npm Trusted Publishing][tp] (OIDC) — no `NPM_TOKEN` secret
is needed. One-time setup on npmjs.com (package or scope → *Settings → Trusted
Publisher*):

| Field         | Value             |
| ------------- | ----------------- |
| Provider      | GitHub Actions    |
| Organization  | `openfantasymap`  |
| Repository    | `maplibre-grid`   |
| Workflow      | `publish.yml`     |
| Environment   | *(leave empty)*   |

For the first publish of a brand-new package, configure it as a "pending
trusted publisher" under your npm account before running the workflow.
Provenance attestations are emitted automatically.

[tp]: https://docs.npmjs.com/trusted-publishers

## License

[Apache-2.0](LICENSE) © Open Fantasy Maps
