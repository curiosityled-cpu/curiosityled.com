import { useContext } from "react";
import { ClientContext } from "@/components/contexts/ClientContext";
import { resolveFrameworkValue } from "@/lib/goalFrameworks";

// Single source of truth for organization settings.
//
// Organization Settings (Settings → Organization) writes these onto the client
// record under `settings`. Every consumer reads them through useOrgSettings so a
// value the administrator sets actually shows up in the product, and so the
// fallbacks used when a value is unset match what the settings screen displays.

export const COACHING_ENGAGEMENT_TYPES = [
  "1on1_coaching",
  "team_effectiveness",
  "leadership_development",
  "career_coaching",
  "performance_improvement",
  "executive_coaching",
];

export const EXPORT_FORMATS = ["pdf", "csv", "xlsx"];

export const ORG_SETTINGS_DEFAULTS = {
  goals: {
    cascade_enabled: true,
    review_cadence: "monthly",
    require_manager_approval: false,
  },
  assessment: {
    require_baseline: true,
    reassessment_cadence_months: 6,
    enable_360: false,
    scoring_scale: 5,
  },
  coaching: {
    default_session_count: 6,
    default_session_length_minutes: 60,
    allow_external_coaches: true,
  },
  check_in_config: {
    preset_id: "balance",
    default_cadence: "daily",
    weekly_reflection_day: "friday",
    proactivity_level: "proactive",
  },
  notifications: {
    // Matches the stored default: in-app and email. An administrator who turns
    // channels off saves an explicit list, which is honoured as written.
    enabled_channels: ["in_app", "email"],
    default_cadence: "instant",
  },
  integrations: {
    enabled_providers: [],
    performance_sync_enabled: false,
  },
  privacy: {
    default_confidentiality_level: "confidential",
    hr_visibility_mode: "aggregates_only",
    data_retention_days: 90,
  },
  gamification: {
    enabled: true,
    leaderboard_scope: "team_scoped",
  },
  reporting: {
    default_landing_view: "org",
  },
};

/**
 * Resolve the effective settings for a client record: stored values layered
 * over the defaults, with list values that were never chosen falling back to
 * "everything available".
 */
export function resolveOrgSettings(client) {
  const stored = client?.settings || {};
  const resolved = {};

  Object.entries(ORG_SETTINGS_DEFAULTS).forEach(([section, defaults]) => {
    resolved[section] = { ...defaults, ...(stored[section] || {}) };
  });

  // Lists: an empty or missing list means the organization never chose, so the
  // platform keeps offering everything.
  if (!(stored.coaching?.enabled_engagement_types || []).length) {
    resolved.coaching.enabled_engagement_types = COACHING_ENGAGEMENT_TYPES;
  }
  if (!(stored.reporting?.enabled_export_formats || []).length) {
    resolved.reporting.enabled_export_formats = EXPORT_FORMATS;
  }

  resolved.goals.framework = resolveFrameworkValue(stored.goals?.framework);
  resolved.locks = stored.locks || {};

  return resolved;
}

/**
 * Read the organization's settings inside any component. Falls back to the
 * defaults when the component sits outside the ClientProvider.
 */
export function useOrgSettings() {
  const context = useContext(ClientContext);
  return resolveOrgSettings(context?.client);
}