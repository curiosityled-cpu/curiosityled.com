export const DATE_RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "All time" },
];

export function rangeLabel(days) {
  const match = DATE_RANGES.find((r) => r.days === days);
  return match ? match.label : `Last ${days} days`;
}

export function formatDateShort(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** YYYY-MM-DD for a date input, in the viewer's local time. */
export function toDateInput(date) {
  const shifted = new Date(new Date(date).getTime() - new Date(date).getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 10);
}

/** Prefills the custom picker with the window currently on screen. */
export function defaultCustomRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return { start: toDateInput(start), end: toDateInput(end) };
}

export function formatRangeLabel(start, end) {
  const format = (value) =>
    new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  return `${format(start)} — ${format(end)}`;
}

export const isNumericType = (responseType) =>
  responseType === "measure" || responseType === "number" || responseType === "scale_1_5";

/** Groups raw session rows per person for the team summary exports. */
export function summariseByPerson(sessions, entries) {
  const people = new Map();

  for (const session of sessions || []) {
    const key = (session.email || session.name || "unknown").toLowerCase();
    if (!people.has(key)) {
      people.set(key, {
        name: session.name || session.email,
        email: session.email || "",
        checkins: 0,
        values: {},
      });
    }
    const person = people.get(key);
    person.checkins += 1;

    for (const entry of entries) {
      const raw = session.answers ? session.answers[entry.key] : undefined;
      if (raw === "" || raw == null) continue;
      if (!person.values[entry.key]) person.values[entry.key] = { sum: 0, count: 0, responses: 0 };
      const bucket = person.values[entry.key];
      const numeric = Number(raw);
      if (isNumericType(entry.response_type) && !isNaN(numeric)) {
        bucket.sum += numeric;
        bucket.count += 1;
      }
      bucket.responses += 1;
    }
  }

  return [...people.values()].map((person) => ({
    name: person.name,
    email: person.email,
    checkins: person.checkins,
    cells: entries.map((entry) => {
      const bucket = person.values[entry.key];
      if (!bucket) return "";
      if (isNumericType(entry.response_type) && bucket.count > 0) {
        return Math.round((bucket.sum / bucket.count) * 100) / 100;
      }
      return bucket.responses;
    }),
  }));
}