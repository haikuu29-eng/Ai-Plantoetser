// AI Plantoetser — views/zoeken.js

import { suggest, lookupById, lookupAddress } from '../api/pdok.js';
import { saveParceel, getRecentPercelen } from '../db/database.js';
import { navigate }   from '../router.js';
import { formatRd, formatWgs84 } from '../utils/coords.js';

let _suggestTimeout = null;
let _suggestions    = [];
let _focusedIdx     = -1;

/**
 * Render de zoekbalk (ook herbruikbaar vanuit dashboard).
 * @param {HTMLElement} container
 * @param {Object} opts
 * @param {boolean} opts.compact      Kleine versie voor het dashboard
 * @param {Function} opts.onPerceel   Callback(perceel) bij adresselectie
 */
export function renderSearchBar(container, opts = {}) {
  container.innerHTML = `
    <div class="search-wrapper" id="search-wrapper-${opts.compact ? 'dash' : 'main'}">
      <svg class="search-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
      </svg>
      <input
        type="search"
        class="search-input"
        id="search-input-${opts.compact ? 'dash' : 'main'}"
        placeholder="Adres, straat of postcode…"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        aria-label="Adres zoeken"
        aria-autocomplete="list"
        aria-controls="search-suggestions-${opts.compact ? 'dash' : 'main'}"
      />
      <button class="search-clear" id="search-clear-${opts.compact ? 'dash' : 'main'}" aria-label="Zoekveld wissen">
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
        </svg>
      </button>
      <div class="suggestions" id="search-suggestions-${opts.compact ? 'dash' : 'main'}" role="listbox"></div>
    </div>
  `;

  const input      = container.querySelector('[id^="search-input"]');
  const clearBtn   = container.querySelector('[id^="search-clear"]');
  const suggestBox = container.querySelector('[id^="search-suggestions"]');

  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearBtn.classList.toggle('visible', q.length > 0);

    clearTimeout(_suggestTimeout);
    if (q.length < 2) { hideSuggestions(suggestBox); return; }

    _suggestTimeout = setTimeout(async () => {
      _suggestions = await suggest(q);
      _focusedIdx  = -1;
      renderSuggestions(suggestBox, _suggestions, input, opts);
    }, 200);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.remove('visible');
    hideSuggestions(suggestBox);
    input.focus();
  });

  input.addEventListener('keydown', (e) => {
    if (!suggestBox.classList.contains('open')) {
      if (e.key === 'Enter') doSearch(input.value.trim(), opts);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _focusedIdx = Math.min(_focusedIdx + 1, _suggestions.length - 1);
      updateFocus(suggestBox);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _focusedIdx = Math.max(_focusedIdx - 1, -1);
      updateFocus(suggestBox);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (_focusedIdx >= 0 && _suggestions[_focusedIdx]) {
        selectSuggestion(_suggestions[_focusedIdx], input, suggestBox, opts);
      } else {
        doSearch(input.value.trim(), opts);
      }
    } else if (e.key === 'Escape') {
      hideSuggestions(suggestBox);
    }
  });

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) hideSuggestions(suggestBox);
  });
}

function renderSuggestions(box, items, input, opts) {
  if (!items.length) { hideSuggestions(box); return; }
  box.innerHTML = items.map((item, i) => `
    <div class="suggestion-item" role="option" data-idx="${i}" tabindex="-1">
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
      </svg>
      <span>${item.highlight}</span>
    </div>
  `).join('');
  box.classList.add('open');

  box.querySelectorAll('.suggestion-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.idx);
      selectSuggestion(items[idx], input, box, opts);
    });
    el.addEventListener('mouseenter', () => {
      _focusedIdx = parseInt(el.dataset.idx);
      updateFocus(box);
    });
  });
}

function updateFocus(box) {
  box.querySelectorAll('.suggestion-item').forEach((el, i) => {
    el.classList.toggle('focused', i === _focusedIdx);
  });
}

function hideSuggestions(box) {
  box.classList.remove('open');
  box.innerHTML = '';
}

async function selectSuggestion(item, input, box, opts) {
  input.value = item.label;
  hideSuggestions(box);
  const perceel = await lookupById(item.id);
  if (perceel) handlePerceelSelected(perceel, opts);
}

async function doSearch(q, opts) {
  if (!q) return;
  const perceel = await lookupAddress(q);
  if (perceel) handlePerceelSelected(perceel, opts);
}

async function handlePerceelSelected(perceel, opts) {
  await saveParceel(perceel);

  // Sla op als actief perceel in app state
  const appModule = await import('../app.js').catch(() => null);
  if (appModule) appModule.setActivePerceel(perceel.id);

  if (opts.compact) {
    // Vanuit dashboard: ga naar zoekscherm met resultaten
    navigate('#zoeken');
    // Kleine delay om view te laten renderen, dan callback via custom event
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('perceel-selected', { detail: perceel }));
    }, 100);
  } else if (typeof opts.onPerceel === 'function') {
    opts.onPerceel(perceel);
  } else {
    window.dispatchEvent(new CustomEvent('perceel-selected', { detail: perceel }));
  }
}

// ── Hoofd zoekscherm ──────────────────────────────────────

