// AI Plantoetser — ruimtelijke-plannen.js
// Ruimtelijke Plannen API v4 — via Cloudflare Worker (vereist API-sleutel)
// Correcte geografische zoekmethode: POST /plannen/_zoek met GeoJSON Point

import { getWorkerUrl } from './omgevingsplan.js';

const RP_BASE = 'https://ruimte.omgevingswet.overheid.nl/ruimtelijke-plannen/api/opvragen/v4';

/**
 * Stuur verzoek via de Cloudflare Worker proxy.
 * De Worker voegt de X-Api-Key header toe.
 */
async function proxyFetch(targetUrl, options = {}) {
  const workerUrl = getWorkerUrl();
  if (!workerUrl) throw new Error('WORKER_NOT_CONFIGURED');

  const encoded = encodeURIComponent(targetUrl);
  const url = `${workerUrl}?url=${encoded}`;

  const res = await fetch(url, {
    method:  options.method  ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    body:    options.body ?? undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`RP API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Zoek plannen op locatie (WGS84 lon/lat) via POST _zoek.
 * Retourneert alle plantypen die het punt bevatten.
 *
 * @param {number} lon  - WGS84 longitude
 * @param {number} lat  - WGS84 latitude
 * @param {string} [planType]  - bijv. 'bestemmingsplan' (optioneel)
 * @returns {Promise<Array>}
 */
export async function zoekPlannenOpLocatie(lon, lat, planType = null) {
  let url = `${RP_BASE}/plannen/_zoek?_pageSize=20`;
  if (planType) url += `&planType=${planType}`;

  const body = JSON.stringify({
    _geo: { contains: { type: 'Point', coordinates: [lon, lat] } }
  });

  const data = await proxyFetch(url, { method: 'POST', body });
  return data?._embedded?.plannen ?? [];
}

/**
 * Haal plannen op voor een gemeente (fallback als geo-zoekopdracht mislukt).
 * @param {string} gemeentecode
 * @returns {Promise<Array>}
 */
export async function getPlannenVoorGemeente(gemeentecode, planType = 'bestemmingsplan') {
  const url = `${RP_BASE}/plannen?beleidsmatigVerantwoordelijkeOverheid.code=${gemeentecode}` +
    `&planType=${planType}&status=vastgesteld&_pageSize=20`;
  const data = await proxyFetch(url);
  return data?._embedded?.plannen ?? [];
}

/**
 * Haal detail op van één plan.
 * @param {string} planId
 */
export async function getPlan(planId) {
  const url = `${RP_BASE}/plannen/${encodeURIComponent(planId)}`;
  return proxyFetch(url);
}

/**
 * Haal bestemmingsvlakken op die het opgegeven punt bevatten.
 * @param {string} planId
 * @param {number} lon
 * @param {number} lat
 */
export async function getBestemmingsvlakkenOpLocatie(planId, lon, lat) {
  const url = `${RP_BASE}/plannen/${encodeURIComponent(planId)}/bestemmingsvlakken/_zoek?_pageSize=20`;
  const body = JSON.stringify({
    _geo: { contains: { type: 'Point', coordinates: [lon, lat] } }
  });
  const data = await proxyFetch(url, { method: 'POST', body });
  return data?._embedded?.bestemmingsvlakken ?? [];
}

/**
 * Haal alle bestemmingsvlakken op voor een plan.
 */
export async function getAlleBestemmingsvlakken(planId) {
  const url = `${RP_BASE}/plannen/${encodeURIComponent(planId)}/bestemmingsvlakken?_pageSize=50`;
  const data = await proxyFetch(url);
  return data?._embedded?.bestemmingsvlakken ?? [];
}

/**
 * Haal maatvoeringen op voor een plan (gestructureerde JSON).
 * @param {string} planId
 */
export async function getMaatvoeringen(planId) {
  const url = `${RP_BASE}/plannen/${encodeURIComponent(planId)}/maatvoeringen?_pageSize=100`;
  const data = await proxyFetch(url);
  return data?._embedded?.maatvoeringen ?? [];
}

/**
 * Haal maatvoeringen op die bij een specifiek bestemmingsvlak horen.
 * @param {string} planId
 * @param {number} lon
 * @param {number} lat
 */
export async function getMaatvoeringenOpLocatie(planId, lon, lat) {
  const url = `${RP_BASE}/plannen/${encodeURIComponent(planId)}/maatvoeringen/_zoek?_pageSize=50`;
  const body = JSON.stringify({
    _geo: { contains: { type: 'Point', coordinates: [lon, lat] } }
  });
  const data = await proxyFetch(url, { method: 'POST', body });
  return data?._embedded?.maatvoeringen ?? [];
}

/**
 * Haal bouwvlakken op die het punt bevatten.
 */
export async function getBouwvlakkenOpLocatie(planId, lon, lat) {
  const url = `${RP_BASE}/plannen/${encodeURIComponent(planId)}/bouwvlakken/_zoek?_pageSize=20`;
  const body = JSON.stringify({
    _geo: { contains: { type: 'Point', coordinates: [lon, lat] } }
  });
  const data = await proxyFetch(url, { method: 'POST', body }).catch(() => null);
  return data?._embedded?.bouwvlakken ?? [];
}

/**
 * Haal gerelateerde plannen op (oudere versies van hetzelfde plan).
 */
export async function getGerelateerdeplannen(planId) {
  const url = `${RP_BASE}/plannen/${encodeURIComponent(planId)}/gerelateerde-plannen`;
  const data = await proxyFetch(url).catch(() => null);
  return data?._embedded?.plannen ?? [];
}

/**
 * Haal gebiedsaanduidingen op die het punt bevatten.
 */
export async function getGebiedsaanduidingenOpLocatie(planId, lon, lat) {
  const url = `${RP_BASE}/plannen/${encodeURIComponent(planId)}/gebiedsaanduidingen/_zoek?_pageSize=20`;
  const body = JSON.stringify({
    _geo: { contains: { type: 'Point', coordinates: [lon, lat] } }
  });
  const data = await proxyFetch(url, { method: 'POST', body }).catch(() => null);
  return data?._embedded?.gebiedsaanduidingen ?? [];
}

/**
 * Haal functieaanduidingen op die het punt bevatten.
 */
export async function getFunctieaanduidingenOpLocatie(planId, lon, lat) {
  const url = `${RP_BASE}/plannen/${encodeURIComponent(planId)}/functieaanduidingen/_zoek?_pageSize=20`;
  const body = JSON.stringify({
    _geo: { contains: { type: 'Point', coordinates: [lon, lat] } }
  });
  const data = await proxyFetch(url, { method: 'POST', body }).catch(() => null);
  return data?._embedded?.functieaanduidingen ?? [];
}
