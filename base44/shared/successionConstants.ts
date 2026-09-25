/**
 * Succession Phase 0 — shared constants and server-side feature flags.
 *
 * This module is server-side only (base44/shared/ is never in the client bundle).
 * The frontend cannot override any value here.
 */

import { secrets } from "base44:runtime";

// ── Standardized confidentiality levels (A13) ──────────────────────────────
export const CONFIDENTIALITY_LEVELS = {
  STANDARD: "standard",
  CONFIDENTIAL: "confidential",
  HIGHLY_CONFIDENTIAL: "highly_confidential",
  LEGALLY_RESTRICTED: "legally_restricted",
} as const;

// Clearance rank — a caller may read records at or below their clearance.
export const CONFIDENTIALITY_CLEARANCE_ORDER: Record<string, number> = {
  standard: 0,
  confidential: 1,
  highly_confidential: 2,
  legally_restricted: 3,
};

// ── Cross-tenant grant feature flag (server-side, defaults false) ──────────
// Reads the SUCCESSION_GRANT_ENABLED secret. Unset or any value other than
// "true" means DISABLED. Production activation requires a separate approval
// AND the complete grant workflow + dedicated read function passing security
// testing. The frontend cannot override this.
export function isGrantFeatureEnabled(): boolean {
  try {
    return secrets.get("SUCCESSION_GRANT_ENABLED") === "true";
  } catch {
    return false;
  }
}

export const GRANT_DISABLED_MESSAGE =
  "Cross-tenant succession access is disabled pending security testing. " +
  "The grant workflow and dedicated read function must pass security testing " +
  "before this path can be activated. Production activation requires a separate approval.";

// ── Platform Admin full-access flag (TEMPORARY stabilization measure) ────────
// Reads the PLATFORM_ADMIN_FULL_ACCESS secret. Unset or any value other than
// "true" means DISABLED (the default — Platform Admin is denied all succession
// access per the Phase 1 separation-of-duties gate).
//
// When ENABLED, Platform Admin bypasses the standing-access denial and the
// per-action permission check in authorizeSuccessionAction, and receives
// legally_restricted confidentiality clearance. This gives the platform
// operator full read/write/approve access to any tenant whose client_id
// matches the Platform Admin's profile client_id.
//
// REVISIT THRESHOLD: This flag is a temporary measure for early-stage platform
// stabilization. It should be turned OFF (secret removed or set to "false")
// when ANY of the following become true:
//   1. Active client count exceeds ~10 tenants, OR
//   2. Phase 2 succession module reaches production stability, OR
//   3. The cross-tenant grant workflow passes security testing and is activated.
// At that point, Platform Admin access must flow through the grant mechanism
// with per-action audit and time-boxed leases — not standing access.
//
// The frontend cannot override this. Toggled via the Secrets dashboard.
export function isPlatformAdminFullAccessEnabled(): boolean {
  try {
    return secrets.get("PLATFORM_ADMIN_FULL_ACCESS") === "true";
  } catch {
    return false;
  }
}

// ── Permitted grant actions (NO export in the first release) ──────────────
export const GRANT_PERMITTED_ACTIONS = [
  "read_metadata",
  "read_record",
  "troubleshoot",
] as const;

// ── Minimum-group suppression threshold (server-controlled) ────────────────
// Applied to partner aggregate reporting so small groups cannot be
// re-identified. Server-controlled; will be client-configurable later.
// Never accepted from a request parameter.
export const MIN_GROUP_SUPPRESSION_THRESHOLD = 5;

// ── Succession permission keys ─────────────────────────────────────────────
export const SUCCESSION_PERMISSIONS = [
  "succession.cycles.view",
  "succession.cycles.manage",
  "succession.roles.view",
  "succession.roles.manage",
  "succession.candidates.view",
  "succession.candidates.manage",
  "succession.evidence.view",
  "succession.evidence.attest",
  "succession.calibration.view",
  "succession.calibration.manage",
  "succession.readiness.propose",
  "succession.readiness.ratify",
  "succession.governance.view",
  "succession.governance.manage",
  "succession.monitor.view",
  "succession.monitor.manage",
  "succession.export",
  // Phase 2A — Discover workflow permissions
  "succession.discovery.view",
  "succession.discovery.manage",
  "succession.discovery.disclose",
  // Add-on / restricted-scope permissions
  "succession.view_executive_aggregate",
  "succession.compliance_view",
  "succession.partner_aggregate_view",
] as const;