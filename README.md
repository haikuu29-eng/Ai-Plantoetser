# AI Plantoetser

**Perceel-specifieke planregeltoets voor omgevingsvergunningen**

Progressive Web App voor gemeentelijke casemanagers vergunningen. Werkt op Mac (Chrome/Safari) en iPad. Presentatie-waardig ontwerp.

---

## Snel starten

### Mac — Chrome

```bash
cd ai-plantoetser
python3 -m http.server 8080
```

Open `http://localhost:8080` in Chrome. Chrome toont een installatieknop in de adresbalk voor standalone gebruik.

### iPad — Chrome of Safari

1. Zorg dat Mac en iPad op hetzelfde netwerk zitten
2. Start de server: `python3 -m http.server 8080`
3. Bepaal het lokale IP-adres van je Mac: `ipconfig getifaddr en0`
4. Open op de iPad: `http://<mac-ip>:8080`
5. **Chrome**: menu (⋮) → "Toevoegen aan beginscherm"
6. **Safari**: Deelknop → "Zet op beginscherm"

De app verschijnt als **AI Plantoetser** op het homescreen en werkt zonder browser-chrome.

---

## Cloudflare Worker configureren (vereist voor planregeldata)

De Ruimtelijke Plannen API v4 vereist authenticatie via een Cloudflare Worker proxy.

### Stap 1 — Worker deployen (±7 minuten)

1. Ga naar **cloudflare.com** en maak een gratis account aan (geen creditcard vereist)
2. Dashboard → **Workers & Pages** → **Create Application** → **Worker** → **Create Worker**
3. Verwijder de voorbeeldcode volledig
4. Plak de inhoud van `cloudflare-worker.js`
5. Klik **Save and Deploy**
6. Kopieer de Worker-URL (bijv. `https://ai-plantoetser.12345.workers.dev`)

### Stap 2 — API-sleutel instellen als Worker-variabele

1. Ga naar jouw Worker → **Settings** → **Variables**
2. Voeg toe:
   - **Name:** `RP_API_KEY`
   - **Value:** jouw API-sleutel van de Ruimtelijke Plannen API
   - Vink **"Encrypt"** aan
3. Klik **Save and deploy**

### Stap 3 — Worker-URL invullen in de app

Open `js/api/omgevingsplan.js` en vervang regel 1:

```javascript
const WORKER_URL = 'https://ai-plantoetser.12345.workers.dev';
```

Sla op en herlaad de app.

---

## Keyboard shortcuts (Mac)

| Shortcut | Actie |
|---|---|
| `Cmd+K` | Focust de zoekbalk |
| `Cmd+D` | Navigeert naar dashboard |
| `Cmd+P` | PDF-export (in het adviesscherm) |
| `Escape` | Sluit dropdown / sidebar |

---

## Bekende beperkingen

### API en data

| Beperking | Uitleg |
|---|---|
| Geen geo-filter via `GET /plannen` | De API v4 ondersteunt geografisch zoeken alleen via `POST /plannen/_zoek`. De app gebruikt dit correct. |
| `gekoppeld_perceel_identificatie` niet beschikbaar | PDOK Locatieserver geeft dit veld niet terug. Kadasterperceel-ID's worden niet getoond. |
| Maatvoeringen niet altijd gedigitaliseerd | Veel gemeenten leveren maatvoeringen als XHTML-tekst aan, niet als gestructureerde JSON. De app signaleert dit en wijst door naar ruimtelijkeplannen.nl. |
| DSO/Omgevingsplan vereist Worker | Alle aanroepen naar de Ruimtelijke Plannen API v4 verlopen via de Cloudflare Worker vanwege CORS en authenticatie. |
| Offline: planregels 24u gecached | Na 24 uur vervalt de cache en is internetverbinding opnieuw nodig. |

### Platforms

| Platform | Beperking |
|---|---|
| Safari op Mac | Service Worker ondersteund, maar PWA-installatie via "Zet op beginscherm" werkt alleen op iOS Safari. |
| Lokale file:// | De app werkt **niet** via `file://`. Altijd via een lokale server starten (`python3 -m http.server`). |

---

## Projectstructuur

```
ai-plantoetser/
├── index.html              ← Enige HTML-ingang, hash-routing
├── manifest.json           ← PWA manifest
├── service-worker.js       ← Offline caching (cache-first)
├── cloudflare-worker.js    ← Proxy voor Ruimtelijke Plannen API v4
├── assets/
│   ├── icons/              ← icon-192.png + icon-512.png
│   └── logo.svg            ← SVG logo (perceel + vinkje)
├── css/
│   ├── base.css            ← Reset + design tokens + typografie
│   ├── components.css      ← Herbruikbare componenten
│   └── views.css           ← Schermspecifieke stijlen
└── js/
    ├── app.js              ← Bootstrap + SW registratie + shortcuts
    ├── router.js           ← Hash-based routing
    ├── db/
    │   ├── database.js     ← IndexedDB wrapper + helpers
    │   └── schema.js       ← Tabeldefinities
    ├── api/
    │   ├── pdok.js         ← PDOK Locatieserver (geen auth)
    │   ├── ruimtelijke-plannen.js ← RP API v4 via Worker
    │   └── omgevingsplan.js ← Worker-URL configuratie
    ├── views/
    │   ├── dashboard.js    ← KPI's + recente toetsen
    │   ├── zoeken.js       ← Adreszoeken + autocomplete
    │   ├── planregels.js   ← Bestemmingsplannen + vlakken
    │   ├── maatvoeringen.js ← Toetsingstabel
    │   ├── activiteiten.js ← Activiteitenselectie
    │   ├── vereisten.js    ← Indieningsvereisten
    │   └── advies.js       ← Adviesgeneratie + PDF-export
    ├── data/
    │   ├── indieningsvereisten.json ← 10 activiteiten, 70+ vereisten
    │   └── bbl-artikelen.json       ← 50 BBL-artikelen
    └── utils/
        ├── coords.js       ← WGS84 ↔ RD New (proj4js)
        └── pdf.js          ← PDF-export via jsPDF
```

---

## Versiehistorie

| Versie | Datum | Wijzigingen |
|---|---|---|
| 1.0.0 | 2026-04-03 | Initiële release — alle 7 schermen, PWA, PDF-export, Worker proxy |
