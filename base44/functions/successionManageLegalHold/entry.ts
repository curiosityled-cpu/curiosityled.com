import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { findActiveHolds } from "../../shared/successionLegalHold.ts";
import { CONFIDENTIALITY_LEVELS } from "../../shared/successionConstants.ts";

/**
 * POST /successionManageLegalHold
 *
 * Actions:
 *   list    — the tenant's hold register (active and released).
 *   place   — freeze a record, a person's whole file, or a whole cycle.
 *   release — lift a freeze, keeping the hold as history.
 *
 * A hold is the one thing that outranks a retention window: while it is active
 * the covered records must not be purged, archived, withdrawn or superseded.
 * Placing and releasing both require a substantive reason and both write an
 * append-only audit event, so the freeze can be reconstructed later.
 */

// Entity types a hold may name. Deliberately narrow: a hold on an arbitrary
// table would turn this endpoint into an existence oracle.
const HOLDABLE_ENTITY_TYPES = [
  "EvidenceRecord",
  "SuccessorCandidacy",
  "ReadinessConclusion",
  "SuccessionDecisionRecord",
  "CalibrationCase",
  "CandidateSelfDisclosure",
  "SuccessionReviewRecord",
];

export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { action } = body || {};

  if (!["list", "place", "release"].includes(action)) {
    return Response.json({ error: "action must be 'list', 'place' or 'release'" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) {
    return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });
  }

  const authz = await authorizeSuccessionAction({
    base44,
    auth,
    action: "successionManageLegalHold",
    target_client_id: auth.client_id,
    required_permission: action === "list" ? "succession.governance.view" : "succession.governance.manage",
  });
  if (!authz.allowed) {
    return Response.json({ error: authz.denied_reason }, { status: 403 });
  }

  try {
    if (action === "list") {
      const holds = await base44.asServiceRole.entities.SuccessionLegalHold.filter(
        { client_id: auth.client_id },
        "-placed_at",
        200
      );
      return Response.json({ holds: holds || [] });
    }

    if (action === "place") {
      const {
        scope_type,
        target_entity_type,
        target_entity_id,
        subject_profile_id,
        cycle_id,
        matter_reference,
        reason,
      } = body;

      if (!["record", "subject", "cycle"].includes(scope_type)) {
        return Response.json({ error: "scope_type must be 'record', 'subject' or 'cycle'" }, { status: 400 });
      }
      if (!reason || String(reason).trim().length < 20) {
        return Response.json(
          { error: "A hold needs a recorded reason of at least 20 characters — a freeze with no stated reason cannot be defended." },
          { status: 400 }
        );
      }

      let subjectEmail: string | null = null;
      let resolvedCycleId: string | null = null;

      if (scope_type === "record") {
        if (!HOLDABLE_ENTITY_TYPES.includes(target_entity_type) || !target_entity_id) {
          return Response.json(
            { error: `target_entity_type must be one of: ${HOLDABLE_ENTITY_TYPES.join(", ")}` },
            { status: 400 }
          );
        }
        const rows = await base44.asServiceRole.entities[target_entity_type].filter({
          id: target_entity_id,
          client_id: auth.client_id,
        });
        if (!rows || rows.length === 0) {
          return Response.json({ error: "Record not found in this tenant" }, { status: 404 });
        }
        resolvedCycleId = rows[0].cycle_id || null;
      }

      if (scope_type === "subject") {
        if (!subject_profile_id) {
          return Response.json({ error: "subject_profile_id is required for a subject hold" }, { status: 400 });
        }
        const profiles = await base44.asServiceRole.entities.UserProfile.filter({
          id: subject_profile_id,
        }).catch(() => []);
        if (!profiles || profiles.length === 0) {
          return Response.json({ error: "Person not found in this tenant" }, { status: 404 });
        }
        subjectEmail = profiles[0].user_email || profiles[0].email || null;
      }

      if (scope_type === "cycle") {
        if (!cycle_id) {
          return Response.json({ error: "cycle_id is required for a cycle hold" }, { status: 400 });
        }
        const cycles = await base44.asServiceRole.entities.SuccessionCycle.filter({
          id: cycle_id,
          client_id: auth.client_id,
        });
        if (!cycles || cycles.length === 0) {
          return Response.json({ error: "Cycle not found in this tenant" }, { status: 404 });
        }
        resolvedCycleId = cycle_id;
      }

      const now = new Date().toISOString();
      const hold = await base44.asServiceRole.entities.SuccessionLegalHold.create({
        client_id: auth.client_id,
        scope_type,
        target_entity_type: scope_type === "record" ? target_entity_type : null,
        target_entity_id: scope_type === "record" ? target_entity_id : null,
        subject_profile_id: scope_type === "subject" ? subject_profile_id : null,
        subject_email: subjectEmail,
        cycle_id: scope_type === "cycle" ? resolvedCycleId : resolvedCycleId,
        matter_reference: matter_reference || null,
        reason: String(reason).trim(),
        status: "active",
        placed_by_profile_id: auth.profile_id,
        placed_by_email: auth.email,
        placed_at: now,
        confidentiality_level: CONFIDENTIALITY_LEVELS.LEGALLY_RESTRICTED,
      });

      await writeSuccessionAuditEvent({
        base44,
        action_type: "legal_hold_placed",
        target_entity_type: scope_type === "record" ? target_entity_type : "SuccessionLegalHold",
        target_entity_id: scope_type === "record" ? target_entity_id : hold.id,
        target_user_profile_id: scope_type === "subject" ? subject_profile_id : undefined,
        metadata: {
          hold_id: hold.id,
          scope_type,
          matter_reference: matter_reference || null,
          reason: String(reason).trim(),
          cycle_id: resolvedCycleId,
        },
        confidentiality_level: CONFIDENTIALITY_LEVELS.LEGALLY_RESTRICTED,
        event_type: "domain_action_completed",
        event_key: { action: "legal_hold_placed", hold_id: hold.id },
        target_record_id: hold.id,
      });

      return Response.json({ hold });
    }

    // ── release ──
    const { hold_id, release_reason } = body;
    if (!hold_id) return Response.json({ error: "hold_id is required" }, { status: 400 });
    if (!release_reason || String(release_reason).trim().length < 10) {
      return Response.json({ error: "A release needs a recorded reason" }, { status: 400 });
    }

    const existing = await base44.asServiceRole.entities.SuccessionLegalHold.filter({
      id: hold_id,
      client_id: auth.client_id,
    });
    const hold = existing?.[0];
    if (!hold) return Response.json({ error: "Hold not found in this tenant" }, { status: 404 });
    if (hold.status !== "active") {
      return Response.json({ error: "This hold has already been released" }, { status: 409 });
    }

    const releasedAt = new Date().toISOString();
    await base44.asServiceRole.entities.SuccessionLegalHold.update(hold_id, {
      status: "released",
      released_by_profile_id: auth.profile_id,
      released_by_email: auth.email,
      released_at: releasedAt,
      release_reason: String(release_reason).trim(),
    });

    await writeSuccessionAuditEvent({
      base44,
      action_type: "legal_hold_released",
      target_entity_type: hold.target_entity_type || "SuccessionLegalHold",
      target_entity_id: hold.target_entity_id || hold.id,
      metadata: {
        hold_id,
        scope_type: hold.scope_type,
        release_reason: String(release_reason).trim(),
        placed_at: hold.placed_at,
      },
      confidentiality_level: CONFIDENTIALITY_LEVELS.LEGALLY_RESTRICTED,
      event_type: "domain_action_completed",
      event_key: { action: "legal_hold_released", hold_id },
      target_record_id: hold_id,
    });

    // Any other active holds still covering the same target are reported, so an
    // administrator is never told a record is free when it is not.
    const stillHeld = await findActiveHolds({
      base44,
      client_id: auth.client_id,
      entity_type: hold.target_entity_type || undefined,
      record_id: hold.target_entity_id || undefined,
      subject_profile_id: hold.subject_profile_id || undefined,
      cycle_id: hold.cycle_id || undefined,
    });

    return Response.json({
      hold_id,
      status: "released",
      still_held: stillHeld.length > 0,
      remaining_holds: stillHeld.map((h) => h.id),
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}