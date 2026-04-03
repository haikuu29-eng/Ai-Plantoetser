// AI Plantoetser — omgevingsplan.js
// Cloudflare Worker URL configuratie + DSO/Omgevingsplan helpers

// ── Configureer hier jouw Worker-URL na deployment ──────────
// Vul in na stap 1 van de README:
//   bijv. 'https://ai-plantoetser.workers.dev'
const WORKER_URL = '';

// ─────────────────────────────────────────────────────────────

export function getWorkerUrl() {
  return WORKER_URL;
}

export function isWorkerConfigured() {
  return Boolean(WORKER_URL && WORKER_URL.startsWith('https://'));
}
