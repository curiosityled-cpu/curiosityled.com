/**
 * One report header for every exported PDF, on the server side.
 *
 * An exported PDF has to say what it covers before it says anything else: which
 * view produced it, whose data it holds, over what dates, with which filters
 * applied, who generated it and when. Every backend exporter builds that context
 * here and draws it with the same restrained hierarchy, so a reader can tell a
 * single person's assessment from an organisation-wide report at a glance.
 *
 * Only values the exporting function actually has are rendered — a missing
 * field is omitted, never guessed. Geometry is declared in points and converted
 * to the document's unit, so the header lands correctly on both the point-based
 * reports and the millimetre default.
 */

const INK = [17, 23, 71];
const BLUE = [2, 2, 255];
const MUTED = [110, 116, 140];
const RULE = [226, 229, 240];

export interface ReportFilter {
  label: string;
  value: string;
}

export interface ReportContextInput {
  title: string;
  reportType?: string;
  view?: string;
  subject?: string;
  timeframe?: string;
  filters?: ReportFilter[] | Record<string, unknown> | null;
  selection?: string;
  preparedBy?: string;
  generatedAt?: string | Date | null;
  note?: string;
}

export interface ReportContext {
  title: string;
  reportType: string;
  view: string;
  subject: string;
  timeframe: string;
  filters: ReportFilter[];
  selection: string;
  preparedBy: string;
  generatedAt: string;
  note: string;
}

const clean = (value: unknown): string => (value == null ? "" : String(value).trim());

const normalizeFilters = (filters: ReportContextInput["filters"]): ReportFilter[] => {
  if (!filters) return [];
  const pairs = Array.isArray(filters)
    ? filters
    : Object.entries(filters).map(([label, value]) => ({ label, value }));
  return pairs
    .map((filter: any) => ({
      label: clean(filter?.label ?? filter?.key),
      value: clean(filter?.value),
    }))
    .filter((filter) => filter.label && filter.value);
};

/** Normalises whatever an exporter knows about its own report into one context. */
export function buildReportContext(input: ReportContextInput): ReportContext {
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
export function reportContextRows(context: ReportContext): [string, string][] {
  const rows: [string, string][] = [
    ["View", context.view],
    ["Subject", context.subject],
    ["Timeframe", context.timeframe],
    ["Filters", context.filters.map((filter) => `${filter.label}: ${filter.value}`).join("   ·   ")],
    ["Included", context.selection],
    ["Prepared by", context.preparedBy],
    ["Generated", context.generatedAt],
  ];
  return rows.filter(([, value]) => clean(value));
}

const pointsPerUnit = (doc: any): number => {
  const factor = doc?.internal?.scaleFactor;
  return factor && factor > 0 ? factor : 1;
};

const truncate = (doc: any, text: unknown, width: number): string => {
  const value = clean(text);
  if (!width || doc.getTextWidth(value) <= width) return value;
  let out = value;
  while (out.length > 4 && doc.getTextWidth(`${out}…`) > width) out = out.slice(0, -1);
  return `${out}…`;
};

/**
 * Draws the report header at the top of the current page and returns the y
 * position where the report body can start.
 */
export function drawReportHeader(doc: any, context: ReportContext, options: { margin?: number } = {}): number {
  const pageW = doc.internal.pageSize.getWidth();
  const P = (pt: number) => pt / pointsPerUnit(doc);
  const lineHeight = (size: number) => P(size * 1.18);
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
export function drawSectionHeading(
  doc: any,
  heading: string,
  baseline: number,
  options: { margin?: number; note?: string; size?: number } = {},
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const P = (pt: number) => pt / pointsPerUnit(doc);
  const lineHeight = (size: number) => P(size * 1.18);
  const margin = options.margin != null ? options.margin : P(40);
  const contentW = pageW - margin * 2;
  const size = options.size || 12.5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(size);
  doc.setTextColor(...INK);
  doc.text(truncate(doc, heading, contentW), margin, baseline);
  let next = baseline + lineHeight(size) + P(3);

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
export function drawReportFooter(doc: any, context: ReportContext, options: { margin?: number } = {}): void {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const P = (pt: number) => pt / pointsPerUnit(doc);
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