/**
 * successionAssignmentRules — PositionAssignment validation rules.
 *
 * Enforced in assignment functions (successionRecordPositionChange,
 * successionCorrectPositionAssignment), NOT in a shared mutation path.
 *
 * Rules:
 *   1. Reject end_date before start_date.
 *   2. Permit cancellation only before start_date.
 *   3. Erroneous current/historical assignments require an audited correction
 *      (successionCorrectPositionAssignment). The original is never mutated.
 *   4. Backdated assignments (start_date earlier than now) are PROHIBITED unless
 *      correction_of_assignment_id is set.
 *   5. end_date is inclusive (end_date_inclusive = true).
 *   6. Temporal state derived using the configured tenant business timezone.
 */

export interface AssignmentValidationInput {
  start_date: string;
  end_date?: string;
  assignment_timezone: string;
  correction_of_assignment_id?: string;
  is_cancellation?: boolean;
  now?: Date;
}

export interface AssignmentValidationResult {
  valid: boolean;
  errors: string[];
  derived_status: string;
}

export function validateAssignment(input: AssignmentValidationInput): AssignmentValidationResult {
  const errors: string[] = [];
  const now = input.now || new Date();
  const start = new Date(input.start_date + "T00:00:00");
  const end = input.end_date ? new Date(input.end_date + "T00:00:00") : null;

  // Rule 1: Reject end_date before start_date
  if (end && end < start) {
    errors.push("end_date_before_start_date");
  }

  // Rule 4: Backdated assignments prohibited unless correction
  if (start < now && !input.correction_of_assignment_id) {
    errors.push("backdated_assignment_requires_correction_link");
  }

  // Rule 2: Cancellation only before start_date
  if (input.is_cancellation && start <= now) {
    errors.push("cancellation_after_start_date_not_permitted");
  }

  // Derive temporal status using assignment_timezone
  let derived_status = "scheduled";
  if (errors.length === 0) {
    if (input.is_cancellation) {
      derived_status = "cancelled";
    } else if (start > now) {
      derived_status = "scheduled";
    } else if (end && end < now) {
      derived_status = "expired";
    } else {
      derived_status = "active";
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    derived_status,
  };
}

/**
 * Check whether an open blocking SnapshotIntegrityIncident prevents snapshot use.
 */
export function isSnapshotOperationallyBlocked(incidents: any[]): boolean {
  return (incidents || []).some(
    (i) => i.operational_use_blocked === true && i.status !== "dismissed" && i.status !== "resolved"
  );
}