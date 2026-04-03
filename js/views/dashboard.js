// AI Plantoetser — views/dashboard.js

import { getKPIs, getRecentPercelen } from '../db/database.js';
import { navigate } from '../router.js';
import { suggest, lookupById } from '../api/pdok.js';
import { renderSearchBar } from './zoeken.js';

export async function renderDashboard(container) {
  container.innerHTML = `
    <div class="dashboard-grid">
      <div class="page-header">
        <h1 class="page-header__title">Dashboard</h1>
        <p class="page-header__subtitle">Overzicht van recente plantoetsen</p>
      </div>

      <div class="dashboard-search" id="dash-search-wrap"></div>

      <div id="kpi-grid" class="kpi-grid">
        ${[0,1,2,3].map(() => `<div class="kpi-card"><div class="skeleton skeleton-text w-60"></div><div class="skeleton skeleton-title"></div></div>`).join('')}
      </div>

      <div>
        <div class="section-header">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
          Recente toetsen
        </div>
        <div id="recent-list"></div>
      </div>
    </div>
  `;

  // ── Zoekbalk ──
  const searchWrap = container.querySelector('#dash-search-wrap');
  renderSearchBar(searchWrap, { compact: true });

  // ── KPI's ──
  try {
    const kpis = await getKPIs();
    container.querySelector('#kpi-grid').innerHTML = `
      <div class="kpi-card">
        <span class="kpi-card__label">Toetsen vandaag</span>
        <span class="kpi-card__value">${kpis.vandaag}</span>
        <span class="kpi-card__sub">Gestart of bijgewerkt</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-card__label">Afgerond (30 dagen)</span>
        <span class="kpi-card__value">${kpis.afgerond}</span>
        <span class="kpi-card__sub">Status: akkoord</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-card__label">Percelen gecached</span>
        <span class="kpi-card__value">${kpis.gecached}</span>
        <span class="kpi-card__sub">Offline beschikbaar</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-card__label">Openstaand advies</span>
        <span class="kpi-card__value">${kpis.openstaand}</span>
        <span class="kpi-card__sub">Nog niet geëxporteerd</span>
      </div>
    `;
  } catch (e) {
    console.error('KPI load error:', e);
  }

  // ── Recente toetsen ──
  try {
    const percelen = await getRecentPercelen(10);
    const listEl = container.querySelector('#recent-list');

    if (!percelen.length) {
      listEl.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 13l4.553 2.276A1 1 0 0021 21.382V10.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 7"/>
          </svg>
          <p class="empty-state__title">Nog geen toetsen</p>
          <p class="empty-state__body">Voer een adres in om te beginnen met een planregeltoets.</p>
          <button class="btn btn-primary" onclick="navigate('#zoeken')">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>
            Start eerste toets
          </button>
        </div>
      `;
      return;
    }

    listEl.innerHTML = `
      <div class="recent-list">
        ${percelen.map(p => `
          <div class="recent-item" data-perceel-id="${p.id}" role="button" tabindex="0"
               aria-label="Bekijk planregels voor ${p.weergavenaam}">
            <div class="recent-item__info">
              <div class="recent-item__address">${p.weergavenaam ?? '—'}</div>
              <div class="recent-item__meta">
                ${p.gemeente ?? ''} &middot;
                ${formatDate(p.timestamp)}
                ${p.bestemming ? ` &middot; <span class="badge badge-primary">${p.bestemming}</span>` : ''}
              </div>
            </div>
            <span class="badge ${statusBadge(p.status)}">${statusLabel(p.status)}</span>
            <svg class="recent-item__arrow" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
            </svg>
          </div>
        `).join('')}
      </div>
    `;

    listEl.querySelectorAll('.recent-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.perceelId;
        // Sla actief perceel op in module state
        import('../app.js').then(m => m.setActivePerceel(id));
        navigate('#planregels');
      });
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') el.click();
      });
    });

  } catch (e) {
    console.error('Recent list error:', e);
  }
}

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('nl-NL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function statusBadge(status) {
  if (status === 'akkoord')   return 'badge-success';
  if (status === 'strijdig')  return 'badge-error';
  return 'badge-neutral';
}

function statusLabel(status) {
  if (status === 'akkoord')   return 'Akkoord';
  if (status === 'strijdig')  return 'Strijdig';
  return 'In behandeling';
}
