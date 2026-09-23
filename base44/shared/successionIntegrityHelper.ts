/**
 * successionIntegrityHelper — quarantine, resolution, and integrity_status filtering.
 *
 * Conflict-prone entities carry the integrity envelope:
 *   integrity_status, quarantine_reason, quarantined_at, quarantined_by_operation_id,
 *   resolution_status, resolved_at, resolved_by_profile_id, resolution_rationale
 *
 * Operational reads return integrity_status=active only.
 * Resolved records require successful revalidation before returning to active.
 */

export const INTEGRITY_STATUS = {
  PENDING_VALIDATION: "pending_validation",
  ACTIVE: "active",
  QUARANTINED: "quarantined",
  RESOLVED: "resolved",
} as const;

export const RESOLUTION_DISPOSITION = {
  ACTIVATE_SELECTED_RECORD: "activate_selected_record",
  RETIRE_DUPLICATE: "retire_duplicate",
  WITHDRAW_RECORD: "withdraw_record",
  CORRECT_AND_REVALIDATE: "correct_and_revalidate",
  KEEP_QUARANTINED: "keep_quarantined",
  ESCALATE: "escalate",
} as const;

export interface QuarantineInput {
  base44: any;
  entity_name: string;
  record_id: string;
  reason: string;
  operation_id: string;
}

/**
 * Quarantine a record. Sets the full integrity envelope.
 */
export async function quarantineRecord(input: QuarantineInput): Promise<void> {
  const { base44, entity_name, record_id, reason, operation_id } = input;
  await base44.asServiceRole.entities[entity_name].update(record_id, {
    integrity_status: INTEGRITY_STATUS.QUARANTINED,
    quarantine_reason: reason,
    quarantined_at: new Date().toISOString(),
    quarantined_by_operation_id: operation_id,
    resolution_status: "pending",
  });
}

/**
 * Quarantine multiple records (e.g. ambiguous postcondition on OrgRole + blueprints).
 */
export async function quarantineRecords(
  base44: any,
  entity_name: string,
  record_ids: string[],
  reason: string,
  operation_id: string
): Promise<void> {
  for (const id of record_ids) {
    await quarantineRecord({ base44, entity_name, record_id: id, reason, operation_id });
  }
}

export interface ResolveInput {
  base44: any;
  entity_name: string;
  record_id: string;
  resolved_by_profile_id: string;
  resolution_rationale: string;
  disposition: string;
  reactivate?: boolean;
}

/**
 * Resolve an integrity conflict. Human-authorized and audited (by the calling function).
 * disposition controls the outcome:
 *   activate_selected_record → integrity_status=active
 *   retire_duplicate → keep quarantined, mark resolved
 *   withdraw_record → keep quarantined, mark resolved
 *   correct_and_revalidate → integrity_status=pending_validation (awaiting revalidation)
 *   keep_quarantined → resolution_status=exception_found
 *   escalate → resolution_status=pending, keep quarantined
 */
export async function resolveIntegrityConflict(input: ResolveInput): Promise<void> {
  const { base44, entity_name, record_id, resolved_by_profile_id, resolution_rationale, disposition, reactivate } = input;

  let new_integrity_status = INTEGRITY_STATUS.RESOLVED;
  let new_resolution_status = "completed";

  switch (disposition) {
    case RESOLUTION_DISPOSITION.ACTIVATE_SELECTED_RECORD:
      new_integrity_status = INTEGRITY_STATUS.ACTIVE;
      new_resolution_status = "completed";
      break;
    case RESOLUTION_DISPOSITION.RETIRE_DUPLICATE:
    case RESOLUTION_DISPOSITION.WITHDRAW_RECORD:
      new_integrity_status = INTEGRITY_STATUS.QUARANTINED;
      new_resolution_status = "completed";
      break;
    case RESOLUTION_DISPOSITION.CORRECT_AND_REVALIDATE:
      new_integrity_status = INTEGRITY_STATUS.PENDING_VALIDATION;
      new_resolution_status = "pending";
      break;
    case RESOLUTION_DISPOSITION.KEEP_QUARANTINED:
      new_integrity_status = INTEGRITY_STATUS.QUARANTINED;
      new_resolution_status = "exception_found";
      break;
    case RESOLUTION_DISPOSITION.ESCALATE:
      new_integrity_status = INTEGRITY_STATUS.QUARANTINED;
      new_resolution_status = "pending";
      break;
  }

  await base44.asServiceRole.entities[entity_name].update(record_id, {
    integrity_status: new_integrity_status,
    resolution_status: new_resolution_status,
    resolved_at: new Date().toISOString(),
    resolved_by_profile_id,
    resolution_rationale,
  });
}

/**
 * Filter operational reads to integrity_status=active only.
 * Resolved records require successful revalidation before returning to active.
 */
export function filterActiveRecords<T extends { integrity_status?: string }>(records: T[]): T[] {
  return (records || []).filter((r) => r.integrity_status === INTEGRITY_STATUS.ACTIVE);
}

/**
 * Validate a new uniqueness-checked record. If unique → active. If duplicate → quarantine.
 */
export async function validateUniqueness(
  base44: any,
  entity_name: string,
  record_id: string,
  uniqueness_filter: Record<string, any>
): Promise<{ is_unique: boolean; duplicate_ids: string[] }> {
  const candidates = await base44.asServiceRole.entities[entity_name].filter(uniqueness_filter);
  const duplicates = candidates.filter((r: any) => r.id !== record_id && r.integrity_status === INTEGRITY_STATUS.ACTIVE);

  if (duplicates.length === 0) {
    await base44.asServiceRole.entities[entity_name].update(record_id, {
      integrity_status: INTEGRITY_STATUS.ACTIVE,
    });
    return { is_unique: true, duplicate_ids: [] };
  }

  // Quarantine the new record — duplicate domain records are quarantined before operational use
  await base44.asServiceRole.entities[entity_name].update(record_id, {
    integrity_status: INTEGRITY_STATUS.QUARANTINED,
    quarantine_reason: "duplicate_uniqueness_violation",
    quarantined_at: new Date().toISOString(),
    resolution_status: "pending",
  });
  return { is_unique: false, duplicate_ids: duplicates.map((r: any) => r.id) };
}