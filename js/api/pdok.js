// AI Plantoetser — pdok.js
// PDOK Locatieserver v3.1 — vrij toegankelijk, geen CORS-probleem

const BASE = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1';

/**
 * Typeahead suggestions na min. 2 tekens.
 * @param {string} q
 * @returns {Promise<Array>}
 */
export async function suggest(q) {
  if (!q || q.trim().length < 2) return [];
  const url = `${BASE}/suggest?q=${encodeURIComponent(q)}&rows=5&fq=type:(adres OR woonplaats OR weg)`;
  const res  = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const docs  = data?.response?.docs ?? [];
  const hl    = data?.highlighting ?? {};
  return docs.map(d => ({
    id:        d.id,
    label:     hl[d.id]?.suggest?.[0]
               ? hl[d.id].suggest[0].replace(/<\/?b>/g, '')
               : d.weergavenaam,
    highlight: hl[d.id]?.suggest?.[0] ?? d.weergavenaam,
    type:      d.type,
  }));
}

/**
 * Volledige adresopzoeking — geeft één resultaatobject terug.
 * @param {string} q  Vrije tekstinvoer
 * @returns {Promise<Object|null>}
 */
export async function lookupAddress(q) {
  const url = `${BASE}/free?q=${encodeURIComponent(q)}&rows=1` +
    `&fl=id,weergavenaam,straatnaam,huisnummer,huisletter,huisnummertoevoeging,` +
    `postcode,woonplaatsnaam,centroide_rd,centroide_ll,` +
    `gemeentenaam,gemeentecode,` +
    `gekoppeld_perceel_identificatie,kadastrale_gemeente,` +
    `adresseerbaarobjectid,bouwjaar,oppervlakte_min,oppervlakte_max,gebruiksdoel`;
  const res  = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const doc  = data?.response?.docs?.[0];
  if (!doc) return null;

  const rdMatch  = doc.centroide_rd?.match(/POINT\(([^ ]+) ([^ )]+)\)/);
  const llMatch  = doc.centroide_ll?.match(/POINT\(([^ ]+) ([^ )]+)\)/);

  return {
    id:             doc.id,
    weergavenaam:   doc.weergavenaam,
    straatnaam:     doc.straatnaam,
    huisnummer:     doc.huisnummer,
    huisletter:     doc.huisletter ?? '',
    toevoeging:     doc.huisnummertoevoeging ?? '',
    postcode:       doc.postcode,
    woonplaats:     doc.woonplaatsnaam,
    gemeente:       doc.gemeentenaam,
    gemeentecode:   doc.gemeentecode,
    adresseerbaarObjectId: doc.adresseerbaarobjectid,
    bouwjaar:       doc.bouwjaar,
    oppervlakte:    doc.oppervlakte_min ?? doc.oppervlakte_max,
    gebruiksdoel:   doc.gebruiksdoel ?? [],
    perceelRef:     doc.gekoppeld_perceel_identificatie ?? null,
    rd: rdMatch ? { x: parseFloat(rdMatch[1]), y: parseFloat(rdMatch[2]) } : null,
    ll: llMatch ? { lon: parseFloat(llMatch[1]), lat: parseFloat(llMatch[2]) } : null,
  };
}

/**
 * Lookup via het specifieke id (uit suggest resultaat).
 */
export async function lookupById(id) {
  const url = `${BASE}/lookup?id=${encodeURIComponent(id)}` +
    `&fl=id,weergavenaam,straatnaam,huisnummer,huisletter,huisnummertoevoeging,` +
    `postcode,woonplaatsnaam,centroide_rd,centroide_ll,` +
    `gemeentenaam,gemeentecode,adresseerbaarobjectid,bouwjaar,oppervlakte_min,oppervlakte_max,gebruiksdoel`;
  const res  = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const doc  = data?.response?.docs?.[0];
  if (!doc) return null;

  const rdMatch  = doc.centroide_rd?.match(/POINT\(([^ ]+) ([^ )]+)\)/);
  const llMatch  = doc.centroide_ll?.match(/POINT\(([^ ]+) ([^ )]+)\)/);

  return {
    id:             doc.id,
    weergavenaam:   doc.weergavenaam,
    straatnaam:     doc.straatnaam,
    huisnummer:     doc.huisnummer,
    huisletter:     doc.huisletter ?? '',
    toevoeging:     doc.huisnummertoevoeging ?? '',
    postcode:       doc.postcode,
    woonplaats:     doc.woonplaatsnaam,
    gemeente:       doc.gemeentenaam,
    gemeentecode:   doc.gemeentecode,
    adresseerbaarObjectId: doc.adresseerbaarobjectid,
    bouwjaar:       doc.bouwjaar,
    oppervlakte:    doc.oppervlakte_min ?? doc.oppervlakte_max,
    gebruiksdoel:   doc.gebruiksdoel ?? [],
    rd: rdMatch ? { x: parseFloat(rdMatch[1]), y: parseFloat(rdMatch[2]) } : null,
    ll: llMatch ? { lon: parseFloat(llMatch[1]), lat: parseFloat(llMatch[2]) } : null,
  };
}
