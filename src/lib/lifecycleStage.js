/**
 * Leadership lifecycle stage derivation.
 *
 * A user's stage is derived LIVE (so it's always current) from an anchor date,
 * with an optional manual override:
 *
 *  1. Manual override — `leadership_lifecycle_stage` on the User record. If set,
 *     it wins. Use this for high-potentials tagged "attraction" or any edge case
 *     time-based logic can't capture.
 *  2. Time since anchor — `leadership_start_date` if set, otherwise `start_date`.
 *     This lets newly-promoted leaders (whose company start_date is old) reset
 *     the clock by setting leadership_start_date to their promotion date.
 *
 * Time bands:
 *   <= 90 days   → onboarding
 *   <= 1 year    → development
 *   <= 3 years   → performance
 *   > 3 years    → retention
 *
 * "attraction" is never auto-derived (it describes pre-leadership pipeline
 * talent); set it via the manual override.
 */

export const LIFECYCLE_STAGES = [
  "attraction",
  "onboarding",
  "development",
  "performance",
  "retention",
];

export function deriveLeadershipStage(user) {
  if (!user) return null;
  const get = (k) => user[k] ?? user.data?.[k];

  const override = get("leadership_lifecycle_stage");
  if (override) return override;

  const anchor = get("leadership_start_date") || get("start_date");
  if (!anchor) return null;

  const ms = Date.now() - new Date(anchor).getTime();
  if (Number.isNaN(ms)) return null;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  if (days < 0) return "onboarding"; // future-dated anchor (incoming leader)
  if (days <= 90) return "onboarding";
  if (days <= 365) return "development";
  if (days <= 1095) return "performance";
  return "retention";
}