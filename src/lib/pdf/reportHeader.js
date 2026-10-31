/**
 * One header standard for every PDF the platform exports.
 *
 * A report handed to a client has to answer three questions before any data
 * appears: what it is, whose data it covers, and which period it covers. The
 * "whose data" part is the one people get wrong — a check-in report can be
 * about me, one individual, my direct reports, my whole vertical, or the
 * organisation, and the numbers mean something different in each case.
 *
 * So every PDF opens with:
 *   eyebrow      product area / report family
 *   title        what the report is
 *   subtitle     one sentence on what it answers
 *   scope panel  the facts the reader needs to read the numbers correctly —
 *                data scope, people counted, audience filter, period, generated
 *
 * and closes every page with a footer that repeats the report name and scope
 * line, so a printed page out of context still says what it is.
 *
 * Colours match the app's report palette (ink #111747, accent #0202ff).
 * Functions are unit-aware: pass units: "mm" for an A4 mm document.
 */

const ACCENT = [2, 2, 255];
const INK = [17, 23, 71];
const MUTED = [110, 116, 140];
const RULE = [226, 228, 240];
const TINT = [245, 247, 252];

const unitFactor = (units) => (units === "mm" ? 0.352778 : 1);

const fitText = (doc, text, maxWidth) => {
  const value = String(text == null ? "" : text);
  if (!value) return "";
  if (doc.getTextWidth(value) <= maxWidth) return value;
  let trimmed = value;
  while (trimmed.length > 4 && doc.getTextWidth(`${trimmed}...`) > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed.trim()}...`;
};

/**
 * A tinted panel of label/value rows stating what the report covers.
 * Returns the y position just below the panel.
 */
export function drawScopePanel(doc, { rows = [], title = "What this report covers", x, y, width, units = "pt" }) {
  const visible = (rows || []).filter((row) => row && row.value != null && String(row.value).trim() !== "");
  if (visible.length === 0) return y;

  const u = unitFactor(units);
  const padX = 12 * u;
  const padTop = 10 * u;
  const labelW = Math.min(104 * u, width * 0.32);
  const valueX = x + padX + labelW;
  const valueW = width - padX * 2 - labelW;
  const lineH = 10.4 * u;
  const rowGap = 3.4 * u;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  const measured = visible.map((row) => ({
    label: String(row.label || "").toUpperCase(),
    lines: doc.splitTextToSize(String(row.value).trim(), valueW).slice(0, 3),
  }));

  const rowsH = measured.reduce((sum, row) => sum + Math.max(1, row.lines.length) * lineH + rowGap, 0);
  const height = padTop + 11 * u + 5 * u + rowsH + 7 * u;

  doc.setFillColor(...TINT);
  doc.roundedRect(x, y, width, height, 5 * u, 5 * u, "F");
  doc.setFillColor(...ACCENT);
  doc.rect(x, y + 3 * u, 2.4 * u, height - 6 * u, "F");
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.6 * u);
  doc.roundedRect(x, y, width, height, 5 * u, 5 * u, "S");

  let cursor = y + padTop + 4 * u;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...ACCENT);
  doc.setCharSpace(0.9);
  doc.text(String(title).toUpperCase(), x + padX, cursor);
  doc.setCharSpace(0);
  cursor += 11 * u;

  for (const row of measured) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.1);
    doc.setTextColor(...MUTED);
    doc.text(row.label, x + padX, cursor + 6 * u);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.6);
    doc.setTextColor(...INK);
    row.lines.forEach((line, i) => doc.text(line, valueX, cursor + 6 * u + i * lineH));

    cursor += Math.max(1, row.lines.length) * lineH + rowGap;
  }

  return y + height;
}

/**
 * The masthead: accent bar, eyebrow, title, subtitle, then the scope panel.
 * Returns the y position where the report body should start.
 */
export function drawReportHeader(doc, {
  eyebrow = "Curiosity Led",
  title = "Report",
  subtitle = "",
  badge = "Confidential",
  scopeRows = [],
  scopeTitle = "What this report covers",
  units = "pt",
  margin,
} = {}) {
  const u = unitFactor(units);
  const pageW = doc.internal.pageSize.getWidth();
  const M = margin != null ? margin : 42 * u;
  const contentW = pageW - M * 2;

  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, pageW, 5 * u, "F");

  let y = 21 * u;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(...ACCENT);
  doc.setCharSpace(1.1);
  doc.text(String(eyebrow).toUpperCase(), M, y);
  doc.setCharSpace(0);

  if (badge) {
    const badgeText = String(badge).toUpperCase();
    doc.setFontSize(6.6);
    const textW = doc.getTextWidth(badgeText);
    const chipW = textW + 12 * u;
    const chipH = 11 * u;
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.6 * u);
    doc.roundedRect(pageW - M - chipW, y - 8 * u, chipW, chipH, 5.5 * u, 5.5 * u, "S");
    doc.setTextColor(...MUTED);
    doc.setCharSpace(0.8);
    doc.text(badgeText, pageW - M - chipW / 2, y, { align: "center" });
    doc.setCharSpace(0);
    doc.setLineWidth(1);
  }

  y += 17 * u;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...INK);
  const titleLines = doc.splitTextToSize(String(title || "Report"), contentW).slice(0, 2);
  titleLines.forEach((line) => {
    doc.text(line, M, y);
    y += 19 * u;
  });

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.2);
    doc.setTextColor(...MUTED);
    const subLines = doc.splitTextToSize(String(subtitle), contentW * 0.94).slice(0, 3);
    subLines.forEach((line) => {
      doc.text(line, M, y);
      y += 11.6 * u;
    });
  }

  y += 7 * u;
  y = drawScopePanel(doc, { rows: scopeRows, title: scopeTitle, x: M, y, width: contentW, units });

  return y + 18 * u;
}

/**
 * Footer on every page: report name and scope repeated, plus the page number.
 * Call once, after every page has been written.
 */
export function drawReportFooters(doc, { reportName = "Report", scopeLine = "", units = "pt", margin } = {}) {
  const u = unitFactor(units);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = margin != null ? margin : 42 * u;
  const total = doc.internal.getNumberOfPages();
  const left = [reportName, scopeLine].filter(Boolean).join("   ·   ");

  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.6 * u);
    doc.line(M, pageH - 26 * u, pageW - M, pageH - 26 * u);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(fitText(doc, left, pageW - M * 2 - 52 * u), M, pageH - 15 * u);
    doc.text(`Page ${page} of ${total}`, pageW - M, pageH - 15 * u, { align: "right" });
  }
}