// AI Plantoetser — pdf.js
// PDF export via jsPDF CDN

function getJsPDF() {
  if (typeof window !== 'undefined' && window.jspdf?.jsPDF) {
    return window.jspdf.jsPDF;
  }
  return null;
}

/**
 * Genereer en download een advies-PDF.
 * @param {Object} opts
 * @param {Object} opts.perceel
 * @param {string} opts.adviestekst   Platte tekst (zonder HTML)
 * @param {string} opts.datum         ISO-datumstring
 */
export async function downloadAdviesPDF({ perceel, adviestekst, datum }) {
  const JsPDF = getJsPDF();
  if (!JsPDF) {
    alert('PDF-bibliotheek nog niet geladen. Probeer het opnieuw.');
    return;
  }

  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;

  // ── Header balk ──
  doc.setFillColor(1, 105, 111); // --color-primary
  doc.rect(0, 0, pageW, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('AI Plantoetser', margin, 10);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Perceel-specifieke planregeltoets voor omgevingsvergunningen', margin, 16);
  doc.text(`Gegenereerd: ${formatDate(datum)}`, pageW - margin, 10, { align: 'right' });

  // ── Perceelgegevens ──
  let y = 34;
  doc.setTextColor(30, 28, 23);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Perceelgegevens', margin, y);
  y += 2;
  doc.setLineWidth(0.3);
  doc.setDrawColor(1, 105, 111);
  doc.line(margin, y, margin + 60, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 28, 23);

  const rows = [
    ['Adres',           perceel.weergavenaam ?? '—'],
    ['Woonplaats',      perceel.woonplaats   ?? '—'],
    ['Postcode',        perceel.postcode     ?? '—'],
    ['Gemeente',        perceel.gemeente     ?? '—'],
    ['RD-coördinaten',  perceel.rd ? `${Math.round(perceel.rd.x)} / ${Math.round(perceel.rd.y)}` : '—'],
    ['WGS84',           perceel.ll ? `${perceel.ll.lat.toFixed(5)}°N  ${perceel.ll.lon.toFixed(5)}°E` : '—'],
  ];

  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(116, 114, 109);
    doc.text(label + ':', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 28, 23);
    doc.text(String(value), margin + 42, y);
    y += 6;
  });

  y += 4;

  // ── Adviestekst ──
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 28, 23);
  doc.text('Plantoetsadvies', margin, y);
  y += 2;
  doc.setDrawColor(1, 105, 111);
  doc.line(margin, y, margin + 60, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 48, 43);

  const lines = doc.splitTextToSize(adviestekst, contentW);
  lines.forEach(line => {
    if (y > pageH - 20) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, margin, y);
    y += 5;
  });

  // ── Footer ──
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(176, 174, 169);
    doc.text(
      `AI Plantoetser  ·  Pagina ${i} van ${totalPages}  ·  ${formatDate(datum)}`,
      pageW / 2,
      pageH - 8,
      { align: 'center' }
    );
  }

  // ── Download ──
  const straat = (perceel.straatnaam ?? 'adres').replace(/\s+/g, '_');
  const hnr    = perceel.huisnummer ?? '';
  const datumStr = datum ? datum.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const filename = `Advies_${straat}_${hnr}_${datumStr}.pdf`;

  doc.save(filename);
}

function formatDate(iso) {
  if (!iso) return new Date().toLocaleDateString('nl-NL');
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}
