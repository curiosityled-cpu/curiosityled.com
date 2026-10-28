/**
 * Shared review-cycle logic: authorization, configuration resolution, task state,
 * release gating, and append-only event logging.
 *
 * Used by getReviewWorkspace, submitReviewTask, reviewCycleCommand,
 * launchReviewCycle, assignReviewParticipants and the calibration functions.
 */

export const ADMIN_ROLES = [
  "admin",
  "Admin Level 1",
  "Admin Level 2",
  "Super Administrator",
  "Partner Business Administrator",
  "Platform Admin",
];

/** Submission states that count as "a review was actually submitted". */
export const SUBMITTED_STATES = ["submitted", "approved", "acknowledged"];

export const CALIBRATOR_ROLES = [
  "Admin Level 1",
  "Admin Level 2",
  "Super Administrator",
  "Platform Admin",
];

export function normEmail(value: any): string {
  return String(value || "").toLowerCase().trim();
}

export function userRoles(user: any): string[] {
  return [user?.role, user?.app_role, user?.data?.app_role, user?.data?.role]
    .filter(Boolean)
    .map(String);
}

export function isReviewAdmin(user: any): boolean {
  return userRoles(user).some((r) => ADMIN_ROLES.includes(r));
}

export function clientIdOf(user: any): string {
  return String(user?.data?.client_id || user?.client_id || "");
}

/** Normalizes both legacy array results and cursor pages to a plain array. */
export function asList(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (Array.isArray(result.items)) return result.items;
  return [];
}

/**
 * Resolves the rules that govern a cycle. Once a cycle is launched, the stored
 * configuration snapshot wins so later edits cannot rewrite the rules that
 * already governed submitted work.
 */
export function cycleConfig(cycle: any) {
  const live = cycle?.settings || {};
  const snap = live.config_snapshot || null;
  const s = snap ? { ...live, ...snap } : live;
  const reviewType = s.review_type || "self_review";
  return {
    review_type: reviewType,
    cycle_length: s.cycle_length || "annual",
    period_start: s.period_start || null,
    period_end: s.period_end || null,
    self_assessment_due: s.self_assessment_due || null,
    manager_review_due: s.manager_review_due || null,
    peer_enabled:
      typeof s.peer_enabled === "boolean"
        ? s.peer_enabled
        : reviewType === "peer_review" || reviewType === "360",
    peer_attribution: s.peer_attribution || "named",
    release_policy: s.release_policy || "after_calibration",
    require_conversation: s.require_conversation !== false,
    skip_level_review_enabled: !!s.skip_level_review_enabled,
    rubric: s.rubric || "",
    criteria: s.criteria || "",
    legal_hold: !!s.legal_hold,
    retention_months: s.retention_months ?? null,
    launched_at: s.launched_at || null,
    launched_by: s.launched_by || null,
    has_snapshot: !!snap,
  };
}

export function isSubmitted(sub: any): boolean {
  return !!sub && SUBMITTED_STATES.includes(sub.status);
}

export function sortByTimeDesc(list: any[]): any[] {
  return [...list].sort(
    (a, b) =>
      new Date(b.submitted_at || b.updated_date || b.created_date || 0).getTime() -
      new Date(a.submitted_at || a.updated_date || a.created_date || 0).getTime()
  );
}

/** Most recent submitted review for one role about one employee. */
export function latestSubmission(subs: any[], role: string, employeeEmail: string): any | null {
  const target = normEmail(employeeEmail);
  const matches = (subs || []).filter(
    (s) =>
      s.submitter_role === role &&
      isSubmitted(s) &&
      (!target || normEmail(s.linked_employee_email) === target)
  );
  return sortByTimeDesc(matches)[0] || null;
}

export function peerSubmissions(subs: any[], employeeEmail: string): any[] {
  const target = normEmail(employeeEmail);
  return (subs || []).filter(
    (s) =>
      s.submitter_role === "peer" &&
      isSubmitted(s) &&
      normEmail(s.linked_employee_email) === target
  );
}

export function sortByTimeAsc(list: any[]): any[] {
  return [...list].sort(
    (a, b) =>
      new Date(a.submitted_at || a.created_date || 0).getTime() -
      new Date(b.submitted_at || b.created_date || 0).getTime()
  );
}

export function calibratorFor(calibration: any, employeeEmail: string): any | null {
  const target = normEmail(employeeEmail);
  return (
    (calibration?.calibrated_employees || []).find(
      (e: any) => normEmail(e.employee_email) === target
    ) || null
  );
}

/**
 * Derives the workflow state for one roster row. Status is derived rather than
 * trusted from storage so it cannot drift when records are amended.
 */
