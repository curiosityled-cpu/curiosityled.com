import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionRecordDecision
 *
 * The write path for the succession Decision Record — the single ratifiable
 * artefact that states what was decided, for which role, against which
 * blueprint version, on what reasons, by whom, and who countersigned it.
 *
 * actions:
 *   record  — creates a record in awaiting_ratification. Requires a stated
 *             reason for EVERY candidate considered, not just the selected one,
 *             because "why not them" is the question that gets litigated.
 *   ratify  — countersigns it. The ratifier must be a different person from the
 *             recorder, and only one decision per role/cycle may be ratified
 *             unless it explicitly supersedes the previous one.
 *   return  — sends it back with what must change.
 *
 * Records are never edited in place after ratification. A correction creates a
 * new version that supersedes the prior one; both stay readable.
 */
export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, action, decision_id } = body;

  if (!operation_id || !action) {
    return Response.json({ error: "operation_id and action are required" }, { status: 400 });
  }
  if (!["record", "ratify", "return"].includes(action)) {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) {
    return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });
  }

  const authz = await authorizeSuccessionAction({
    base44,
    auth,
    action: "successionRecordDecision",
    target_client_id: auth.client_id,
    required_permission: "succession.readiness.ratify",
  });
  if (!authz.allowed) {
    return Response.json({ error: authz.denied_reason }, { status: 403 });
  }

  const opPayload = {
    action,
    decision_id: decision_id || null,
    cycle_id: body.cycle_id || null,
    role_id: body.role_id || null,
    decision_type: body.decision_type || null,
  };

  const opResult = await createOrAttachOperation({
    base44,
    client_id: auth.client_id,
    operation_id,
    function_name: "successionRecordDecision",
    payload: opPayload,
    actor_profile_id: auth.profile_id,
    actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) {
    return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  }
  if (opResult.is_duplicate) {
    return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });
  }

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    if (action === "record") {
      return await handleRecord();
    }
    return await handleCounterSignature();
  } catch (error) {
    await failOperation(base44, opResult.operation.id, (error as Error).message || "unexpected_error");
    return Response.json({ error: "The decision could not be recorded. Please try again." }, { status: 500 });
  }

  // ───────────────────────────────────────────────────────────────────────────
  async function handleRecord(): Promise<Response> {
    const {
      cycle_id,
      role_id,
      role_title,
      decision_type,
      considered: rawConsidered,
      rationale,
      panel,
      evidence_reference_ids,
      blueprint_snapshot_id,
      blueprint_version,
      supersedes_id,
    } = body;

    const decisionTypes = ["select_successor", "no_viable_successor", "develop_and_revisit", "defer"];
    if (!cycle_id || !decision_type || !decisionTypes.includes(decision_type)) {
      await failOperation(base44, opResult.operation.id, "invalid_decision_type");
      return Response.json({ error: "cycle_id and a valid decision_type are required" }, { status: 400 });
    }
    if (!role_title || !String(role_title).trim()) {
      await failOperation(base44, opResult.operation.id, "role_title_required");
      return Response.json({ error: "role_title is required" }, { status: 400 });
    }
    if (!rationale || String(rationale).trim().length < 20) {
      await failOperation(base44, opResult.operation.id, "rationale_too_short");
      return Response.json({ error: "A rationale of at least 20 characters is required" }, { status: 400 });
    }

    const considered = Array.isArray(rawConsidered) ? rawConsidered : [];
    if (considered.length === 0) {
      await failOperation(base44, opResult.operation.id, "no_candidates_considered");
      return Response.json({ error: "At least one candidate must be recorded as considered" }, { status: 400 });
    }
    const outcomes = ["selected", "alternate", "not_selected", "withdrawn", "declined"];
    const dirty = considered.find(
      (c: any) =>
        !c?.candidate_email ||
        !outcomes.includes(c?.outcome) ||
        !c?.reason ||
        String(c.reason).trim().length < 10
    );
    if (dirty) {
      await failOperation(base44, opResult.operation.id, "incomplete_candidate_reason");
      return Response.json(
        { error: "Every candidate needs a valid outcome and a reason of at least 10 characters" },
        { status: 400 }
      );
    }

    const selectedRows = considered.filter((c: any) => c.outcome === "selected");
    if (decision_type === "select_successor") {
      if (selectedRows.length !== 1) {
        await failOperation(base44, opResult.operation.id, "selected_candidate_required");
        return Response.json(
          { error: "Exactly one candidate must be marked selected for a successor decision" },
          { status: 400 }
        );
      }
    } else if (selectedRows.length > 0) {
      await failOperation(base44, opResult.operation.id, "selected_not_allowed");
      return Response.json(
        { error: "A decision that does not select a successor cannot mark a candidate as selected" },
        { status: 400 }
      );
    }

    const cycle = await validateSameTenantReference(base44, "SuccessionCycle", cycle_id, auth.client_id);
    if (!cycle) {
      await failOperation(base44, opResult.operation.id, "cycle_not_found");
      return Response.json({ error: "Cycle not found" }, { status: 404 });
    }

    if (role_id) {
      const role = await validateSameTenantReference(base44, "CriticalRole", role_id, auth.client_id);
      if (!role) {
        await failOperation(base44, opResult.operation.id, "role_not_found");
        return Response.json({ error: "Critical role not found" }, { status: 404 });
      }
    }

    const selected = selectedRows[0] || null;

    const created = await base44.asServiceRole.entities.SuccessionDecisionRecord.create({
      client_id: auth.client_id,
      cycle_id,
      cycle_name: cycle.name || null,
      role_id: role_id || null,
      role_title: String(role_title).trim(),
      blueprint_snapshot_id: blueprint_snapshot_id || null,
      blueprint_version: blueprint_version ?? null,
      decision_type,
      selected_candidate_email: selected?.candidate_email || null,
      selected_candidate_name: selected?.candidate_name || null,
      selected_candidacy_id: selected?.candidacy_id || null,
      selected_readiness_value: selected?.readiness_value || null,
      considered: considered.map((c: any) => ({
        candidate_email: c.candidate_email,
        candidate_name: c.candidate_name || null,
        candidacy_id: c.candidacy_id || null,
        readiness_value: c.readiness_value || null,
        outcome: c.outcome,
        reason: String(c.reason).trim(),
      })),
      panel: Array.isArray(panel) ? panel.filter((p: any) => p?.email || p?.name) : [],
      evidence_reference_ids: Array.isArray(evidence_reference_ids) ? evidence_reference_ids : [],
      rationale: String(rationale).trim(),
      status: "awaiting_ratification",
      version: supersedes_id ? 2 : 1,
      supersedes_id: supersedes_id || null,
      recorded_by_profile_id: auth.profile_id || null,
      recorded_by_email: auth.email || null,
      recorded_at: new Date().toISOString(),
      confidentiality_level: "restricted",
      integrity_status: "active",
    });

    if (supersedes_id) {
      await base44.asServiceRole.entities.SuccessionDecisionRecord.update(supersedes_id, {
        status: "superseded",
      });
    }

    const audit = await writeSuccessionAuditEvent({
      base44,
      action_type: "decision_recorded",
      event_type: "decision_recorded",
      target_entity_type: "SuccessionDecisionRecord",
      target_entity_id: created.id,
      operation_id: opResult.operation.id,
      event_key: { action: "decision_recorded", decision_id: created.id },
      metadata: {
        cycle_id,
        role_id: role_id || null,
        role_title: String(role_title).trim(),
        decision_type,
        selected_candidate_email: selected?.candidate_email || null,
        considered_count: considered.length,
        supersedes_id: supersedes_id || null,
      },
    });

    await completeOperation(base44, opResult.operation.id, audit?.id || "", {
      decision_id: created.id,
      status: "awaiting_ratification",
    });

    return Response.json({ decision: created, status: "awaiting_ratification" });
  }

  // ───────────────────────────────────────────────────────────────────────────
  async function handleCounterSignature(): Promise<Response> {
    if (!decision_id) {
      await failOperation(base44, opResult.operation.id, "decision_id_required");
      return Response.json({ error: "decision_id is required" }, { status: 400 });
    }

    const decision = await validateSameTenantReference(
      base44,
      "SuccessionDecisionRecord",
      decision_id,
      auth.client_id
    );
    if (!decision) {
      await failOperation(base44, opResult.operation.id, "decision_not_found");
      return Response.json({ error: "Decision record not found" }, { status: 404 });
    }

    if (decision.status !== "awaiting_ratification") {
      await failOperation(base44, opResult.operation.id, "invalid_state");
      return Response.json({ error: "Only a decision awaiting ratification can be actioned" }, { status: 409 });
    }

    // Separation of duties: the person who recorded the decision cannot ratify it.
    if (decision.recorded_by_profile_id && decision.recorded_by_profile_id === auth.profile_id) {
      await writeSuccessionAuditEvent({
        base44,
        action_type: "denied_action",
        event_type: "denied_action",
        target_entity_type: "SuccessionDecisionRecord",
        target_entity_id: decision_id,
        operation_id: opResult.operation.id,
        event_key: { action: "denied_self_ratify_decision", decision_id },
        metadata: {
          action: "successionRecordDecision",
          denied_reason: "recorder_cannot_ratify",
          actor_profile_id: auth.profile_id,
        },
      });
      await failOperation(base44, opResult.operation.id, "recorder_cannot_ratify");
      return Response.json(
        { error: "The person who recorded the decision cannot ratify it. A second approver is required." },
        { status: 403 }
      );
    }

    if (action === "return") {
      const note = String(body.return_note || "").trim();
      if (note.length < 10) {
        await failOperation(base44, opResult.operation.id, "return_note_required");
        return Response.json({ error: "Returning a decision requires a note on what must change" }, { status: 400 });
      }

      const updated = await base44.asServiceRole.entities.SuccessionDecisionRecord.update(decision_id, {
        status: "returned",
        returned_by_email: auth.email || null,
        returned_at: new Date().toISOString(),
        return_note: note,
      });

      const audit = await writeSuccessionAuditEvent({
        base44,
        action_type: "decision_returned",
        event_type: "decision_returned",
        target_entity_type: "SuccessionDecisionRecord",
        target_entity_id: decision_id,
        operation_id: opResult.operation.id,
        event_key: { action: "decision_returned", decision_id },
        metadata: { cycle_id: decision.cycle_id, role_title: decision.role_title, return_note: note },
      });
      await completeOperation(base44, opResult.operation.id, audit?.id || "", {
        decision_id,
        status: "returned",
      });
      return Response.json({ decision: updated, status: "returned" });
    }

    const note = String(body.ratification_note || "").trim();
    if (note.length < 10) {
      await failOperation(base44, opResult.operation.id, "ratification_note_required");
      return Response.json({ error: "Ratification requires a note of at least 10 characters" }, { status: 400 });
    }

    // One ratified decision per role per cycle, unless it supersedes the prior one.
    const ratified = await base44.asServiceRole.entities.SuccessionDecisionRecord.filter({
      client_id: auth.client_id,
      cycle_id: decision.cycle_id,
      role_title: decision.role_title,
      status: "ratified",
    });
    const conflicting = (ratified || []).filter((r: any) => r.id !== decision.id && r.id !== decision.supersedes_id);
    if (conflicting.length > 0) {
      await failOperation(base44, opResult.operation.id, "decision_already_ratified");
      return Response.json(
        { error: "A ratified decision already exists for this role in this cycle. Record a superseding decision instead." },
        { status: 409 }
      );
    }

    const updated = await base44.asServiceRole.entities.SuccessionDecisionRecord.update(decision_id, {
      status: "ratified",
      ratified_by_profile_id: auth.profile_id || null,
      ratified_by_email: auth.email || null,
      ratified_at: new Date().toISOString(),
      ratification_note: note,
    });

    const audit = await writeSuccessionAuditEvent({
      base44,
      action_type: "decision_ratified",
      event_type: "decision_ratified",
      target_entity_type: "SuccessionDecisionRecord",
      target_entity_id: decision_id,
      operation_id: opResult.operation.id,
      event_key: { action: "decision_ratified", decision_id },
      metadata: {
        cycle_id: decision.cycle_id,
        role_title: decision.role_title,
        decision_type: decision.decision_type,
        selected_candidate_email: decision.selected_candidate_email || null,
        recorded_by_email: decision.recorded_by_email || null,
        ratification_note: note,
      },
    });

    await completeOperation(base44, opResult.operation.id, audit?.id || "", {
      decision_id,
      status: "ratified",
    });

    return Response.json({ decision: updated, status: "ratified" });
  }
}