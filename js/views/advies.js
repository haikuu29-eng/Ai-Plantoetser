// AI Plantoetser — views/advies.js

import { getActivePerceel } from '../app.js';
import { navigate } from '../router.js';
import { getToets, getActiviteiten, saveAdvies, db } from '../db/database.js';
import { downloadAdviesPDF } from '../utils/pdf.js';

const ACTIVITEIT_LABELS = {
  'technische-bouwactiviteit': 'Technische bouwactiviteit',
  'omgevingsplanactiviteit':   'Omgevingsplanactiviteit (OPA)',
  'bopa':                      'Afwijken omgevingsplan (BOPA)',
  'slopen':                    'Slopen',
  'gemeentelijk-monument':     'Gemeentelijk monument',
  'rijksmonument':              'Rijksmonument',
  'milieu':                    'Milieubelastende activiteit',
  'uitweg':                    'Uitweg / uitrit',
  'kap':                       'Kap',
  'reclame':                   'Reclame',
};

const MAAT_LABELS = {
  max_bouwhoogte:         'Maximale bouwhoogte',
  max_goothoogte:         'Maximale goothoogte',
  max_bebouwingsperc:     'Max. bebouwingspercentage',
  min_zijdelings:         'Min. afstand zijdelingse perceelgrens',
  min_achter:             'Min. afstand achterste perceelgrens',
  max_opp_bijgebouwen:    'Max. oppervlakte bijgebouwen',
  max_hoogte_bijgebouwen: 'Max. bouwhoogte bijgebouwen',
};

