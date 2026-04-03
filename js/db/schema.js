// AI Plantoetser — schema.js
// IndexedDB tabel- en indexdefinities

export const DB_NAME    = 'ai-plantoetser';
export const DB_VERSION = 1;

/**
 * Tabellen:
 *  percelen   — opgeslagen adres+perceelgegevens
 *  plannen    — gecachte plannen per perceel (24u TTL)
 *  toetsen    — maatvoeringen per perceel (ingevulde waarden)
 *  adviezen   — gegenereerde adviesteksten
 *  activiteiten — geselecteerde activiteiten per sessie
 */
export function upgradeDB(db) {
  if (!db.objectStoreNames.contains('percelen')) {
    const store = db.createObjectStore('percelen', { keyPath: 'id' });
    store.createIndex('timestamp', 'timestamp');
    store.createIndex('adres', 'adres');
  }

  if (!db.objectStoreNames.contains('plannen')) {
    const store = db.createObjectStore('plannen', { keyPath: 'perceelId' });
    store.createIndex('timestamp', 'timestamp');
  }

  if (!db.objectStoreNames.contains('toetsen')) {
    const store = db.createObjectStore('toetsen', { keyPath: 'perceelId' });
    store.createIndex('timestamp', 'timestamp');
    store.createIndex('status', 'status');
  }

  if (!db.objectStoreNames.contains('adviezen')) {
    const store = db.createObjectStore('adviezen', { keyPath: 'id', autoIncrement: true });
    store.createIndex('perceelId', 'perceelId');
    store.createIndex('timestamp', 'timestamp');
  }

  if (!db.objectStoreNames.contains('activiteiten')) {
    db.createObjectStore('activiteiten', { keyPath: 'perceelId' });
  }
}
