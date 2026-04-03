// AI Plantoetser — api/cache.js
// 24u TTL cache per perceel — dunne wrapper boven database.js helpers

export { savePlannenCache, getPlannenCache } from '../db/database.js';

/**
 * Generieke TTL-cache entry opslaan.
 * Sla willekeurige JSON op met een 24u vervaldatum.
 * @param {string} key       Unieke sleutel (bijv. perceelId + ':maatvoeringen')
 * @param {any}    data      Te cachen data
 * @param {number} ttlMs     TTL in milliseconden (default 24u)
 */
export async function setCacheEntry(key, data, ttlMs = 86400000) {
  const { db } = await import('../db/database.js');
  return db.put('plannen', { perceelId: key, plannen: data, timestamp: Date.now(), ttlMs });
}

/**
 * Generieke TTL-cache entry ophalen.
 * Retourneert null als de entry ontbreekt of verlopen is.
 * @param {string} key
 * @returns {Promise<any|null>}
 */
export async function getCacheEntry(key) {
  const { db } = await import('../db/database.js');
  const entry = await db.get('plannen', key);
  if (!entry) return null;
  const ttl = entry.ttlMs ?? 86400000;
  if (Date.now() - entry.timestamp > ttl) return null;
  return entry.plannen;
}

/**
 * Cache-entry verwijderen.
 * @param {string} key
 */
export async function deleteCacheEntry(key) {
  const { db } = await import('../db/database.js');
  return db.delete('plannen', key);
}
