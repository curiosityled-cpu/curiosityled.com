/**
 * Organization settings that govern *when* and *where* the platform contacts
 * people: check-in cadence, weekly reflection day, notification channels and
 * cadence, goal review cadence, assessment reassessment cadence.
 *
 * Every scheduled function resolves these through this module so the value an
 * administrator saves in Organization Settings is the value the automations
 * actually run on, and so a value that was never set behaves the same way in
 * every function.
 */

export const DEFAULT_ORG_SETTINGS = {
  goals: {
    review_cadence: "monthly",
    require_manager_approval: false,
  },
  assessment: {
    require_baseline: true,
    reassessment_cadence_months: 6,
    scoring_scale: 5,
  },
  check_in_config: {
    default_cadence: "daily",
    weekly_reflection_day: "friday",
  },
  notifications: {
    enabled_channels: ["in_app", "email"],
    default_cadence: "instant",
  },
};

const WEEKDAY_INDEX = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/** Stored settings layered over the defaults, section by section. */
export function resolveOrgSettings(client) {
  const stored = client?.settings || {};
  const resolved = {};

  Object.entries(DEFAULT_ORG_SETTINGS).forEach(([section, defaults]) => {
    resolved[section] = { ...defaults, ...(stored[section] || {}) };
  });

  // A channel list the administrator explicitly saved — including one where
  // every channel is switched off — is honoured as written. Only an absent list
  // falls back to the default (in-app and email).
  if (Array.isArray(stored.notifications?.enabled_channels)) {
    resolved.notifications.enabled_channels = stored.notifications.enabled_channels;
  }

  return resolved;
}

/** All tenants keyed by id, so a user's settings cost one map lookup. */
export async function loadClientsById(base44) {
  const clients = await base44.asServiceRole.entities.Client.list("-created_date", 500).catch(() => []);
  return new Map(clients.map((c) => [c.id, c]));
}

export function settingsForUser(user, clientsById) {
  return resolveOrgSettings(clientsById.get(user?.client_id));
}

export function channelEnabled(settings, channel) {
  return (settings.notifications.enabled_channels || []).includes(channel);
}

// ── Check-in cadence ────────────────────────────────────────────────────────

/**
 * Whether today is a day the organization prompts people to check in.
 * `important_only` means no scheduled prompt at all: the product keeps surfacing
 * check-ins through risk- and trigger-driven nudges instead.
 */
export function checkInCadenceAllowsToday(cadence, date = new Date()) {
  if (cadence === "paused" || cadence === "important_only") return false;
  if (cadence === "every_other_day") {
    const dayOrdinal = Math.floor(date.getTime() / 86400000);
    return dayOrdinal % 2 === 0;
  }
  return true; // daily
}

/** Weekday name in the app's operating timezone, matching the other automations. */
export function weekdayName(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
  }).format(date).toLowerCase();
}

export function reflectionDayIndex(settings) {
  return WEEKDAY_INDEX[settings?.check_in_config?.weekly_reflection_day || "friday"] ?? 5;
}

export function isReflectionDay(settings, date = new Date()) {
  return weekdayName(date) === (settings?.check_in_config?.weekly_reflection_day || "friday");
}

export function weekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// ── Notification cadence ────────────────────────────────────────────────────

/**
 * When notifications are batched, they are delivered once in a morning digest:
 * daily at 08:00 in the app's operating timezone, weekly on Monday at 08:00.
 * Outside that window a batched notification waits for the next one.
 */
export function digestWindowOpen(cadence, date = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: false,
    }).format(date)
  );
  if (hour !== 8) return false;
  if (cadence === "weekly") return weekdayName(date) === "monday";
  return true; // daily
}

// ── Goal review cadence ─────────────────────────────────────────────────────

const REVIEW_PERIOD = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 91,
};

/** Days in one review period for the chosen cadence. */
export function goalReviewPeriodDays(cadence) {
  return REVIEW_PERIOD[cadence] || REVIEW_PERIOD.monthly;
}

export function goalReviewKey(cadence, date = new Date()) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  if (cadence === "weekly" || cadence === "biweekly") return `${y}-${weekKey(date)}`;
  if (cadence === "quarterly") return `${y}-Q${Math.floor(m / 3) + 1}`;
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

/**
 * A review is due once per period: the first day of the week (Monday), of the
 * month, or of the quarter. Biweekly reviews run on alternate Mondays.
 */
export function goalReviewDue(cadence, date = new Date()) {
  const dayOfWeek = date.getUTCDay();
  const dayOfMonth = date.getUTCDate();
  const month = date.getUTCMonth();

  switch (cadence) {
    case "weekly":
      return dayOfWeek === 1;
    case "biweekly":
      return dayOfWeek === 1 && Math.floor(date.getTime() / 86400000 / 7) % 2 === 0;
    case "quarterly":
      return dayOfMonth === 1 && month % 3 === 0;
    case "monthly":
    default:
      return dayOfMonth === 1;
  }
}