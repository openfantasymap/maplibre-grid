import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import { GridLayer, type LngLat } from '../src/index';

const style: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

const origin: LngLat = [12.4924, 41.8902]; // Colosseum, Rome
const map = new maplibregl.Map({
  container: 'map',
  style,
  center: origin,
  zoom: 17,
});

const grid = new GridLayer(map, {
  type: 'square',
  origin,
  cellSize: 50,
  rotation: 0,
  lineColor: '#ff3b30',
  lineWidth: 1.5,
  lineOpacity: 0.8,
  fillColor: '#ff3b30',
  fillOpacity: 0.05,
});

map.on('load', () => grid.attach());

// --- controls ---
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const typeSel = $<HTMLSelectElement>('type');
const orientSel = $<HTMLSelectElement>('orientation');
const cellSize = $<HTMLInputElement>('cellSize');
const rotation = $<HTMLInputElement>('rotation');
const cellSizeVal = $('cellSizeVal');
const rotationVal = $('rotationVal');
const readout = $('readout');

function sync() {
  cellSizeVal.textContent = `${cellSize.value} m`;
  rotationVal.textContent = `${rotation.value}°`;
  grid.setOptions({
    type: typeSel.value as 'square' | 'hex',
    orientation: orientSel.value as 'flat' | 'pointy',
    cellSize: Number(cellSize.value),
    rotation: Number(rotation.value),
  });
}

[typeSel, orientSel, cellSize, rotation].forEach((el) =>
  el.addEventListener('input', sync),
);
sync();

map.on('click', (e) => {
  grid.setOptions({ origin: [e.lngLat.lng, e.lngLat.lat] });
});

map.on('mousemove', (e) => {
  const cell = grid.cellAt(e.point);
  readout.textContent = cell
    ? `cell col ${cell.properties.col}, row ${cell.properties.row}`
    : 'hover a cell…';
});
