// AI Plantoetser — service-worker.js
// Cache-first voor statische assets; network-first voor API

const CACHE_VERSION = 'ai-plantoetser-v2';

const STATIC_ASSETS = [
  './',
  './index.html',
  './css/base.css',
  './css/components.css',
  './css/views.css',
  './js/app.js',
  './js/router.js',
  './js/db/database.js',
  './js/db/schema.js',
  './js/api/pdok.js',
  './js/api/ruimtelijke-plannen.js',
  './js/api/omgevingsplan.js',
  './js/views/dashboard.js',
  './js/views/zoeken.js',
  './js/views/planregels.js',
  './js/views/maatvoeringen.js',
  './js/views/activiteiten.js',
  './js/views/vereisten.js',
  './js/views/advies.js',
  './js/utils/coords.js',
  './js/utils/pdf.js',
  './js/utils/export.js',
  './js/api/cache.js',
  './js/data/indieningsvereisten.json',
  './js/data/bbl-artikelen.json',
  './assets/logo.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './manifest.json',
];

const API_PREFIXES = [
  'https://api.pdok.nl',
  'https://ruimte.omgevingswet.overheid.nl',
  'https://omgevingswet.overheid.nl',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://cdnjs.cloudflare.com',
];

// ── Install ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Externe API's: network-first
  if (API_PREFIXES.some(prefix => url.startsWith(prefix))) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Statische assets: cache-first
  event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Fallback naar offline pagina
    const offline = await caches.match('./index.html');
    return offline ?? new Response('Offline — geen internet beschikbaar', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? new Response(
      JSON.stringify({ error: 'Offline — geen netwerk beschikbaar' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
