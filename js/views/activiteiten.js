// AI Plantoetser — views/activiteiten.js

import { getActivePerceel } from '../app.js';
import { navigate } from '../router.js';
import { saveActiviteiten, getActiviteiten } from '../db/database.js';

const ACTIVITEITEN = [
  {
    id:    'technische-bouwactiviteit',
    label: 'Technische bouwactiviteit',
    icon:  '🏗️',
    desc:  'Bouwen, verbouwen, uitbreiden van een bouwwerk',
  },
  {
    id:    'omgevingsplanactiviteit',
    label: 'Omgevingsplanactiviteit (OPA)',
    icon:  '📋',
    desc:  'Gebruik of handeling conform het omgevingsplan',
  },
  {
    id:    'bopa',
    label: 'Afwijken omgevingsplan (BOPA)',
    icon:  '⚠️',
    desc:  'Buitenplanse omgevingsplanactiviteit — strijd met plan',
  },
  {
    id:    'slopen',
    label: 'Slopen',
    icon:  '🪚',
    desc:  'Geheel of gedeeltelijk slopen van een bouwwerk',
  },
  {
    id:    'gemeentelijk-monument',
    label: 'Gemeentelijk monument',
    icon:  '🏛️',
    desc:  'Wijziging aan een gemeentelijk beschermd monument',
  },
  {
    id:    'rijksmonument',
    label: 'Rijksmonument',
    icon:  '🏰',
    desc:  'Wijziging aan een rijksbeschermd monument',
  },
  {
    id:    'milieu',
    label: 'Milieubelastende activiteit',
    icon:  '🏭',
    desc:  'Bedrijfsmatige activiteiten met milieu-impact',
  },
  {
    id:    'uitweg',
    label: 'Uitweg / uitrit',
    icon:  '🛣️',
    desc:  'Aanleg van een inrit naar de openbare weg',
  },
  {
    id:    'kap',
    label: 'Kap',
    icon:  '🌳',
    desc:  'Vellen of verplaatsen van houtopstanden',
  },
  {
    id:    'reclame',
    label: 'Reclame',
    icon:  '📢',
    desc:  'Plaatsen van een reclamebord of lichtbak',
  },
];

export async function renderActiviteiten(container) {
  const perceel = await getActivePerceel();
  const saved   = perceel ? await getActiviteiten(perceel.id) : [];
  let selected  = new Set(saved);

  container.innerHTML = `
    <div class="activiteiten-layout">
      <div class="page-header">
        <h1 class="page-header__title">Activiteiten</h1>
        <p class="page-header__subtitle">Selecteer de activiteiten die van toepassing zijn</p>
      </div>

      <div class="activity-grid" id="activity-grid">
        ${ACTIVITEITEN.map(a => `
          <div
            class="activity-card ${selected.has(a.id) ? 'selected' : ''}"
            data-id="${a.id}"
            role="checkbox"
            aria-checked="${selected.has(a.id)}"
            tabindex="0"
            aria-label="${a.label}"
          >
            <div class="activity-card__icon" aria-hidden="true">${a.icon}</div>
            <div class="activity-card__name">${a.label}</div>
            <div class="activity-card__desc">${a.desc}</div>
          </div>
        `).join('')}
      </div>

      <div id="geselecteerd-summary" style="margin-top:1rem"></div>

      <div class="btn-group" style="margin-top:1.25rem">
        <button class="btn btn-primary" id="btn-vereisten">
          Bekijk vereisten →
        </button>
        <button class="btn btn-secondary" onclick="navigate('#planregels')">
          ← Planregels
        </button>
      </div>
    </div>
  `;

  updateSummary(container, selected);

  container.querySelectorAll('.activity-card').forEach(card => {
    const activate = () => {
      const id = card.dataset.id;
      if (selected.has(id)) {
        selected.delete(id);
        card.classList.remove('selected');
        card.setAttribute('aria-checked', 'false');
      } else {
        selected.add(id);
        card.classList.add('selected');
        card.setAttribute('aria-checked', 'true');
      }
      updateSummary(container, selected);
    };
    card.addEventListener('click', activate);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
  });

  container.querySelector('#btn-vereisten').addEventListener('click', async () => {
    if (perceel) await saveActiviteiten(perceel.id, [...selected]);
    navigate('#vereisten');
  });
}

function updateSummary(container, selected) {
  const summary = container.querySelector('#geselecteerd-summary');
  if (!selected.size) {
    summary.innerHTML = '';
    return;
  }
  const labels = [...selected].map(id => ACTIVITEITEN.find(a => a.id === id)?.label ?? id);
  summary.innerHTML = `
    <div class="alert alert-primary">
      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
      <span><strong>${selected.size} activiteit${selected.size > 1 ? 'en' : ''} geselecteerd:</strong>
        ${labels.join(', ')}</span>
    </div>
  `;
}
