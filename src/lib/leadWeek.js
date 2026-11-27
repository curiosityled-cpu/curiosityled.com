/**
 * Builds the week strip that sits under the greeting on the Lead home.
 *
 * Given this week's check-in records and today's date (YYYY-MM-DD, ET), it
 * returns the seven days of the current week, Monday first, each marked done
 * or not, plus the run of consecutive days ending today (or yesterday, while
 * today's check-in is still outstanding).
 */

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function toKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shift(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function completedDates(records) {
  const keys = new Set();
  for (const r of records || []) {
    if (!r?.check_in_date) continue;
    const done =
      r.morning_completed || r.evening_completed || r.energy_score != null || r.load_score != null;
    if (done) keys.add(r.check_in_date);
  }
  return keys;
}

export function buildLeadWeek(records, todayET) {
  const done = completedDates(records);
  const today = new Date(`${todayET}T12:00:00`);
  const dow = today.getDay();
  const monday = shift(today, dow === 0 ? -6 : 1 - dow);

  const days = DAY_LABELS.map((label, i) => {
    const key = toKey(shift(monday, i));
    return { key, label, done: done.has(key), isToday: key === todayET };
  });

  let streak = 0;
  let cursor = done.has(todayET) ? today : shift(today, -1);
  while (done.has(toKey(cursor))) {
    streak += 1;
    cursor = shift(cursor, -1);
  }

  return { days, streak };
}