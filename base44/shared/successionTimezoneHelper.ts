/**
 * successionTimezoneHelper — timezone-aware date derivation for assignments.
 *
 * NO SILENT FALLBACK. The tenant business timezone must be explicitly configured
 * and validated. Missing timezone → TENANT_TIMEZONE_REQUIRED. Invalid timezone →
 * INVALID_TIMEZONE. Timestamps are stored in UTC; date-only assignment semantics
 * are evaluated in the tenant business timezone. Timezone is never inferred from
 * the authenticated user's browser or personal location.
 */

export type TimezoneError = "TENANT_TIMEZONE_REQUIRED" | "INVALID_TIMEZONE";

export interface TimezoneValidationResult {
  valid: boolean;
  timezone: string | null;
  error: TimezoneError | null;
}

/**
 * Validate a timezone identifier. No fallback — returns an error if missing or invalid.
 */
export function validateTimezone(timezone: string | null | undefined): TimezoneValidationResult {
  if (!timezone || typeof timezone !== "string" || timezone.trim() === "") {
    return { valid: false, timezone: null, error: "TENANT_TIMEZONE_REQUIRED" };
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return { valid: true, timezone, error: null };
  } catch {
    return { valid: false, timezone: null, error: "INVALID_TIMEZONE" as TimezoneError };
  }
}

/**
 * Get the current date (midnight) in a given timezone as a UTC-comparable Date.
 */
function getTodayInTimezone(timezone: string): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === "year")!.value;
  const month = parts.find(p => p.type === "month")!.value;
  const day = parts.find(p => p.type === "day")!.value;
  return new Date(`${year}-${month}-${day}T00:00:00Z`);
}

function dateOnlyToDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00Z");
}

/**
 * Derive the temporal status of a PositionAssignment using the tenant business timezone.
 * Throws if timezone is missing or invalid — caller must handle.
 */
export function deriveAssignmentStatus(
  start_date: string,
  end_date: string | null | undefined,
  timezone: string
): { status: string; timezone: string } {
  const tzResult = validateTimezone(timezone);
  if (!tzResult.valid) throw new Error(tzResult.error!);
  const today = getTodayInTimezone(tzResult.timezone!);
  const start = dateOnlyToDate(start_date);
  const end = end_date ? dateOnlyToDate(end_date) : null;

  if (start > today) return { status: "scheduled", timezone: tzResult.timezone! };
  if (end && end <= today) return { status: "expired", timezone: tzResult.timezone! };
  return { status: "active", timezone: tzResult.timezone! };
}

/**
 * Check if an end_date is on or before a start_date (inclusive end-date rule).
 */
export function isEndDateOnOrBeforeStart(start_date: string, end_date: string): boolean {
  return dateOnlyToDate(end_date) < dateOnlyToDate(start_date);
}

/**
 * Check if a date-only value has arrived (is today or in the past) in a timezone.
 * Throws if timezone is missing or invalid.
 */
export function hasDateArrived(date_str: string, timezone: string): { arrived: boolean; timezone: string } {
  const tzResult = validateTimezone(timezone);
  if (!tzResult.valid) throw new Error(tzResult.error!);
  const today = getTodayInTimezone(tzResult.timezone!);
  const date = dateOnlyToDate(date_str);
  return { arrived: date <= today, timezone: tzResult.timezone! };
}

/**
 * Check if a DST-observing timezone is currently in daylight saving time.
 * Used for DST boundary tests.
 */
export function isDST(timezone: string, date: Date = new Date()): boolean {
  const tzResult = validateTimezone(timezone);
  if (!tzResult.valid) throw new Error(tzResult.error!);
  const januaryOffset = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
  const julyOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  // If the timezone has different offsets in January vs July, it observes DST
  const observesDST = januaryOffset !== julyOffset;
  if (!observesDST) return false;
  // Check if the given date is in the DST period (typically March-October in Northern hemisphere)
  const currentOffset = new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "short" })
    .formatToParts(date)
    .find(p => p.type === "timeZoneName")?.value || "";
  return currentOffset.includes("DT") || currentOffset.includes("DST");
}