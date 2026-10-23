import { summariseByPerson } from "./insightsShared";

const escapeCell = (value) => {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const row = (cells) => cells.map(escapeCell).join(",");

/**
 * Builds the insights CSV: the trend behind each selected question, plus the
 * individual check-in sessions and the team summary when those are selected.
 */
export function buildInsightsCsv({
  entries = [],
  insightsByKey = {},
  sessions = [],
  includeSessions = true,
  includeSummary = true,
  periodLabel = "",
}) {
  const lines = [];

  lines.push(row(["Team check-in insights"]));
  lines.push(row(["Period", periodLabel]));
  lines.push(row(["Generated", new Date().toLocaleString("en-US")]));
  lines.push("");

  lines.push(row(["Trend by question"]));
  lines.push(row(["Question", "Kind", "Date", "Average", "Responses"]));
  for (const entry of entries) {
    const insight = insightsByKey[entry.key] || {};
    const trend = insight.trend || [];
    const kind = entry.type === "measure" ? "Measure" : "Question";
    if (trend.length === 0) {
      lines.push(row([entry.label, kind, "No data in this period", "", ""]));
    }
    for (const point of trend) {
      lines.push(row([entry.label, kind, point.date, point.value, point.count]));
    }
  }

  if (includeSessions) {
    lines.push("");
    lines.push(row(["Individual check-in sessions"]));
    lines.push(row(["Date", "Session", "Person", "Email", ...entries.map((e) => e.label)]));
    for (const session of sessions) {
      lines.push(
        row([
          session.date,
          session.session,
          session.name,
          session.email,
          ...entries.map((e) => (session.answers ? session.answers[e.key] : "") ?? ""),
        ])
      );
    }
  }

  if (includeSummary) {
    lines.push("");
    lines.push(row(["Team summary by person"]));
    lines.push(row(["Numeric questions show the average; other questions show the number of responses."]));
    lines.push(row(["Person", "Email", "Check-ins", ...entries.map((e) => e.label)]));
    for (const person of summariseByPerson(sessions, entries)) {
      lines.push(row([person.name, person.email, person.checkins, ...person.cells]));
    }
  }

  return lines.join("\n");
}