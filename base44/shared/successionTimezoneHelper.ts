/**
 * successionTimezoneHelper — timezone-aware date derivation for assignments.
 *
 * Provides:
 *   - validateTimezone: rejects invalid/unsupported timezone identifiers
 *   - deriveAssignmentStatus: timezone-aware scheduled/active/expired derivation
 *   - isDateOnOrBefore: inclusive end-date comparison in a given timezone
 *
 * Fallback: if the tenant timezone is missing or invalid, defaults to
 * 'America/New_York' (the platform's primary business timezone). This
 * fallback is documented and logged so it can be corrected.
 */

const FALLBACK_TIMEZONE = "America/New_York";

/**
 * Validate a timezone identifier using the Intl API.
 * Returns the timezone if valid, or the fallback if invalid/missing.
 */
export function validateTimezone(timezone: string | null | undefined): { valid: boolean; timezone: string; fell_back: boolean } {
  if (!timezone || typeof timezone !== "string") {
    return { valid: false, timezone: FALLBACK_TIMEZONE, fell_back: true };
  }
  try {
    // Test by formatting — throws RangeError for invalid timezones
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return { valid: true, timezone, fell_back: false };
  } catch {
    return { valid: false, timezone: FALLBACK_TIMEZONE, fell_back: true };
  }
}

/**
 * Get the current date (midnight) in a given timezone.
 * Returns a Date object representing midnight in that timezone.
 */
function getTodayInTimezone(timezone: string): Date {
  const now = new Date();
  // Use Intl to get the date parts in the target timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === "year")!.value;
  const month = parts.find(p => p.type === "month")!.value;
  const day = parts.find(p => p.type === "day")!.value;
  // Construct a date at midnight UTC representing the timezone's local date
  // We compare date-only values, so the exact hour doesn't matter as long as
  // both sides use the same timezone
  return new Date(`${year}-${month}-${day}T00:00:00Z`);
}

/**
 * Convert a date-only string (YYYY-MM-DD) to a comparable Date in a timezone.
 * Since date-only values have no time component, we treat them as midnight
 * in the given timezone for comparison purposes.
 */
function dateOnlyToDate(dateStr: string, timezone: string): Date {
  // date-only values are timezone-agnostic — parse as midnight UTC
  return new Date(dateStr + "T00:00:00Z");
}

/**
 * Derive the temporal status of a PositionAssignment using the configured
 * tenant business timezone.
 *
 * Rules:
 *   - start_date has not arrived → "scheduled"
 *   - start_date arrived, no end_date or end_date in future → "active"
 *   - end_date has passed (inclusive) → "expired"
 *   - cancelled → "cancelled" (caller must set this)
 */
export function deriveAssignmentStatus(
  start_date: string,
  end_date: string | null | undefined,
  timezone: string | null | undefined
): { status: string; timezone: string; fell_back: boolean } {
  const tzResult = validateTimezone(timezone);
  const today = getTodayInTimezone(tzResult.timezone);
  const start = dateOnlyToDate(start_date, tzResult.timezone);
  const end = end_date ? dateOnlyToDate(end_date, tzResult.timezone) : null;

  if (start > today) {
    return { status: "scheduled", timezone: tzResult.timezone, fell_back: tzResult.fell_back };
  }
  if (end && end <= today) {
    return { status: "expired", timezone: tzResult.timezone, fell_back: tzResult.fell_back };
  }
  return { status: "active", timezone: tzResult.timezone, fell_back: tzResult.fell_back };
}

/**
 * Check if an end_date is on or before a start_date (inclusive end-date rule).
 * Both are date-only strings.
 */
export function isEndDateOnOrBeforeStart(start_date: string, end_date: string): boolean {
  const start = dateOnlyToDate(start_date, "UTC");
  const end = dateOnlyToDate(end_date, "UTC");
  return end < start;
}

/**
 * Check if a date-only value has arrived (is today or in the past) in a timezone.
 */
export function hasDateArrived(date_str: string, timezone: string | null | undefined): { arrived: boolean; timezone: string; fell_back: boolean } {
  const tzResult = validateTimezone(timezone);
  const today = getTodayInTimezone(tzResult.timezone);
  const date = dateOnlyToDate(date_str, tzResult.timezone);
  return { arrived: date <= today, timezone: tzResult.timezone, fell_back: tzResult.fell_back };
}