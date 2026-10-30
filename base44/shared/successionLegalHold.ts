/**
 * successionLegalHold — server-side legal-hold evaluation for succession records.
 *
 * A hold freezes a record: it may not be purged, archived, withdrawn or
 * superseded while the hold is active. Holds are tenant-scoped and are created
 * only by the successionManageLegalHold function, always with a reason and an
 * append-only audit event.
 *
 * This module performs the matching only. Callers decide what to do with the
 * answer; a caller that mutates or destroys a record should refuse when
 * `held` is true and record the refusal.
 */

export type HoldScope = "record" | "subject" | "cycle";

export interface HoldQuery {
  base44: any;
  client_id: string;
  /** Entity type of the record being touched (scope_type=record). */
  entity_type?: string;
  /** ID of the record being touched (scope_type=record). */
  record_id?: string;
  /** UserProfile ID of the person the record concerns (scope_type=subject). */
  subject_profile_id?: string;
  /** SuccessionCycle ID the record belongs to (scope_type=cycle). */
  cycle_id?: string;
}

export interface HoldStatus {
  held: boolean;
  holds: any[];
  hold_ids: string[];
  reason_summary: string;
}

function matches(hold: any, q: HoldQuery): boolean {
  switch (hold.scope_type) {
    case "record":
      return (
        !!q.entity_type &&
        !!q.record_id &&
        hold.target_entity_type === q.entity_type &&
        hold.target_entity_id === q.record_id
      );
    case "subject":
      return !!q.subject_profile_id && hold.subject_profile_id === q.subject_profile_id;
    case "cycle":
      return !!q.cycle_id && hold.cycle_id === q.cycle_id;
    default:
      return false;
  }
}

/**
 * findActiveHolds — the active holds covering the given record.
 * Reads through the service role: the check must run for any caller that is
 * about to touch the record, including callers with narrow read rights.
 */
export async function findActiveHolds(q: HoldQuery): Promise<any[]> {
  if (!q?.client_id) return [];
  let holds: any[] = [];
  try {
    holds = await q.base44.asServiceRole.entities.SuccessionLegalHold.filter({
      client_id: q.client_id,
      status: "active",
    });
  } catch {
    return [];
  }
  return (holds || []).filter((h) => matches(h, q));
}

/**
 * checkHolds — whether the record is frozen, and by which holds.
 * `reason_summary` is safe to show an administrator: it names the matter, not
 * the confidential detail behind it.
 */
export async function checkHolds(q: HoldQuery): Promise<HoldStatus> {
  const holds = await findActiveHolds(q);
  return {
    held: holds.length > 0,
    holds,
    hold_ids: holds.map((h) => h.id),
    reason_summary:
      holds.length === 0
        ? ""
        : holds
            .map((h) => h.matter_reference || h.reason || "legal hold")
            .join("; "),
  };
}