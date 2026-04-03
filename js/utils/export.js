// AI Plantoetser — utils/export.js
// Exporthulpmiddelen: klembord, tekstexport, dossieropslag

import { saveAdvies } from '../db/database.js';
import { downloadAdviesPDF } from './pdf.js';

/**
 * Kopieer platte tekst naar het klembord.
 * @param {string} tekst
 * @returns {Promise<boolean>} true als gelukt
 */
export async function kopieerNaarKlembord(tekst) {
  try {
    await navigator.clipboard.writeText(tekst);
    return true;
  } catch {
    // Fallback voor oudere browsers / niet-HTTPS
    const el = document.createElement('textarea');
    el.value = tekst;
    el.style.position = 'fixed';
    el.style.opacity  = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  }
}

/**
 * Sla advies op in IndexedDB-dossier.
 * @param {string} perceelId
 * @param {string} tekst
 * @returns {Promise<void>}
 */
export async function slaAdviesOp(perceelId, tekst) {
  return saveAdvies(perceelId, tekst);
}

/**
 * Export als PDF.
 * @param {Object} opts  Zie pdf.js#downloadAdviesPDF
 */
export async function exporteerAlsPDF(opts) {
  return downloadAdviesPDF(opts);
}

/**
 * Genereer een bestandsnaam op basis van perceel + datum.
 * @param {Object} perceel
 * @param {string} extensie  bijv. 'pdf' of 'txt'
 * @returns {string}
 */
export function maakBestandsnaam(perceel, extensie = 'pdf') {
  const straat = (perceel.straatnaam ?? 'adres').replace(/\s+/g, '_');
  const hnr    = perceel.huisnummer ?? '';
  const datum  = new Date().toISOString().slice(0, 10);
  return `Advies_${straat}_${hnr}_${datum}.${extensie}`;
}