export async function renderAdvies(container) {
  const perceel = await getActivePerceel();

  if (!perceel) {
    container.innerHTML = `
      <div class="empty-state">
        <p class="empty-state__title">Geen perceel geselecteerd</p>
        <button class="btn btn-primary" onclick="navigate('#zoeken')">Adres zoeken</button>
      </div>`;
    return;
  }

  const [toets, activiteitenIds] = await Promise.all([
    getToets(perceel.id),
    getActiviteiten(perceel.id),
  ]);

  // Laad vereisten data
  let vereistenData = [];
  try {
    const res = await fetch('./js/data/indieningsvereisten.json');
    vereistenData = await res.json();
  } catch (_) {}

  const datum = new Date().toISOString();
  const adviestekst = buildAdviestekst(perceel, toets, activiteitenIds, vereistenData);

  container.innerHTML = `
    <div class="advies-layout">
      <div class="page-header">
        <h1 class="page-header__title">Plantoetsadvies</h1>
        <p class="page-header__subtitle">Gegenereerd op ${formatDate(datum)}</p>
      </div>

      <div class="advies-meta">
        <span>
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>
          ${perceel.weergavenaam}
        </span>
        <span>
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
          ${formatDate(datum)}
        </span>
        ${perceel.gemeente ? `<span>${perceel.gemeente}</span>` : ''}
      </div>

      <div class="advies-actions">
        <button class="btn btn-primary" id="btn-pdf">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clip-rule="evenodd"/></svg>
          Download als PDF
        </button>
        <button class="btn btn-secondary" id="btn-copy">
          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/></svg>
          Kopieer naar klembord
        </button>
        <button class="btn btn-secondary" id="btn-opslaan">
          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z"/></svg>
          Sla op in dossier
        </button>
      </div>

      <div id="advies-secties">
        ${renderAdviesSecties(perceel, toets, activiteitenIds, vereistenData)}
      </div>
    </div>
  `;

  // PDF
  container.querySelector('#btn-pdf').addEventListener('click', () => {
    downloadAdviesPDF({ perceel, adviestekst, datum });
  });

  // Clipboard
  container.querySelector('#btn-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(adviestekst);
      const btn = container.querySelector('#btn-copy');
      btn.textContent = '✓ Gekopieerd';
      setTimeout(() => {
        btn.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/></svg> Kopieer naar klembord`;
      }, 2000);
    } catch (_) { alert('Klembord niet beschikbaar. Selecteer de tekst handmatig.'); }
  });

  // Opslaan in dossier
  container.querySelector('#btn-opslaan').addEventListener('click', async () => {
    await saveAdvies(perceel.id, adviestekst);
    const btn = container.querySelector('#btn-opslaan');
    btn.textContent = '✓ Opgeslagen in dossier';
  });
}

function renderAdviesSecties(perceel, toets, activiteitenIds, vereistenData) {
  const secties = [
    {
      num: 1,
      title: 'Perceel en plan',
      body: `
        <div class="data-list">
          <div class="data-row"><span class="data-row__label">Adres</span>
            <span class="data-row__value">${perceel.weergavenaam ?? '—'}</span></div>
          <div class="data-row"><span class="data-row__label">Gemeente</span>
            <span class="data-row__value">${perceel.gemeente ?? '—'}</span></div>
          <div class="data-row"><span class="data-row__label">Postcode</span>
            <span class="data-row__value">${perceel.postcode ?? '—'}</span></div>
          <div class="data-row"><span class="data-row__label">Gebruiksdoel</span>
            <span class="data-row__value">${(perceel.gebruiksdoel ?? []).join(', ') || '—'}</span></div>
        </div>
      `,
    },
    {
      num: 2,
      title: 'Toetsing maatvoeringen',
      body: renderMaatSamenvatting(toets),
    },
    {
      num: 3,
      title: 'Activiteiten en procedures',
      body: renderActiviteitenSamenvatting(activiteitenIds),
    },
    {
      num: 4,
      title: 'Ontbrekende stukken',
      body: renderVereistenSamenvatting(activiteitenIds, vereistenData),
    },
    {
      num: 5,
      title: 'Vervolgstappen',
      body: renderVervolgstappen(toets, activiteitenIds),
    },
    {
      num: 6,
      title: 'Aandachtspunten',
      body: renderAandachtspunten(toets, activiteitenIds),
    },
  ];

  return secties.map(s => `
    <div class="advies-section">
      <div class="advies-section__header">
        <div class="advies-section__num">${s.num}</div>
        <div class="advies-section__title">${s.title}</div>
      </div>
      <div class="advies-section__body">${s.body}</div>
    </div>
  `).join('');
}

function renderMaatSamenvatting(toets) {
  if (!toets?.maatData || !Object.keys(toets.maatData).length) {
    return '<p style="color:var(--color-text-muted)">Nog geen maatvoeringen ingevuld. Ga naar het <a href="#maatvoeringen" onclick="navigate(\'#maatvoeringen\');return false">maatvoeringsscherm</a> om dit in te vullen.</p>';
  }
  const status = toets.status === 'akkoord'
    ? '<span class="badge badge-success">✓ Akkoord</span>'
    : '<span class="badge badge-error">✗ Strijdig</span>';

  return `
    <p>Algehele toetsstatus: ${status}</p>
    <div class="data-list" style="margin-top:.75rem">
      ${Object.entries(toets.maatData).map(([key, val]) => `
        <div class="data-row">
          <span class="data-row__label">${MAAT_LABELS[key] ?? key}</span>
          <span class="data-row__value">${val}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderActiviteitenSamenvatting(activiteitenIds) {
  if (!activiteitenIds?.length) {
    return '<p style="color:var(--color-text-muted)">Geen activiteiten geselecteerd.</p>';
  }
  return `
    <ul style="list-style:disc;padding-left:1.25rem;line-height:2">
      ${activiteitenIds.map(id => {
        const label = ACTIVITEIT_LABELS[id] ?? id;
        const procedure = id === 'bopa'
          ? ' — Vereist BOPA-procedure (art. 8.0a Ow)'
          : id === 'rijksmonument'
          ? ' — Vereist rijksmonumentenvergunning (erfgoedwet)'
          : '';
        return `<li>${label}${procedure}</li>`;
      }).join('')}
    </ul>
  `;
}

function renderVereistenSamenvatting(activiteitenIds, vereistenData) {
  if (!activiteitenIds?.length) return '<p style="color:var(--color-text-muted)">Geen activiteiten geselecteerd.</p>';

  const geselecteerd = vereistenData.filter(d => activiteitenIds.includes(d.activiteit));
  const verplicht    = geselecteerd.flatMap(g => g.vereisten?.filter(v => v.type === 'verplicht') ?? []);
  const conditioneel = geselecteerd.flatMap(g => g.vereisten?.filter(v => v.type === 'conditioneel') ?? []);

  return `
    <p><strong>Verplicht in te dienen stukken (${verplicht.length}):</strong></p>
    <ul style="list-style:disc;padding-left:1.25rem;line-height:1.8;margin-top:.5rem">
      ${verplicht.map(v => `<li>${v.omschrijving} <span style="color:var(--color-text-muted);font-size:var(--text-xs)">(${v.grondslag})</span></li>`).join('')}
    </ul>
    ${conditioneel.length ? `
      <p style="margin-top:.75rem"><strong>Conditionele stukken (${conditioneel.length}):</strong></p>
      <ul style="list-style:disc;padding-left:1.25rem;line-height:1.8;margin-top:.5rem">
        ${conditioneel.map(v => `<li>${v.omschrijving} <span style="color:var(--color-text-muted);font-size:var(--text-xs)">(${v.grondslag})</span></li>`).join('')}
      </ul>
    ` : ''}
  `;
}

function renderVervolgstappen(toets, activiteitenIds) {
  const stappen = [];
  let n = 1;

  stappen.push({ n: n++, tekst: 'Controleer de volledigheid van het ingediende dossier aan de hand van de bovenstaande vereistenlijst.' });

  if (toets?.status === 'strijdig' || activiteitenIds?.includes('bopa')) {
    stappen.push({ n: n++, tekst: 'Start de BOPA-procedure: vraag aanvullende onderbouwing op (ruimtelijke motivering, toelichting afwijking).' });
  }

  if (activiteitenIds?.includes('rijksmonument') || activiteitenIds?.includes('gemeentelijk-monument')) {
    stappen.push({ n: n++, tekst: 'Vraag advies op bij de omgevingsdienst / RCE voor het monumentenaspect.' });
  }

  stappen.push({ n: n++, tekst: 'Stuur een ontvangstbevestiging aan aanvrager binnen 1 week na indiening (art. 3.1 Awb).' });
  stappen.push({ n: n++, tekst: 'Beoordeel volledigheid dossier. Ontbrekende stukken: aanvultermijn 4 weken (art. 4:5 Awb).' });
  stappen.push({ n: n++, tekst: 'Beslistermijn: 8 weken (eenvoudige gevallen) of 12 weken (uitgebreide procedure). Verdaging max. 6 weken.' });

  return `
    <div class="steps-list">
      ${stappen.map(s => `
        <div class="step-item">
          <div class="step-num">${s.n}</div>
          <div class="step-body">${s.tekst}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderAandachtspunten(toets, activiteitenIds) {
  const punten = [];

  if (toets?.status === 'strijdig') {
    punten.push('⚠️ Er zijn strijdige maatvoeringen geconstateerd. Een afwijkingsprocedure is vereist.');
  }
  if (activiteitenIds?.includes('bopa')) {
    punten.push('📋 BOPA vereist een gedegen ruimtelijke onderbouwing die de afwijking rechtvaardigt.');
  }
  if (activiteitenIds?.includes('rijksmonument')) {
    punten.push('🏰 Rijksmonument: vergunning van het bevoegd gezag (minister OCW) is vereist naast de omgevingsvergunning.');
  }
  if (activiteitenIds?.includes('milieu')) {
    punten.push('🏭 Milieubelastende activiteit: controleer of een milieueffectbeoordeling (MEB) vereist is.');
  }
  if (!toets?.maatData || !Object.keys(toets.maatData ?? {}).length) {
    punten.push('📐 Maatvoeringen zijn nog niet ingevuld. Vul deze in voor een volledige toets.');
  }

  if (!punten.length) {
    return '<p style="color:var(--color-text-muted)">Geen bijzondere aandachtspunten geconstateerd.</p>';
  }

  return `
    <ul style="list-style:none;line-height:2">
      ${punten.map(p => `<li>${p}</li>`).join('')}
    </ul>
  `;
}

function buildAdviestekst(perceel, toets, activiteitenIds, vereistenData) {
  const datum = new Date().toLocaleDateString('nl-NL');
  const geselecteerd = vereistenData.filter(d => activiteitenIds?.includes(d.activiteit));
  const verplicht    = geselecteerd.flatMap(g => g.vereisten?.filter(v => v.type === 'verplicht') ?? []);

  return [
    `AI PLANTOETSER — PLANTOETSADVIES`,
    `Datum: ${datum}`,
    `Adres: ${perceel.weergavenaam ?? '—'}`,
    `Gemeente: ${perceel.gemeente ?? '—'}`,
    ``,
    `=== 1. PERCEEL EN PLAN ===`,
    `Adres: ${perceel.weergavenaam ?? '—'}`,
    `Gemeente: ${perceel.gemeente ?? '—'} (code: ${perceel.gemeentecode ?? '—'})`,
    `Gebruiksdoel: ${(perceel.gebruiksdoel ?? []).join(', ') || '—'}`,
    ``,
    `=== 2. TOETSING MAATVOERINGEN ===`,
    toets?.status ? `Algehele status: ${toets.status.toUpperCase()}` : 'Maatvoeringen niet ingevuld.',
    ...(toets?.maatData ? Object.entries(toets.maatData).map(([k, v]) => `  ${MAAT_LABELS[k] ?? k}: ${v}`) : []),
    ``,
    `=== 3. ACTIVITEITEN ===`,
    ...(activiteitenIds?.map(id => `  - ${ACTIVITEIT_LABELS[id] ?? id}`) ?? ['Geen activiteiten geselecteerd.']),
    ``,
    `=== 4. VERPLICHTE STUKKEN (${verplicht.length}) ===`,
    ...verplicht.map(v => `  - ${v.omschrijving} (${v.grondslag})`),
    ``,
    `=== 5. VERVOLGSTAPPEN ===`,
    `  1. Controleer volledigheid dossier.`,
    ...(toets?.status === 'strijdig' ? ['  2. Start BOPA-procedure.'] : []),
    `  ${toets?.status === 'strijdig' ? 3 : 2}. Stuur ontvangstbevestiging binnen 1 week.`,
    `  ${toets?.status === 'strijdig' ? 4 : 3}. Aanvultermijn ontbrekende stukken: 4 weken (art. 4:5 Awb).`,
    ``,
    `=== 6. AANDACHTSPUNTEN ===`,
    ...(activiteitenIds?.includes('bopa') ? ['  - BOPA vereist ruimtelijke onderbouwing.'] : []),
    ...(activiteitenIds?.includes('rijksmonument') ? ['  - Rijksmonument: afzonderlijke vergunning vereist.'] : []),
    ``,
    `--- Gegenereerd door AI Plantoetser ---`,
  ].join('\n');
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}
