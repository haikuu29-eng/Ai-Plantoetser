// AI Plantoetser — database.js
// Slanke IndexedDB wrapper — geen localStorage/sessionStorage

import { DB_NAME, DB_VERSION, upgradeDB } from './schema.js';

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => upgradeDB(e.target.result);
    req.onsuccess  = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror    = (e) => reject(e.target.error);
  });
}

async function tx(storeName, mode, fn) {
  const db    = await openDB();
  const trans = db.transaction(storeName, mode);
  const store = trans.objectStore(storeName);
  return new Promise((resolve, reject) => {
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ── Generieke CRUD ──────────────────────────────────────────

export const db = {
  get: (storeName, key)    => tx(storeName, 'readonly',  s => s.get(key)),
  put: (storeName, record) => tx(storeName, 'readwrite', s => s.put(record)),
  delete: (storeName, key) => tx(storeName, 'readwrite', s => s.delete(key)),

  getAll: (storeName) =>
    openDB().then(database => new Promise((resolve, reject) => {
      const trans = database.transaction(storeName, 'readonly');
      const req   = trans.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    })),

  getAllByIndex: (storeName, indexName, query) =>
    openDB().then(database => new Promise((resolve, reject) => {
      const trans = database.transaction(storeName, 'readonly');
      const index = trans.objectStore(storeName).index(indexName);
      const req   = index.getAll(query);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    })),

  count: (storeName) =>
    openDB().then(database => new Promise((resolve, reject) => {
      const trans = database.transaction(storeName, 'readonly');
      const req   = trans.objectStore(storeName).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    })),
};

// ── Domeinspecifieke helpers ────────────────────────────────

export async function saveParceel(perceel) {
  perceel.timestamp = Date.now();
  return db.put('percelen', perceel);
}

export async function getRecentPercelen(limit = 10) {
  const all = await db.getAll('percelen');
  return all
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export async function savePlannenCache(perceelId, plannen) {
  return db.put('plannen', { perceelId, plannen, timestamp: Date.now() });
}

export async function getPlannenCache(perceelId) {
  const entry = await db.get('plannen', perceelId);
  if (!entry) return null;
  // 24u TTL = 86400000ms
  if (Date.now() - entry.timestamp > 86400000) return null;
  return entry.plannen;
}

export async function saveToets(perceelId, maatData, status = 'in-behandeling') {
  return db.put('toetsen', { perceelId, maatData, status, timestamp: Date.now() });
}

export async function getToets(perceelId) {
  return db.get('toetsen', perceelId);
}

export async function saveAdvies(perceelId, tekst) {
  return db.put('adviezen', { perceelId, tekst, timestamp: Date.now() });
}

export async function getAdviezen(perceelId) {
  return db.getAllByIndex('adviezen', 'perceelId', perceelId);
}

export async function saveActiviteiten(perceelId, activiteiten) {
  return db.put('activiteiten', { perceelId, activiteiten });
}

export async function getActiviteiten(perceelId) {
  const rec = await db.get('activiteiten', perceelId);
  return rec ? rec.activiteiten : [];
}

// ── KPI helpers ─────────────────────────────────────────────

export async function getKPIs() {
  const now       = Date.now();
  const dagMs     = 86400000;
  const maandMs   = 30 * dagMs;

  const [toetsen, percelen, adviezen] = await Promise.all([
    db.getAll('toetsen'),
    db.getAll('percelen'),
    db.getAll('adviezen'),
  ]);

  const vandaag    = toetsen.filter(t => now - t.timestamp < dagMs).length;
  const afgerond   = toetsen.filter(t => now - t.timestamp < maandMs && t.status === 'akkoord').length;
  const gecached   = percelen.length;
  const openstaand = adviezen.length === 0 ? 0 :
    adviezen.filter(a => !a.geexporteerd).length;

  return { vandaag, afgerond, gecached, openstaand };
}