export async function renderZoeken(container) {
  container.innerHTML = `
    <div class="zoeken-layout">
      <div class="page-header">
        <h1 class="page-header__title">Adres zoeken</h1>
        <p class="page-header__subtitle">Zoek een adres op om de planregeltoets te starten</p>
      </div>

      <div id="search-bar-wrap"></div>

      <div id="offline-notice" style="display:none">
        <div class="alert alert-warning" role="alert">
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
          <span>Geen internetverbinding — eerder opgeslagen percelen zijn nog beschikbaar</span>
        </div>
        <div id="cached-percelen" style="margin-top:1rem"></div>
      </div>

      <div id="result-wrap"></div>
    </div>
  `;

  const resultWrap = container.querySelector('#result-wrap');

  // Zoekbalk — geef onPerceel callback mee zodat resultaten direct getoond worden
  renderSearchBar(container.querySelector('#search-bar-wrap'), {
    onPerceel: (perceel) => showPerceelResult(resultWrap, perceel),
  });

  // Offline check
  if (!navigator.onLine) {
    container.querySelector('#offline-notice').style.display = 'block';
    const cached = await getRecentPercelen(5);
    if (cached.length) {
      container.querySelector('#cached-percelen').innerHTML = `
        <p style="font-size:var(--text-sm);font-weight:600;margin-bottom:.5rem">Opgeslagen percelen:</p>
        <div class="recent-list">
          ${cached.map(p => `
            <div class="recent-item" data-id="${p.id}" tabindex="0" role="button">
              <div class="recent-item__info">
                <div class="recent-item__address">${p.weergavenaam}</div>
                <div class="recent-item__meta">${p.gemeente}</div>
              </div>
              <svg class="recent-item__arrow" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
              </svg>
            </div>
          `).join('')}
        </div>
      `;
      container.querySelectorAll('#cached-percelen .recent-item').forEach(el => {
        el.addEventListener('click', () => {
          import('../app.js').then(m => m.setActivePerceel(el.dataset.id));
          navigate('#planregels');
        });
      });
    }
  }

  // Luister naar perceel-selected event (bijv. vanuit dashboard compact-modus)
  const onSelected = (e) => showPerceelResult(resultWrap, e.detail);
  window.addEventListener('perceel-selected', onSelected);
}

function showPerceelResult(wrap, perceel) {
  wrap.innerHTML = `
    <div class="address-cards">
      <div class="card">
        <div class="card__header">
          <span class="card__title">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clip-rule="evenodd"/>
            </svg>
            BAG-gegevens
          </span>
        </div>
        <div class="data-list">
          <div class="data-row">
            <span class="data-row__label">Adres</span>
            <span class="data-row__value">${perceel.weergavenaam ?? '—'}</span>
          </div>
          <div class="data-row">
            <span class="data-row__label">Gemeente</span>
            <span class="data-row__value">${perceel.gemeente ?? '—'}</span>
          </div>
          <div class="data-row">
            <span class="data-row__label">Gebruiksdoel</span>
            <span class="data-row__value">${(perceel.gebruiksdoel ?? []).join(', ') || '—'}</span>
          </div>
          <div class="data-row">
            <span class="data-row__label">Oppervlakte</span>
            <span class="data-row__value">${perceel.oppervlakte ? perceel.oppervlakte + ' m²' : '—'}</span>
          </div>
          <div class="data-row">
            <span class="data-row__label">Bouwjaar</span>
            <span class="data-row__value">${perceel.bouwjaar ?? '—'}</span>
          </div>
          <div class="data-row">
            <span class="data-row__label">Verblijfsobject-ID</span>
            <span class="data-row__value mono">${perceel.adresseerbaarObjectId ?? '—'}</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card__header">
          <span class="card__title">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
            </svg>
            Locatie
          </span>
        </div>
        <div class="data-list">
          <div class="data-row">
            <span class="data-row__label">Perceelreferentie</span>
            <span class="data-row__value mono">${perceel.perceelRef ?? '—'}</span>
          </div>
          <div class="data-row">
            <span class="data-row__label">RD-coördinaten</span>
            <span class="data-row__value mono">${perceel.rd ? formatRd(perceel.rd.x, perceel.rd.y) : '—'}</span>
          </div>
          <div class="data-row">
            <span class="data-row__label">WGS84</span>
            <span class="data-row__value mono">${perceel.ll ? formatWgs84(perceel.ll.lon, perceel.ll.lat) : '—'}</span>
          </div>
          <div class="data-row">
            <span class="data-row__label">Gemeente-code</span>
            <span class="data-row__value mono">${perceel.gemeentecode ?? '—'}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="btn-group" style="margin-top:1.25rem">
      <button class="btn btn-primary" id="btn-planregels">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
        Planregels ophalen
      </button>
      <button class="btn btn-secondary" id="btn-maatvoeringen">
        Maatvoeringen bekijken
      </button>
      <button class="btn btn-secondary" id="btn-vereisten">
        Indieningsvereisten bepalen
      </button>
    </div>
  `;

  wrap.querySelector('#btn-planregels').addEventListener('click', () => navigate('#planregels'));
  wrap.querySelector('#btn-maatvoeringen').addEventListener('click', () => navigate('#maatvoeringen'));
  wrap.querySelector('#btn-vereisten').addEventListener('click', () => navigate('#activiteiten'));
}
