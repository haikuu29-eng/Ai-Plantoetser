// AI Plantoetser — views/vereisten.js

import { getActivePerceel } from '../app.js';
import { navigate } from '../router.js';
import { getActiviteiten } from '../db/database.js';

export async function renderVereisten(container) {
  const perceel    = await getActivePerceel();
  const activiteiten = perceel ? await getActiviteiten(perceel.id) : [];

  container.innerHTML = `<div class="vereisten-layout"></div>`;
  const wrap = container.querySelector('.vereisten-layout');

  if (!activiteiten.length) {
    wrap.innerHTML = `
      <div class="page-header">
        <h1 class="page-header__title">Indieningsvereisten</h1>
      </div>
      <div class="alert alert-info">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>
        <span>Selecteer eerst activiteiten om de vereisten te zien.</span>
      </div>
      <button class="btn btn-primary" style="margin-top:1rem" onclick="navigate('#activiteiten')">
        Activiteiten kiezen
      </button>
    `;
    return;
  }

  // Laad JSON data
  let data = [];
  try {
    const res = await fetch('./js/data/indieningsvereisten.json');
    data = await res.json();
  } catch (e) {
    wrap.innerHTML = `<div class="alert alert-error">Vereistendata kon niet worden geladen.</div>`;
    return;
  }

  const geselecteerd = data.filter(d => activiteiten.includes(d.activiteit));

  if (!geselecteerd.length) {
    wrap.innerHTML = `
      <div class="page-header"><h1 class="page-header__title">Indieningsvereisten</h1></div>
      <div class="alert alert-info">Geen vereisten gevonden voor de geselecteerde activiteiten.</div>`;
    return;
  }

  // Telsamenvatting
  let totaalVerplicht   = 0;
  let totaalConditioneel = 0;
  geselecteerd.forEach(g => {
    g.vereisten?.forEach(v => {
      if (v.type === 'verplicht')    totaalVerplicht++;
      if (v.type === 'conditioneel') totaalConditioneel++;
    });
  });

  wrap.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Indieningsvereisten</h1>
      <p class="page-header__subtitle">${geselecteerd.length} activiteit${geselecteerd.length > 1 ? 'en' : ''} geselecteerd</p>
    </div>

    <div class="vereisten-samenvatting">
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/>
      </svg>
      <span>
        <strong>${totaalVerplicht} verplichte</strong> en
        <strong>${totaalConditioneel} conditionele</strong> stukken voor
        ${geselecteerd.length} activiteit${geselecteerd.length > 1 ? 'en' : ''}
      </span>
    </div>

    <div id="vereisten-groepen"></div>

    <div class="btn-group" style="margin-top:1.5rem">
      <button class="btn btn-primary" onclick="navigate('#advies')">
        Genereer advies →
      </button>
      <button class="btn btn-secondary" onclick="navigate('#activiteiten')">
        ← Activiteiten
      </button>
    </div>
  `;

  const groepenEl = wrap.querySelector('#vereisten-groepen');

  geselecteerd.forEach(groep => {
    const groepEl = document.createElement('div');
    groepEl.className = 'vereisten-groep';
    groepEl.innerHTML = `
      <div class="vereisten-groep__label">${groep.label}</div>
      ${(groep.vereisten ?? []).map(v => `
        <div class="vereiste-item">
          <div class="vereiste-item__header">
            <span class="vereiste-item__desc">${v.omschrijving}</span>
            <span class="badge ${typeBadge(v.type)}">${typeLabel(v.type)}</span>
          </div>
          <div class="vereiste-item__grondslag">${v.grondslag}</div>
          ${v.toelichting ? `
            <button class="detail-toggle" aria-expanded="false">Toelichting tonen</button>
            <div class="detail-body">${v.toelichting}</div>
          ` : ''}
          ${v.condities ? `<div class="detail-body open" style="margin-top:.375rem;color:var(--color-gold)">
            Conditie: ${v.condities}</div>` : ''}
        </div>
      `).join('')}
    `;

    groepEl.querySelectorAll('.detail-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const body = btn.nextElementSibling;
        const open = body.classList.toggle('open');
        btn.textContent = open ? 'Toelichting verbergen' : 'Toelichting tonen';
        btn.setAttribute('aria-expanded', open);
      });
    });

    groepenEl.appendChild(groepEl);
  });
}

function typeBadge(type) {
  if (type === 'verplicht')      return 'badge-primary';
  if (type === 'conditioneel')   return 'badge-gold';
  if (type === 'aandachtspunt')  return 'badge-blue';
  return 'badge-neutral';
}

function typeLabel(type) {
  if (type === 'verplicht')      return 'Verplicht';
  if (type === 'conditioneel')   return 'Conditioneel';
  if (type === 'aandachtspunt')  return 'Aandachtspunt';
  return type;
}
