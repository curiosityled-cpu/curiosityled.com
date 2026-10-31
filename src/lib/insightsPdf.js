import { jsPDF } from "jspdf";
import { formatDateShort, isNumericType, summariseByPerson } from "./insightsShared";

const INK = [17, 23, 71];
const BLUE = [2, 2, 255];
const MUTED = [110, 116, 140];
const TRACK = [232, 234, 242];

const SCALE_LABELS = ["Low", "Below avg", "Okay", "Good", "Strong"];
const SCALE_COLORS = [
  [239, 68, 68],
  [245, 158, 11],
  [234, 179, 8],
  [34, 197, 94],
  [16, 185, 129],
];

const TREND_LABELS = {
  improving: "Improving",
  stable: "Stable",
  declining: "Declining",
  insufficient_data: "Insufficient data",
};

const fit = (text, width, fontSize) => {
  const value = String(text == null ? "" : text);
  const maxChars = Math.max(3, Math.floor(width / (fontSize * 0.5)));
  return value.length > maxChars ? `${value.slice(0, maxChars - 3)}...` : value;
};

const distLabel = (entry, key) => {
  if (isNumericType(entry.response_type)) return SCALE_LABELS[parseInt(key, 10) - 1] || key;
  if (entry.response_type === "yes_no") return key === "yes" ? "Yes" : "No";
  return key;
};

const distColor = (entry, key) => {
  if (isNumericType(entry.response_type)) return SCALE_COLORS[parseInt(key, 10) - 1] || [156, 163, 175];
  if (entry.response_type === "yes_no") return key === "yes" ? [34, 197, 94] : [156, 163, 175];
  return BLUE;
};

/** Renders the selected questions into a printable PDF report. */
export function downloadInsightsPdf({
  title,
  scopeLabel,
  periodLabel,
  entries = [],
  insightsByKey = {},
  sessions = [],
  includeSummary = false,
  dateRange,
  filename = "check-in-insights.pdf",
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 42;
  const contentW = pageW - M * 2;

  const ensureSpace = (needed) => {
    if (y + needed > pageH - M) {
      doc.addPage();
      y = M;
    }
  };

  let y = M;

  doc.setFillColor(...BLUE);
  doc.rect(0, 0, pageW, 6, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...INK);
  doc.text(title || "Team Check-in Insights", M, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const meta = [
    scopeLabel,
    periodLabel,
    dateRange && dateRange.total_checkins != null ? `${dateRange.total_checkins} check-ins` : "",
    dateRange && dateRange.earliest ? `${formatDateShort(dateRange.earliest)} - ${formatDateShort(dateRange.latest)}` : "",
    `Generated ${new Date().toLocaleDateString("en-US")}`,
  ].filter(Boolean);
  doc.text(meta.join("   |   "), M, y, { maxWidth: contentW });
  y += 22;

  for (const entry of entries) {
    const insight = insightsByKey[entry.key] || {};
    const trend = insight.trend || [];
    const distribution = Object.entries(insight.distribution || {});

    ensureSpace(140);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(...INK);
    doc.text(fit(entry.label, contentW - 80, 12.5), M, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(entry.type === "measure" ? "Measure" : "Question", pageW - M, y, { align: "right" });
    y += 15;

    const stats = [];
    if (insight.avg != null) {
      stats.push(`${insight.avg_label || "Average"}: ${insight.avg}${isNumericType(entry.response_type) ? "/5" : ""}`);
    }
    stats.push(`Responses: ${insight.response_count || 0}`);
    stats.push(`Trend: ${TREND_LABELS[insight.trend_direction] || TREND_LABELS.stable}`);
    if (entry.first_seen_date) {
      stats.push(`${formatDateShort(entry.first_seen_date)} - ${formatDateShort(entry.last_seen_date)}`);
    }
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(stats.join("   |   "), M, y, { maxWidth: contentW });
    y += 16;

    if (distribution.length > 0) {
      const total = insight.response_count || 0;
      const barX = M + 82;
      const barW = contentW - 82 - 78;
      for (const [key, count] of distribution) {
        const pct = total > 0 ? count / total : 0;
        doc.setFontSize(8.5);
        doc.setTextColor(...MUTED);
        doc.text(fit(distLabel(entry, key), 76, 8.5), M, y + 6);
        doc.setFillColor(...TRACK);
        doc.rect(barX, y, barW, 7, "F");
        doc.setFillColor(...distColor(entry, key));
        doc.rect(barX, y, Math.max(barW * pct, pct > 0 ? 2 : 0), 7, "F");
        doc.setTextColor(...INK);
        doc.text(`${count} (${Math.round(pct * 100)}%)`, pageW - M, y + 6, { align: "right" });
        y += 12;
      }
      y += 6;
    }

    if (trend.length > 1) {
      ensureSpace(80);
      const chartH = 60;
      const maxValue = entry.response_type === "yes_no" ? 1 : Math.max(5, ...trend.map((t) => t.value));
      doc.setDrawColor(...TRACK);
      doc.line(M, y + chartH, M + contentW, y + chartH);

      const points = trend.map((point, i) => ({
        x: M + (i / (trend.length - 1)) * contentW,
        y: y + chartH - (maxValue > 0 ? (point.value / maxValue) * chartH : 0),
      }));
      doc.setDrawColor(...BLUE);
      doc.setLineWidth(1.2);
      for (let i = 1; i < points.length; i++) {
        doc.line(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
      }
      doc.setFillColor(...BLUE);
      points.forEach((point) => doc.circle(point.x, point.y, 1.6, "F"));
      doc.setLineWidth(1);
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(formatDateShort(trend[0].date), M, y + chartH + 11);
      doc.text(formatDateShort(trend[trend.length - 1].date), M + contentW, y + chartH + 11, { align: "right" });
      y += chartH + 26;
    } else {
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text("No trend data in this period.", M, y + 6);
      y += 20;
    }

    y += 10;
  }

  if (includeSummary && sessions.length > 0) {
    const people = summariseByPerson(sessions, entries);
    ensureSpace(70);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...INK);
    doc.text("Team summary", M, y);
    y += 13;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Average for numeric questions, number of responses for other questions.", M, y);
    y += 12;

    const personW = 118;
    const checkinsW = 52;
    const restW = contentW - personW - checkinsW;
    const colW = entries.length > 0 ? restW / entries.length : 0;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text("Person", M, y);
    doc.text("Check-ins", M + personW, y);
    entries.forEach((entry, i) => {
      doc.text(fit(entry.label, colW - 6, 8.5), M + personW + checkinsW + i * colW, y);
    });
    y += 5;
    doc.setDrawColor(...TRACK);
    doc.line(M, y, pageW - M, y);
    y += 12;

    doc.setFont("helvetica", "normal");
    for (const person of people) {
      ensureSpace(16);
      doc.setTextColor(...INK);
      doc.text(fit(person.name, personW - 6, 8.5), M, y);
      doc.setTextColor(...MUTED);
      doc.text(String(person.checkins), M + personW, y);
      person.cells.forEach((cell, i) => {
        doc.text(String(cell == null ? "" : cell), M + personW + checkinsW + i * colW, y);
      });
      y += 13;
    }
  }

  const pages = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`${page} / ${pages}`, pageW - M, pageH - 18, { align: "right" });
  }

  doc.save(filename);
}