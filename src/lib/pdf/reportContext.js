/**
 * One report header for every exported PDF.
 *
 * Clients could not tell what an exported PDF covered: whether a check-in report
 * was one person, a manager's direct reports or a whole vertical, or which dates
 * and filters produced the numbers. Every exporter now describes itself the same
 * way — report title, what kind of report it is, the view it was taken from, the
 * subject or audience it covers, the timeframe, active filters, what is included,
 * who generated it and when.
 *
 * Only values the caller actually has are rendered; a missing field is left out
 * rather than invented. Geometry is expressed in points and converted to the
 * document's own unit, so the same header works on a point-based page and on the
 * millimetre default.
 */

const INK = [17, 23, 71];
const BLUE = [2, 2, 255];
const MUTED = [110, 116, 140];
const RULE = [226, 229, 240];

const clean = (value) => (value == null ? "" : String(value).trim());

const normalizeFilters = (filters) => {
  if (!filters) return [];
  const pairs = Array.isArray(filters)
    ? filters
    : Object.entries(filters).map(([label, value]) => ({ label, value }));
  return pairs
    .map((filter) => ({ label: clean(filter.label || filter.key), value: clean(filter.value) }))
    .filter((filter) => filter.label && filter.value);
};

/** Normalises whatever a view knows about its export into one report context. */
export function buildReportContext(input = {}) {
  const generated = input.generatedAt ? new Date(input.generatedAt) : new Date();
  return {
    title: clean(input.title) || "Report",
    reportType: clean(input.reportType),
    view: clean(input.view),
    subject: clean(input.subject),
    timeframe: clean(input.timeframe),
    filters: normalizeFilters(input.filters),
    selection: clean(input.selection),
    preparedBy: clean(input.preparedBy),
    generatedAt: generated.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    note: clean(input.note),
  };
}

/** The context as label/value pairs, empty values dropped. */
export function reportContextRows(context) {
  return [
    ["View", context.view],
    ["Subject", context.subject],
    ["Timeframe", context.timeframe],
    ["Filters", context.filters.map((filter) => `${filter.label}: ${filter.value}`).join("   ·   ")],
    ["Included", context.selection],
    ["Prepared by", context.preparedBy],
    ["Generated", context.generatedAt],
  ].filter(([, value]) => clean(value));
}

const pointsPerUnit = (doc) => {
  const factor = doc?.internal?.scaleFactor;
  return factor && factor > 0 ? factor : 1;
};

const truncate = (doc, text, width) => {
  const value = clean(text);
  if (!width || doc.getTextWidth(value) <= width) return value;
  let out = value;
  while (out.length > 4 && doc.getTextWidth(`${out}…`) > width) out = out.slice(0, -1);
  return `${out}…`;
};

/**
 * Draws the report header at the top of the page and returns the y position
 * where the report body can start.
 */
export function drawReportHeader(doc, context, options = {}) {
  const pageW = doc.internal.pageSize.getWidth();
  const P = (pt) => pt / pointsPerUnit(doc);
  const lineHeight = (size) => P(size * 1.18);
  const margin = options.margin != null ? options.margin : P(40);
  const contentW = pageW - margin * 2;

  doc.setFillColor(...BLUE);
  doc.rect(0, 0, pageW, P(5), "F");

  let baseline = margin + P(16);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...INK);
  const titleLines = doc.splitTextToSize(context.title, contentW);
  doc.text(titleLines, margin, baseline);
  baseline += (titleLines.length - 1) * lineHeight(17);

  if (context.reportType) {
    baseline += lineHeight(8) + P(3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BLUE);
    doc.text(context.reportType.toUpperCase(), margin, baseline);
  }

  const rows = reportContextRows(context);
  if (rows.length) {
    baseline += P(11);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.5);
    doc.line(margin, baseline, pageW - margin, baseline);
    baseline += P(12);

    const labelW = P(76);
    for (const [label, value] of rows) {
      const lines = doc.splitTextToSize(String(value), contentW - labelW);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(label.toUpperCase(), margin, baseline);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...INK);
      doc.text(lines, margin + labelW, baseline);
      baseline += Math.max(1, lines.length) * lineHeight(8.5) + P(3.5);
    }

    baseline += P(2);
    doc.setDrawColor(...RULE);
    doc.line(margin, baseline, pageW - margin, baseline);
  }

  if (context.note) {
    baseline += P(13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const noteLines = doc.splitTextToSize(context.note, contentW);
    doc.text(noteLines, margin, baseline);
    baseline += (noteLines.length - 1) * lineHeight(8);
  }

  return baseline + P(20);
}

/** A section title inside the report, optionally with a line explaining it. */
export function drawSectionHeading(doc, heading, baseline, options = {}) {
  const pageW = doc.internal.pageSize.getWidth();
  const P = (pt) => pt / pointsPerUnit(doc);
  const lineHeight = (size) => P(size * 1.18);
  const margin = options.margin != null ? options.margin : P(40);
  const contentW = pageW - margin * 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(options.size || 12.5);
  doc.setTextColor(...INK);
  doc.text(truncate(doc, heading, contentW), margin, baseline);
  let next = baseline + lineHeight(options.size || 12.5) + P(3);

  if (options.note) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const noteLines = doc.splitTextToSize(options.note, contentW);
    doc.text(noteLines, margin, next);
    next += (noteLines.length - 1) * lineHeight(8);
  }

  return next + P(10);
}

/**
 * States the report's identity on every page, so a page shared on its own still
 * says what it belongs to. Call once, after all content is written.
 */
export function drawReportFooter(doc, context, options = {}) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const P = (pt) => pt / pointsPerUnit(doc);
  const margin = options.margin != null ? options.margin : P(40);
  const contentW = pageW - margin * 2;
  const pages = doc.internal.getNumberOfPages();
  const contextLine = [context.title, context.view, context.timeframe]
    .filter(Boolean)
    .join("   ·   ");
  const pageLabelWidth = P(70);

  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    const baseline = pageH - P(18);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.5);
    doc.line(margin, baseline - P(10), pageW - margin, baseline - P(10));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(truncate(doc, contextLine, contentW - pageLabelWidth), margin, baseline);
    doc.text(`Page ${page} of ${pages}`, pageW - margin, baseline, { align: "right" });
  }
}