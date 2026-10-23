/**
 * Date-range resolution shared by the check-in insight functions.
 *
 * Either a rolling window in days (the preset ranges) or an explicit custom
 * start/end pair chosen by the user. Preset behaviour is unchanged: the window
 * starts `days` back from now.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const isDateString = (value: any): boolean =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

export function resolveDateRange(body: any) {
  const start = body?.start_date;
  const end = body?.end_date;

  if (isDateString(start) && isDateString(end)) {
    const ordered = start <= end;
    const since = new Date(`${ordered ? start : end}T00:00:00Z`);
    const until = new Date(`${ordered ? end : start}T23:59:59Z`);
    return {
      since,
      until,
      days: Math.max(1, Math.round((until.getTime() - since.getTime()) / DAY_MS)),
      isCustom: true,
      label: `${ordered ? start : end} to ${ordered ? end : start}`,
    };
  }

  const days = Math.min(Math.max(parseInt(body?.days) || 90, 7), 365);
  const since = new Date();
  since.setDate(since.getDate() - days);
  return { since, until: null, days, isCustom: false, label: `Last ${days} days` };
}

export function recordInRange(record: any, range: any): boolean {
  const raw = record?.check_in_date || record?.created_date;
  if (!raw) return false;
  const at = new Date(raw);
  if (at < range.since) return false;
  if (range.until && at > range.until) return false;
  return true;
}