/**
 * successionMonitorValidator — validation helpers for the Operational Monitor.
 *
 * Validates alert types, review types, severity, status transitions, dismissal
 * rules, and tenant-scoped reference integrity. Does NOT authorize — that is
 * the job of authorizeSuccessionAction. Does NOT mutate source entities.
 */

import { isWithinClearance } from "./confidentialityFilter.ts";
import type { BootstrapAuthContext } from "./successionAuthBootstrap.ts";

export const ALERT_TYPES = [
  "critical_role_uncovered",
  "no_active_candidacy",
  "current_readiness_missing",
  "readiness_review_due",
  "readiness_expired",
  "development_review_due",
  "development_action_overdue",
  "transition_start_overdue",
  "knowledge_transfer_overdue",
  "unresolved_high_transition_risk",
  "integrity_attention_required",
  "other",
] as const;

export const ALERT_SEVERITIES = [
  "informational",
  "attention",
  "high",
  "critical",
] as const;

export const ALERT_STATUSES = [
  "open",
  "acknowledged",
  "resolved",
  "dismissed",
] as const;

export const REVIEW_TYPES = [
  "operational",
  "readiness_reassessment",
  "development",
  "transition",
  "integrity",
  "pilot",
  "other",
] as const;

export const REVIEW_STATUSES = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;

// Alert status transitions: what statuses can an alert move to from its current status.
const ALLOWED_ALERT_TRANSITIONS: Record<string, string[]> = {
  open: ["acknowledged", "resolved", "dismissed"],
  acknowledged: ["resolved", "dismissed", "open"],
  resolved: [], // terminal — reopened by refresh, not by manual update
  dismissed: [], // terminal
};

export function isValidAlertType(t: string): boolean {
  return (ALERT_TYPES as readonly string[]).includes(t);
}

export function isValidAlertSeverity(s: string): boolean {
  return (ALERT_SEVERITIES as readonly string[]).includes(s);
}

export function isValidAlertStatus(s: string): boolean {
  return (ALERT_STATUSES as readonly string[]).includes(s);
}

export function isValidReviewType(t: string): boolean {
  return (REVIEW_TYPES as readonly string[]).includes(t);
}

export function isValidReviewStatus(s: string): boolean {
  return (REVIEW_STATUSES as readonly string[]).includes(s);
}

export function canTransitionAlertStatus(fromStatus: string, toStatus: string): boolean {
  const allowed = ALLOWED_ALERT_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

/**
 * Validate an alert update request.
 * Returns { valid: true } or { valid: false, code: string }.
 */
export function validateAlertUpdate(params: {
  auth: BootstrapAuthContext;
  alert: any;
  new_status: string;
  resolution_note?: string | null;
  dismissal_reason?: string | null;
  assigned_to_profile_id?: string | null;
}): { valid: boolean; code?: string } {
  const { auth, alert, new_status, resolution_note, dismissal_reason, assigned_to_profile_id } = params;

  if (!isValidAlertStatus(new_status)) {
    return { valid: false, code: "invalid_status" };
  }

  // Terminal statuses cannot be manually changed
  if (alert.status === "resolved" || alert.status === "dismissed") {
    return { valid: false, code: "alert_is_terminal" };
  }

  if (!canTransitionAlertStatus(alert.status, new_status)) {
    return { valid: false, code: "invalid_status_transition" };
  }

  // Dismissal requires a reason
  if (new_status === "dismissed") {
    if (!dismissal_reason || !dismissal_reason.trim()) {
      return { valid: false, code: "dismissal_requires_reason" };
    }
    // Critical alerts cannot be dismissed by unauthorized actors
    if (alert.severity === "critical") {
      const canManage = auth.permissions.includes("succession.monitor.manage");
      if (!canManage) {
        return { valid: false, code: "critical_alert_dismissal_unauthorized" };
      }
    }
  }

  // Resolve requires a note
  if (new_status === "resolved") {
    if (!resolution_note || !resolution_note.trim()) {
      return { valid: false, code: "resolve_requires_note" };
    }
  }

  // Acknowledge: only the assigned user or a manage-permission holder
  if (new_status === "acknowledged") {
    const isAssigned = alert.assigned_to_profile_id === auth.profile_id;
    const canManage = auth.permissions.includes("succession.monitor.manage");
    if (!isAssigned && !canManage) {
      return { valid: false, code: "acknowledge_not_assigned" };
    }
  }

  return { valid: true };
}

/**
 * Validate a review record create/update request.
 */
export function validateReviewRecord(params: {
  review_type: string;
  title: string;
  review_scope: string;
  owner_profile_id: string;
  scheduled_for: string;
  status: string;
  cancellation_reason?: string | null;
}): { valid: boolean; code?: string } {
  const { review_type, title, review_scope, owner_profile_id, scheduled_for, status, cancellation_reason } = params;

  if (!isValidReviewType(review_type)) {
    return { valid: false, code: "invalid_review_type" };
  }
  if (!title || !title.trim()) {
    return { valid: false, code: "title_required" };
  }
  if (!review_scope || !review_scope.trim()) {
    return { valid: false, code: "review_scope_required" };
  }
  if (!owner_profile_id) {
    return { valid: false, code: "owner_required" };
  }
  if (!scheduled_for) {
    return { valid: false, code: "scheduled_for_required" };
  }
  if (!isValidReviewStatus(status)) {
    return { valid: false, code: "invalid_status" };
  }
  // Cancellation requires a reason
  if (status === "cancelled" && (!cancellation_reason || !cancellation_reason.trim())) {
    return { valid: false, code: "cancellation_requires_reason" };
  }
  return { valid: true };
}

/**
 * Compute a deterministic tenant-scoped fingerprint for an alert.
 * fingerprint = client_id|alert_type|source_entity_type|source_entity_id
 * This ensures only one active alert per fingerprint per tenant.
 */
export function computeAlertFingerprint(
  client_id: string,
  alert_type: string,
  source_entity_type: string,
  source_entity_id: string
): string {
  return `${client_id}|${alert_type}|${source_entity_type}|${source_entity_id}`;
}

/**
 * Check whether an actor can see a record given its confidentiality level.
 */
export function canActorSeeRecord(
  auth: BootstrapAuthContext,
  record: { confidentiality_level?: string }
): boolean {
  const callerClearance = getCallerClearance(auth);
  return isWithinClearance(record.confidentiality_level, callerClearance);
}

function getCallerClearance(auth: BootstrapAuthContext): string {
  if (auth.isPlatformAdmin) return "legally_restricted";
  const adminRoles = [
    "Platform Admin",
    "Platform Administrator",
    "admin",
    "Super Administrator",
    "Admin Level 2",
    "Admin Level 1",
  ];
  if (adminRoles.includes(auth.role)) return "highly_confidential";
  return "standard";
}