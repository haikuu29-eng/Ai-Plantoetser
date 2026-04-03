// AI Plantoetser — views/maatvoeringen.js

import { getActivePerceel } from '../app.js';
import { navigate } from '../router.js';
import { isWorkerConfigured } from '../api/omgevingsplan.js';
import { zoekPlannenOpLocatie, getMaatvoeringenOpLocatie, getMaatvoeringen } from '../api/ruimtelijke-plannen.js';
import { getPlannenCache, saveToets, getToets } from '../db/database.js';

// Standaard maatvoeringsrijen — altijd tonen, ook als niet in API
const STANDAARD_MATEN = [
  { key: 'max_bouwhoogte',         label: 'Maximale bouwhoogte',                eenheid: 'm' },
  { key: 'max_goothoogte',         label: 'Maximale goothoogte',                eenheid: 'm' },
  { key: 'max_bebouwingsperc',     label: 'Max. bebouwingspercentage',           eenheid: '%' },
  { key: 'min_zijdelings',         label: 'Min. afstand zijdelingse perceelgrens', eenheid: 'm' },
  { key: 'min_achter',             label: 'Min. afstand achterste perceelgrens', eenheid: 'm' },
  { key: 'max_opp_bijgebouwen',    label: 'Max. oppervlakte bijgebouwen',        eenheid: 'm²' },
  { key: 'max_hoogte_bijgebouwen', label: 'Max. bouwhoogte bijgebouwen',         eenheid: 'm' },
];

// Mapping van API-maatvoering namen naar standaard keys
const NAAM_MAP = {
  'maximum bouwhoogte (m)':                      'max_bouwhoogte',
  'maximale bouwhoogte':                         'max_bouwhoogte',
  'max. bouwhoogte':                             'max_bouwhoogte',
  'maximum goothoogte (m)':                      'max_goothoogte',
  'maximale goothoogte':                         'max_goothoogte',
  'maximum bebouwingspercentage (%)':            'max_bebouwingsperc',
  'bebouwingspercentage':                        'max_bebouwingsperc',
  'minimale afstand tot zijdelingse perceelsgrens (m)': 'min_zijdelings',
  'minimale afstand tot achtererfgrens (m)':     'min_achter',
  'maximum oppervlakte aan bijgebouwen (m²)':    'max_opp_bijgebouwen',
  'maximum bouwhoogte bijgebouwen (m)':          'max_hoogte_bijgebouwen',
};

