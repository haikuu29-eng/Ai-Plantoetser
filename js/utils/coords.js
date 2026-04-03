// AI Plantoetser — coords.js
// WGS84 ↔ RD New conversie (voor weergave / externe tools)
// proj4js wordt als CDN-script geladen in index.html

const RD_DEF = '+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 ' +
  '+k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel ' +
  '+towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725 +units=m +no_defs';

let _proj4Ready = false;

function ensureProj4() {
  if (typeof proj4 === 'undefined') return false;
  if (!_proj4Ready) {
    proj4.defs('EPSG:28992', RD_DEF);
    _proj4Ready = true;
  }
  return true;
}

/**
 * WGS84 → RD New
 * @param {number} lon
 * @param {number} lat
 * @returns {{ x: number, y: number }|null}
 */
export function wgs84ToRd(lon, lat) {
  if (!ensureProj4()) return null;
  const [x, y] = proj4('EPSG:4326', 'EPSG:28992', [lon, lat]);
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
}

/**
 * RD New → WGS84
 * @param {number} x
 * @param {number} y
 * @returns {{ lon: number, lat: number }|null}
 */
export function rdToWgs84(x, y) {
  if (!ensureProj4()) return null;
  const [lon, lat] = proj4('EPSG:28992', 'EPSG:4326', [x, y]);
  return {
    lon: Math.round(lon * 1000000) / 1000000,
    lat: Math.round(lat * 1000000) / 1000000,
  };
}

/**
 * Formatteer coördinaten voor weergave.
 */
export function formatRd(x, y) {
  if (x == null || y == null) return '—';
  return `${Math.round(x).toLocaleString('nl-NL')} / ${Math.round(y).toLocaleString('nl-NL')}`;
}

export function formatWgs84(lon, lat) {
  if (lon == null || lat == null) return '—';
  return `${lat.toFixed(6)}°N, ${lon.toFixed(6)}°E`;
}