export function deriveProgress(participant: any, subs: any[], calibration: any, cfg: any) {
  const employee = normEmail(participant?.employee_email);
  const sub = (subs || []).filter((s) => normEmail(s.linked_employee_email) === employee);

  const self = latestSubmission(sub, "self", employee);
  const manager = latestSubmission(sub, "manager", employee);
  const peers = peerSubmissions(sub, employee);
  const requiredPeers = (participant?.peer_emails || []).length;

  const calibrationCompleted = calibration?.status === "completed";
  const calRow = calibratorFor(calibration, employee);
  const managerRating = manager?.responses?.overall_rating ?? null;
  const calibratedRating =
    calibrationCompleted && calRow?.calibrated_rating != null ? calRow.calibrated_rating : null;

  const conversationDone = !!participant?.conversation_completed_at;
  const releaseStatus = participant?.release_status || "pending";

  const blockers = releaseBlockers(participant, sub, calibration, cfg);

  let stage = "self";
  if (self) stage = "manager";
  if (manager) stage = cfg.release_policy === "after_calibration" ? "calibration" : "conversation";
  if (cfg.release_policy === "after_calibration" && calibrationCompleted) stage = "conversation";
  if (conversationDone) stage = "release";
  if (releaseStatus !== "pending") stage = "released";

  return {
    employee_email: employee,
    employee_name: participant?.employee_name || employee,
    manager_email: normEmail(participant?.manager_email),
    peer_required: requiredPeers,
    peer_submitted: peers.length,
    self_submitted: !!self,
    self_submitted_at: self?.submitted_at || null,
    manager_submitted: !!manager,
    manager_submitted_at: manager?.submitted_at || null,
    manager_rating: managerRating,
    self_rating: self?.responses?.overall_rating ?? null,
    peer_avg_rating:
      peers.length > 0
        ? Math.round(
            (peers.reduce((acc, p) => acc + (p.responses?.overall_rating || 0), 0) /
              peers.length) *
              10
          ) / 10
        : null,
    calibration_completed: calibrationCompleted,
    calibrated_rating: calibratedRating,
    adjustment_reason: calRow?.adjustment_reason || "",
    conversation_completed: conversationDone,
    conversation_completed_at: participant?.conversation_completed_at || null,
    release_status: releaseStatus,
    final_rating: participant?.final_rating ?? null,
    final_rating_source: participant?.final_rating_source || null,
    final_released_at: participant?.final_released_at || null,
    acknowledged_at: participant?.acknowledged_at || null,
    disagreement: !!participant?.acknowledgment_disagreement,
    blockers,
    stage,
  };
}

/** Why the outcome may not yet be released. Empty array = releasable. */
export function releaseBlockers(
  participant: any,
  subs: any[],
  calibration: any,
  cfg: any
): string[] {
  const employee = normEmail(participant?.employee_email);
  const blockers: string[] = [];

  if (!latestSubmission(subs, "self", employee)) blockers.push("Self review not submitted");
  if (!latestSubmission(subs, "manager", employee)) blockers.push("Manager review not submitted");
  if (cfg.require_conversation && !participant?.conversation_completed_at) {
    blockers.push("Review conversation not recorded");
  }
  if (cfg.release_policy === "after_calibration" && calibration?.status !== "completed") {
    blockers.push("Calibration not finalized");
  }
  return blockers;
}

/** Appends one immutable event. Never throws — auditing must not break the action. */
export async function logReviewEvent(base44: any, payload: any): Promise<any | null> {
  const clientId = payload?.client_id;
  if (!clientId) return null;
  try {
    return await base44.asServiceRole.entities.ReviewCycleEvent.create({
      client_id: clientId,
      review_cycle_id: payload.review_cycle_id,
      event_type: payload.event_type,
      actor_email: normEmail(payload.actor_email),
      actor_name: payload.actor_name || "",
      actor_role: payload.actor_role || "",
      subject_email: normEmail(payload.subject_email),
      participant_id: payload.participant_id || "",
      source_entity: payload.source_entity || "",
      source_id: payload.source_id || "",
      before: payload.before ?? null,
      after: payload.after ?? null,
      reason: payload.reason || "",
      occurred_at: new Date().toISOString(),
    });
  } catch (error) {
    return null;
  }
}

/** Which review role (if any) the given viewer holds on this roster row. */
export function roleOnParticipant(participant: any, email: string): string | null {
  const target = normEmail(email);
  if (!participant || !target) return null;
  if (normEmail(participant.employee_email) === target) return "self";
  if (normEmail(participant.manager_email) === target) return "manager";
  if ((participant.peer_emails || []).map(normEmail).includes(target)) return "peer";
  return null;
}

/** Roster status derived from the current set of submissions for one employee. */
export function statusForParticipant(
  participant: any,
  subs: any[],
  nextReleaseStatus?: string
): string {
  const releaseStatus = nextReleaseStatus || participant?.release_status || "pending";
  if (releaseStatus === "acknowledged" || releaseStatus === "responded") return "acknowledged";
  if (releaseStatus === "released") return "released";
  const employee = normEmail(participant?.employee_email);
  if (latestSubmission(subs, "manager", employee)) return "manager_submitted";
  if (latestSubmission(subs, "self", employee)) return "self_submitted";
  if (participant?.conversation_completed_at) return "conversation_done";
  return "assigned";
}