export async function renderMaatvoeringen(container) {
  container.innerHTML = `<div class="maatvoeringen-layout"></div>`;
  const wrap = container.querySelector('.maatvoeringen-layout');

  const perceel = await getActivePerceel();

  if (!perceel) {
    wrap.innerHTML = noPerceelState();
    return;
  }

  wrap.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Maatvoeringen</h1>
      <p class="page-header__subtitle">${perceel.weergavenaam}</p>
    </div>
    <div id="maat-content">
      ${skeletonTable()}
    </div>
  `;

  try {
    // Haal plannen op (uit cache of API)
    let plannen = isWorkerConfigured()
      ? await getPlannenCache(perceel.id) ?? await zoekPlannenOpLocatie(perceel.ll.lon, perceel.ll.lat)
      : [];

    const bp = plannen.find(p => p.type === 'bestemmingsplan') ?? plannen[0];
    let apiMaten = {};
    let bron = 'handmatig';

    if (bp && isWorkerConfigured()) {
      try {
        const maatvoeringen = await getMaatvoeringenOpLocatie(bp.id, perceel.ll.lon, perceel.ll.lat);
        if (!maatvoeringen.length) {
          // Fallback: alle maatvoeringen van het plan
          const alle = await getMaatvoeringen(bp.id);
          maatvoeringen.push(...alle);
        }

        maatvoeringen.forEach(m => {
          (m.omvang ?? []).forEach(o => {
            const key = NAAM_MAP[o.naam?.toLowerCase()] ?? NAAM_MAP[m.naam?.toLowerCase()];
            if (key && o.waarde) {
              apiMaten[key] = { waarde: o.waarde, bron: 'api' };
            }
          });
        });
        bron = Object.keys(apiMaten).length ? 'api' : 'niet-gedigitaliseerd';
      } catch (_) { /* geen maatvoeringen in dit plan */ }
    }

    // Eerder ingevulde waarden ophalen
    const savedToets = await getToets(perceel.id);
    const savedWaarden = savedToets?.maatData ?? {};

    renderMaatTabel(wrap.querySelector('#maat-content'), perceel, bp, apiMaten, savedWaarden, bron);

  } catch (e) {
    wrap.querySelector('#maat-content').innerHTML = `
      <div class="alert alert-error">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>
        <span>Fout bij laden maatvoeringen: ${e.message}</span>
      </div>`;
  }
}

function renderMaatTabel(contentEl, perceel, plan, apiMaten, savedWaarden, bron) {
  const bronLabel = bron === 'api'
    ? '<span class="badge badge-primary">Uit digitaal plan</span>'
    : bron === 'niet-gedigitaliseerd'
    ? '<span class="badge badge-neutral">Niet gedigitaliseerd — handmatig invoeren</span>'
    : '<span class="badge badge-neutral">Handmatig invoeren</span>';

  contentEl.innerHTML = `
    ${plan ? `
      <div class="card" style="margin-bottom:1rem">
        <div class="data-list">
          <div class="data-row">
            <span class="data-row__label">Plan</span>
            <span class="data-row__value">${plan.naam}</span>
          </div>
          <div class="data-row">
            <span class="data-row__label">Status</span>
            <span class="data-row__value">
              <span class="badge ${statusBadge(plan.planstatusInfo?.planstatus)}">
                ${plan.planstatusInfo?.planstatus ?? '—'}
              </span>
            </span>
          </div>
          <div class="data-row">
            <span class="data-row__label">Maatvoeringsbron</span>
            <span class="data-row__value">${bronLabel}</span>
          </div>
        </div>
      </div>
    ` : ''}

    ${bron === 'niet-gedigitaliseerd' ? `
      <div class="alert alert-info" style="margin-bottom:1rem">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>
        <span>Maatvoeringen zijn niet gedigitaliseerd in dit plan. Raadpleeg de plantekst op
          ${plan ? `<a href="https://www.ruimtelijkeplannen.nl/viewer/viewer?planidn=${encodeURIComponent(plan.id)}" target="_blank" rel="noopener noreferrer">ruimtelijkeplannen.nl ↗</a>` : 'ruimtelijkeplannen.nl'}
          en vul de waarden hieronder handmatig in.</span>
      </div>
    ` : ''}

    <div class="table-wrapper" style="margin-bottom:1.25rem">
      <table id="maat-table">
        <thead>
          <tr>
            <th>Maat</th>
            <th>Toegestaan (plan)</th>
            <th>Aangevraagd</th>
            <th>Verschil</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${STANDAARD_MATEN.map(maat => {
            const apiEntry = apiMaten[maat.key];
            const planWaarde = apiEntry?.waarde ?? null;
            const aangevraagd = savedWaarden[maat.key] ?? '';
            const { verschil, status, procedure } = berekenStatus(planWaarde, aangevraagd);

            return `
              <tr data-key="${maat.key}" data-plan-waarde="${planWaarde ?? ''}" data-eenheid="${maat.eenheid}">
                <td>
                  ${maat.label}
                  ${apiEntry?.bron === 'api'
                    ? '<span class="maat-source-indicator"> (digitaal)</span>'
                    : planWaarde === null
                    ? '<span class="maat-source-indicator"> (niet gedigitaliseerd)</span>'
                    : ''}
                </td>
                <td>
                  ${planWaarde !== null
                    ? `<strong>${planWaarde} ${maat.eenheid}</strong>`
                    : `<span class="status-empty">—
                        ${plan ? `<a href="https://www.ruimtelijkeplannen.nl/viewer/viewer?planidn=${encodeURIComponent(plan?.id ?? '')}" target="_blank" rel="noopener noreferrer" style="font-size:var(--text-xs)">&nbsp;↗</a>` : ''}</span>`}
                </td>
                <td>
                  <input
                    type="number"
                    class="form-input td-input maat-input"
                    data-key="${maat.key}"
                    value="${aangevraagd}"
                    placeholder="—"
                    step="0.01"
                    min="0"
                    aria-label="Aangevraagde ${maat.label}"
                  />
                </td>
                <td class="verschil-cell">${verschil !== null ? verschil + ' ' + maat.eenheid : '—'}</td>
                <td class="status-cell">${renderStatusCell(status, procedure)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div class="btn-group">
      <button class="btn btn-primary" id="btn-sla-op">
        <svg viewBox="0 0 20 20" fill="currentColor"><path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z"/></svg>
        Opslaan
      </button>
      <button class="btn btn-secondary" onclick="navigate('#activiteiten')">
        Activiteiten kiezen →
      </button>
      <button class="btn btn-secondary" onclick="navigate('#advies')">
        Direct naar advies
      </button>
    </div>
  `;

  // Live berekening
  contentEl.querySelectorAll('.maat-input').forEach(input => {
    input.addEventListener('input', () => updateRij(input));
    if (input.value) updateRij(input);
  });

  // Opslaan
  contentEl.querySelector('#btn-sla-op').addEventListener('click', async () => {
    const data = {};
    contentEl.querySelectorAll('.maat-input').forEach(inp => {
      if (inp.value) data[inp.dataset.key] = parseFloat(inp.value);
    });

    // Bepaal overall status
    const rows = contentEl.querySelectorAll('tr[data-key]');
    let hasStrijdig = false;
    rows.forEach(row => {
      const sc = row.querySelector('.status-cell');
      if (sc?.textContent.includes('Strijdig')) hasStrijdig = true;
    });

    await saveToets(perceel.id, data, hasStrijdig ? 'strijdig' : 'akkoord');
    const btn = contentEl.querySelector('#btn-sla-op');
    btn.textContent = '✓ Opgeslagen';
    btn.classList.add('btn-secondary');
    btn.classList.remove('btn-primary');
    setTimeout(() => {
      btn.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z"/></svg> Opslaan`;
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary');
    }, 2000);
  });
}

function updateRij(input) {
  const row      = input.closest('tr');
  const key      = row.dataset.key;
  const eenheid  = row.dataset.eenheid;
  const planStr  = row.dataset.planWaarde;
  const planWaarde = planStr ? parseFloat(planStr) : null;
  const aangevraagd = input.value !== '' ? parseFloat(input.value) : null;

  const { verschil, status, procedure } = berekenStatus(planWaarde, aangevraagd);

  row.querySelector('.verschil-cell').textContent =
    verschil !== null ? verschil + ' ' + eenheid : '—';
  row.querySelector('.status-cell').innerHTML = renderStatusCell(status, procedure);
}

function berekenStatus(planWaarde, aangevraagd) {
  if (planWaarde === null || aangevraagd === null || aangevraagd === '') {
    return { verschil: null, status: 'empty', procedure: null };
  }

  const plan = parseFloat(planWaarde);
  const aanv = parseFloat(aangevraagd);
  if (isNaN(plan) || isNaN(aanv)) return { verschil: null, status: 'empty', procedure: null };

  const verschil = Math.round((aanv - plan) * 100) / 100;
  const percDiff = plan !== 0 ? Math.abs(verschil) / plan * 100 : Infinity;

  if (aanv <= plan) {
    return { verschil, status: 'ok', procedure: null };
  }

  // Strijdig
  const procedure = percDiff <= 10
    ? 'Binnenplanse afwijking mogelijk (art. 15 lid 4)'
    : percDiff <= 50
    ? 'BOPA vereist (art. 8.0a Ow)'
    : 'Raadpleeg artikel manueel — grote overschrijding';

  return { verschil, status: 'strijdig', procedure };
}

function renderStatusCell(status, procedure) {
  if (status === 'empty')    return '<span class="status-empty">—</span>';
  if (status === 'ok')       return '<span class="status-ok">✓ Akkoord</span>';
  return `
    <span class="status-strijdig">✗ Strijdig</span>
    ${procedure ? `<div class="maat-procedure-box ${procedure.includes('Binnenplanse') ? 'binnenplan' : 'bopa'}">${procedure}</div>` : ''}
  `;
}

function statusBadge(s) {
  if (s === 'vastgesteld')     return 'badge-success';
  if (s === 'onherroepelijk')  return 'badge-success';
  if (s === 'in voorbereiding') return 'badge-warning';
  return 'badge-neutral';
}

function noPerceelState() {
  return `
    <div class="empty-state">
      <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/>
      </svg>
      <p class="empty-state__title">Geen perceel geselecteerd</p>
      <p class="empty-state__body">Zoek eerst een adres op.</p>
      <button class="btn btn-primary" onclick="navigate('#zoeken')">Adres zoeken</button>
    </div>`;
}

function skeletonTable() {
  return `
    <div class="card">
      ${[0,1,2,3].map(() => `<div class="skeleton skeleton-text" style="margin-bottom:.75rem"></div>`).join('')}
    </div>`;
}
