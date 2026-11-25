/**
 * Deterministic "what should I do next" selection for the Development home.
 * Pure and auditable: it reads only assignment status, due date and the
 * progress the learner's own records already carry — never an estimate.
 *
 * Priority order
 *   0  overdue work            (most overdue first)
 *   1  due within seven days   (soonest first)
 *   2  already in progress     (closest to done first)
 *   3  scheduled for later     (soonest first)
 *   4  no due date             (journey, course, conversation, resource, then title)
 */

const DAY_MS = 86400000;

const KIND_ORDER = { journey: 0, course: 1, module: 2, resource: 3 };

export function daysUntil(dueDate) {
  if (!dueDate) return null;
  const value = String(dueDate);
  const due = new Date(value.includes("T") ? value : `${value}T23:59:59`);
  if (Number.isNaN(due.getTime())) return null;
  return Math.ceil((due.getTime() - Date.now()) / DAY_MS);
}

function bucketOf(item, days) {
  if (days !== null && days < 0) return 0;
  if (days !== null && days <= 7) return 1;
  if (item.status === "in_progress") return 2;
  if (days !== null) return 3;
  return 4;
}

export function rankDevelopmentItems(items = []) {
  const open = items
    .filter((item) => item.status !== "completed")
    .map((item) => ({ ...item, days: daysUntil(item.due_date) }));

  const ranked = [...open].sort((a, b) => {
    const bucket = bucketOf(a, a.days) - bucketOf(b, b.days);
    if (bucket !== 0) return bucket;

    const aDays = a.days ?? Number.MAX_SAFE_INTEGER;
    const bDays = b.days ?? Number.MAX_SAFE_INTEGER;
    if (aDays !== bDays) return aDays - bDays;

    const aPercent = Math.round(a.percent || 0);
    const bPercent = Math.round(b.percent || 0);
    if (aPercent !== bPercent) return bPercent - aPercent;

    const kind = (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9);
    if (kind !== 0) return kind;

    return String(a.title || "").localeCompare(String(b.title || ""));
  });

  return {
    ranked,
    overdue: open.filter((item) => item.days !== null && item.days < 0).length,
    dueSoon: open.filter((item) => item.days !== null && item.days >= 0 && item.days <= 7).length,
  };
}