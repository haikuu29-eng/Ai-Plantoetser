// AI Plantoetser — views/planregels.js

import { getActivePerceel } from '../app.js';
import { navigate } from '../router.js';
import { isWorkerConfigured } from '../api/omgevingsplan.js';
import {
  zoekPlannenOpLocatie,
  getBestemmingsvlakkenOpLocatie,
  getAlleBestemmingsvlakken,
  getGebiedsaanduidingenOpLocatie,
  getFunctieaanduidingenOpLocatie,
  getMaatvoeringen,
} from '../api/ruimtelijke-plannen.js';
import { savePlannenCache, getPlannenCache } from '../db/database.js';

export async function renderPlanregels(container) {
  container.innerHTML = `<div class="planregels-layout"></div>`;
  const wrap = container.querySelector('.planregels-layout');

  const perceel = await getActivePerceel();

  if (!perceel) {
    wrap.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 13l4.553 2.276A1 1 0 0021 21.382V10.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 7"/>
        </svg>
        <p class="empty-state__title">Geen perceel geselecteerd</p>
        <p class="empty-state__body">Zoek eerst een adres op via het zoekscherm.</p>
        <button class="btn btn-primary" onclick="navigate('#zoeken')">Adres zoeken</button>
      </div>`;
    return;
  }

  if (!isWorkerConfigured()) {
    wrap.innerHTML = `
      <div class="page-header">
        <h1 class="page-header__title">Planregels</h1>
        <p class="page-header__subtitle">${perceel.weergavenaam}</p>
      </div>
      <div class="worker-config-notice">
        <h3>Cloudflare Worker vereist</h3>
        <p>De Ruimtelijke Plannen API vereist authenticatie. Configureer de Worker-URL in <code>js/api/omgevingsplan.js</code> na het deployen van de Worker:</p>
        <code>const WORKER_URL = 'https://jouw-worker.workers.dev';</code>
        <p>Zie de README voor stap-voor-stap deploy-instructies.</p>
        <button class="btn btn-secondary" onclick="navigate('#zoeken')">Terug naar zoeken</button>
      </div>`;
    return;
  }

  // ── Skeleton ──
  wrap.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Planregels</h1>
      <p class="page-header__subtitle">${perceel.weergavenaam}</p>
    </div>
    <div class="card" style="margin-bottom:1rem">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text w-60"></div>
    </div>
    <div class="card">
      <div class="skeleton skeleton-card"></div>
    </div>
  `;

  try {
    // Cache check
    let plannen = await getPlannenCache(perceel.id);
    let fromCache = !!plannen;

    if (!plannen) {
      plannen = await zoekPlannenOpLocatie(perceel.ll.lon, perceel.ll.lat);
      if (plannen.length) {
        await savePlannenCache(perceel.id, plannen);
      }
    }

    // Filter op bestemmingsplan (meest relevant voor vergunningtoets)
    const bestemmingsplannen = plannen.filter(p =>
      p.type === 'bestemmingsplan' || p.type === 'beheersverordening'
    );
    const overige = plannen.filter(p =>
      p.type !== 'bestemmingsplan' && p.type !== 'beheersverordening'
    );

    if (!plannen.length) {
      wrap.innerHTML = `
        <div class="page-header">
          <h1 class="page-header__title">Planregels</h1>
          <p class="page-header__subtitle">${perceel.weergavenaam}</p>
        </div>
        <div class="alert alert-warning">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          <span>Geen plannen gevonden voor dit perceel. Controleer het adres of raadpleeg ruimtelijkeplannen.nl.</span>
        </div>
        <div class="btn-group" style="margin-top:1rem">
          <button class="btn btn-secondary" onclick="navigate('#zoeken')">Ander adres</button>
          <a href="https://www.ruimtelijkeplannen.nl" target="_blank" rel="noopener noreferrer" class="btn btn-ghost">
            Ruimtelijkeplannen.nl ↗
          </a>
        </div>`;
      return;
    }

    renderPlanSelector(wrap, perceel, bestemmingsplannen, overige, fromCache);

  } catch (e) {
    if (e.message === 'WORKER_NOT_CONFIGURED') {
      wrap.innerHTML += `<div class="alert alert-error">Worker-URL niet geconfigureerd.</div>`;
    } else {
      wrap.innerHTML = `
        <div class="page-header">
          <h1 class="page-header__title">Planregels</h1>
        </div>
        <div class="alert alert-error">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>
          <span>Fout bij ophalen plannen: ${e.message}</span>
        </div>
        <button class="btn btn-secondary" style="margin-top:1rem" onclick="location.reload()">Opnieuw proberen</button>`;
    }
  }
}

function renderPlanSelector(wrap, perceel, bestemmingsplannen, overige, fromCache) {
  const allPlannen = [...bestemmingsplannen, ...overige];
  let selectedPlanId = bestemmingsplannen[0]?.id ?? allPlannen[0]?.id;

  wrap.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Planregels</h1>
      <p class="page-header__subtitle">
        ${perceel.weergavenaam}
        ${fromCache ? '<span class="badge badge-neutral" style="margin-left:.5rem">cached</span>' : ''}
      </p>
    </div>

    ${allPlannen.length > 1 ? `
      <div class="card" style="margin-bottom:1rem">
        <div class="card__header"><span class="card__title">Selecteer plan</span></div>
        <div class="plan-list" id="plan-list">
          ${allPlannen.map((p, i) => `
            <div class="plan-option ${i === 0 ? 'selected' : ''}" data-plan-id="${p.id}" tabindex="0" role="radio" aria-checked="${i === 0}">
              <div class="plan-option__radio"></div>
              <div class="plan-option__info">
                <div class="plan-option__name">${p.naam}</div>
                <div class="plan-option__meta">
                  ${p.planstatusInfo?.planstatus ?? '—'} · ${p.planstatusInfo?.datum ?? '—'}
                  ${i === 0 ? ' · <strong>meest recent</strong>' : ''}
                </div>
              </div>
              ${p.planstatusInfo?.planstatus === 'in voorbereiding'
                ? '<span class="badge badge-warning">In voorbereiding</span>' : ''}
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <div id="plan-detail-wrap">
      ${renderPlanDetailSkeleton()}
    </div>
  `;

  // Plan selector interactie
  wrap.querySelectorAll('.plan-option').forEach(el => {
    const activate = () => {
      wrap.querySelectorAll('.plan-option').forEach(o => {
        o.classList.remove('selected');
        o.setAttribute('aria-checked', 'false');
      });
      el.classList.add('selected');
      el.setAttribute('aria-checked', 'true');
      selectedPlanId = el.dataset.planId;
      loadPlanDetail(wrap.querySelector('#plan-detail-wrap'), selectedPlanId, perceel);
    };
    el.addEventListener('click', activate);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') activate(); });
  });

  // Laad eerste plan
  loadPlanDetail(wrap.querySelector('#plan-detail-wrap'), selectedPlanId, perceel);
}

async function loadPlanDetail(detailWrap, planId, perceel) {
  if (!planId) return;
  detailWrap.innerHTML = renderPlanDetailSkeleton();

  try {
    const [vlakken, gebiedsaanduidingen, functieaanduidingen, maatvoeringen] = await Promise.all([
      getBestemmingsvlakkenOpLocatie(planId, perceel.ll.lon, perceel.ll.lat),
      getGebiedsaanduidingenOpLocatie(planId, perceel.ll.lon, perceel.ll.lat),
      getFunctieaanduidingenOpLocatie(planId, perceel.ll.lon, perceel.ll.lat),
      getMaatvoeringen(planId),
    ]);

    const hauptVlak = vlakken.find(v => v.type === 'enkelbestemming') ?? vlakken[0];

    detailWrap.innerHTML = `
      <div class="tabs" id="plan-tabs">
        <button class="tab active" data-tab="bestemming">Bestemmingsvlak</button>
        <button class="tab" data-tab="aanduidingen">Aanduidingen</button>
        <button class="tab" data-tab="maatvoeringen">Maatvoeringen</button>
      </div>

      <div id="tab-bestemming" class="tab-content">
        ${renderBestemmingsvlakTab(vlakken, planId)}
      </div>
      <div id="tab-aanduidingen" class="tab-content" style="display:none">
        ${renderAanduidingenTab(gebiedsaanduidingen, functieaanduidingen)}
      </div>
      <div id="tab-maatvoeringen" class="tab-content" style="display:none">
        ${renderMaatvoeringenTab(maatvoeringen)}
      </div>

      <div class="btn-group" style="margin-top:1.5rem">
        <button class="btn btn-primary" onclick="navigate('#maatvoeringen')">
          Maatvoeringen toetsen
        </button>
        <button class="btn btn-secondary" onclick="navigate('#activiteiten')">
          Activiteiten kiezen
        </button>
      </div>
    `;

    // Tabs
    detailWrap.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => {
        detailWrap.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        detailWrap.querySelectorAll('.tab-content').forEach(tc => tc.style.display = 'none');
        btn.classList.add('active');
        detailWrap.querySelector(`#tab-${btn.dataset.tab}`).style.display = 'block';
      });
    });

  } catch (e) {
    detailWrap.innerHTML = `
      <div class="alert alert-error">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>
        <span>Fout bij laden plandetails: ${e.message}</span>
      </div>`;
  }
}

