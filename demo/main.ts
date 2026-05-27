import maplibregl from 'maplibre-gl';
import { GridLayer, type LngLat } from '../src/index';

const origin: LngLat = [12.4924, 41.8902]; // Colosseum, Rome
const map = new maplibregl.Map({
  container: 'map',
  // OpenFreeMap — free vector tiles, no API key. Other styles: liberty, bright, fiord.
  style: 'https://tiles.openfreemap.org/styles/positron',
  center: origin,
  zoom: 20,
  // Hard zoom-out limit: at 1.5 m cells, anything wider than z19 would
  // generate hundreds of thousands of polygons and kill the browser.
  minZoom: 19,
  maxZoom: 22,
});

const grid = new GridLayer(map, {
  type: 'square',
  origin,
  cellSize: 1.5,
  rotation: 0,
  lineColor: '#ff3b30',
  lineWidth: 1.5,
  lineOpacity: 0.8,
  fillColor: '#ff3b30',
  fillOpacity: 0.05,
  // Smaller viewport padding + a generous cap, suitable for tiny cells.
  padding: 0.05,
  maxCells: 150_000,
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
  const size = Number(cellSize.value);
  cellSizeVal.textContent = `${size.toFixed(1)} m`;
  rotationVal.textContent = `${rotation.value}°`;
  grid.setOptions({
    type: typeSel.value as 'square' | 'hex',
    orientation: orientSel.value as 'flat' | 'pointy',
    cellSize: size,
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
