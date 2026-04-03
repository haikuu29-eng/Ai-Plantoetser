// AI Plantoetser — Cloudflare Worker proxy
// Doel: CORS-probleem omzeilen + X-Api-Key toevoegen voor Ruimtelijke Plannen API v4
//
// Deploy-instructies:
//   1. Ga naar cloudflare.com → Workers & Pages → Create Application → Worker
//   2. Plak deze code en klik "Save and Deploy"
//   3. Ga naar Settings → Variables → voeg toe:
//        Name:  RP_API_KEY
//        Value: 6c2efa8040c833dacb7395c79ac1136e
//        (vink "Encrypt" aan)
//   4. Kopieer de Worker-URL en vul in js/api/omgevingsplan.js

const ALLOWED_HOSTS = [
  'ruimte.omgevingswet.overheid.nl',
  'omgevingswet.overheid.nl',
  'dso.kadaster.nl',
  'api.pdok.nl',
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-App-Token',
  'Access-Control-Max-Age':       '86400',
};

export default {
  async fetch(request, env) {
    // ── 1. CORS preflight ────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // ── 2. Haal target-URL op uit query-parameter ──────────
    const incoming = new URL(request.url);
    const targetEncoded = incoming.searchParams.get('url');

    if (!targetEncoded) {
      return jsonError(400, 'Parameter "url" ontbreekt.');
    }

    let targetUrl;
    try {
      targetUrl = decodeURIComponent(targetEncoded);
      new URL(targetUrl); // valideer
    } catch {
      return jsonError(400, 'Ongeldige URL-parameter.');
    }

    // ── 3. Whitelist: alleen toegestane domeinen ───────────
    const targetHost = new URL(targetUrl).hostname;
    if (!ALLOWED_HOSTS.some(h => targetHost === h || targetHost.endsWith('.' + h))) {
      return jsonError(403, `Host "${targetHost}" is niet toegestaan.`);
    }

    // ── 4. Optionele app-token validatie ────────────────────
    // Uncomment en stel APP_TOKEN in als extra beveiliging gewenst:
    // const appToken = request.headers.get('X-App-Token');
    // if (env.APP_TOKEN && appToken !== env.APP_TOKEN) {
    //   return jsonError(401, 'Ongeldige app-token.');
    // }

    // ── 5. Haal API-sleutel op uit env variable ─────────────
    const apiKey = env.RP_API_KEY ?? '';

    // ── 6. Stuur door naar doeladres ────────────────────────
    try {
      const proxyHeaders = {
        'Accept':       'application/json',
        'Content-Type': 'application/json',
        'User-Agent':   'AI-Plantoetser/1.0',
      };
      if (apiKey && targetHost.includes('omgevingswet.overheid.nl')) {
        proxyHeaders['X-Api-Key'] = apiKey;
      }

      const proxyRequest = new Request(targetUrl, {
        method:  request.method,
        headers: proxyHeaders,
        body:    request.method === 'POST' ? request.body : undefined,
      });

      const response = await fetch(proxyRequest);

      // ── 7. Response teruggeven met CORS-headers ──────────
      const responseHeaders = new Headers(CORS_HEADERS);
      responseHeaders.set('Content-Type', response.headers.get('Content-Type') ?? 'application/json');
      responseHeaders.set('X-Cache-Status', 'MISS');

      const body = await response.arrayBuffer();
      return new Response(body, {
        status:  response.status,
        headers: responseHeaders,
      });

    } catch (err) {
      return jsonError(502, `Upstream-fout: ${err.message}`);
    }
  },
};

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}