function renderBestemmingsvlakTab(vlakken, planId) {
  if (!vlakken.length) {
    return `<p style="color:var(--color-text-muted);font-size:var(--text-sm);padding:.5rem 0">
      Geen bestemmingsvlakken gevonden op dit punt.
      <a href="https://www.ruimtelijkeplannen.nl/viewer/viewer?planidn=${encodeURIComponent(planId)}"
         target="_blank" rel="noopener noreferrer">Bekijk op ruimtelijkeplannen.nl ↗</a>
    </p>`;
  }

  const enkelvoudig = vlakken.filter(v => v.type === 'enkelbestemming');
  const dubbel      = vlakken.filter(v => v.type === 'dubbelbestemming');

  return `
    ${enkelvoudig.map(v => `
      <div class="bestemmingsvlak-card">
        <div class="bestemmingsvlak-type">Enkelbestemming</div>
        <div class="bestemmingsvlak-naam">${v.naam}</div>
        ${v.artikelnummer ? `<div class="bestemmingsvlak-artikel">Art. ${v.artikelnummer}</div>` : ''}
        ${v.verwijzingNaarTekst?.[0] ? `
          <a href="${v.verwijzingNaarTekst[0]}" target="_blank" rel="noopener noreferrer"
             style="font-size:var(--text-xs);margin-top:.5rem;display:inline-block">
            Planregel tekst bekijken ↗
          </a>` : ''}
      </div>
    `).join('')}

    ${dubbel.length ? `
      <div class="section-header" style="margin-top:1rem">Dubbelbestemming(en)</div>
      ${dubbel.map(v => `
        <div class="bestemmingsvlak-card" style="background:var(--color-gold-light);border-color:var(--color-gold)">
          <div class="bestemmingsvlak-type" style="color:var(--color-gold)">Dubbelbestemming</div>
          <div class="bestemmingsvlak-naam">${v.naam}</div>
          ${v.artikelnummer ? `<div class="bestemmingsvlak-artikel">Art. ${v.artikelnummer}</div>` : ''}
        </div>
      `).join('')}
    ` : ''}
  `;
}

function renderAanduidingenTab(gebiedsaanduidingen, functieaanduidingen) {
  if (!gebiedsaanduidingen.length && !functieaanduidingen.length) {
    return `<p style="color:var(--color-text-muted);font-size:var(--text-sm);padding:.5rem 0">Geen aanduidingen gevonden op dit punt.</p>`;
  }
  return `
    ${functieaanduidingen.length ? `
      <div class="section-header">Functieaanduidingen</div>
      <div class="data-list" style="margin-bottom:1rem">
        ${functieaanduidingen.map(a => `
          <div class="data-row">
            <span class="data-row__label">${a.naam}</span>
            <span class="badge badge-blue">${a.naam}</span>
          </div>`).join('')}
      </div>
    ` : ''}
    ${gebiedsaanduidingen.length ? `
      <div class="section-header">Gebiedsaanduidingen</div>
      <div class="data-list">
        ${gebiedsaanduidingen.map(a => `
          <div class="data-row">
            <span class="data-row__label">${a.naam}</span>
            <span class="badge badge-gold">${a.naam}</span>
          </div>`).join('')}
      </div>
    ` : ''}
  `;
}

function renderMaatvoeringenTab(maatvoeringen) {
  if (!maatvoeringen.length) {
    return `<p style="color:var(--color-text-muted);font-size:var(--text-sm);padding:.5rem 0">Geen gestructureerde maatvoeringen in dit plan. <a href="#maatvoeringen" onclick="navigate('#maatvoeringen');return false;">Ga naar het maatvoeringsscherm</a> om handmatig in te voeren.</p>`;
  }
  return `
    <div class="table-wrapper">
      <table>
        <thead><tr><th>Maat</th><th>Waarde</th></tr></thead>
        <tbody>
          ${maatvoeringen.flatMap(m =>
            (m.omvang ?? []).map(o => `
              <tr>
                <td>${o.naam ?? m.naam}</td>
                <td><strong>${o.waarde ?? '—'}</strong></td>
              </tr>`)
          ).join('')}
        </tbody>
      </table>
    </div>
    <button class="btn btn-primary" style="margin-top:1rem" onclick="navigate('#maatvoeringen')">
      Maatvoeringen toetsen →
    </button>
  `;
}

function renderPlanDetailSkeleton() {
  return `
    <div class="card">
      <div class="skeleton skeleton-title" style="margin-bottom:1rem"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text w-60"></div>
      <div class="skeleton skeleton-text w-40" style="margin-top:.5rem"></div>
    </div>`;
}
