import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionUpdateKnowledgeTransferArea
 *
 * Advances ONE knowledge area inside a KnowledgeTransferPlan:
 * not_started → in_progress → completed, or waived with a stated reason.
 *
 * Execution is recorded separately from planning so the hand-over has a trail:
 * each change writes an audit event with the previous and new state, who did
 * it, and why a waiver was granted. The plan's own status is not changed here —
 * finishing the plan is the initiation's completion, which is gated on every
 * area being completed or waived.
 *
 * Does not touch readiness, candidacy, or the employee record.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, plan_id, area_index, expected_title, status, waiver_reason } = body;

  if (!operation_id || !plan_id || area_index === undefined || area_index === null || !status) {
    return Response.json({ error: "operation_id, plan_id, area_index, status required" }, { status: 400 });
  }

  const ALLOWED = ["not_started", "in_progress", "completed", "waived"];
  if (!ALLOWED.includes(status)) {
    return Response.json({ error: "Invalid knowledge area status" }, { status: 400 });
  }
  if (status === "waived" && !(waiver_reason && String(waiver_reason).trim())) {
    return Response.json({ error: "A waiver requires a stated reason" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionUpdateKnowledgeTransferArea",
    target_client_id: auth.client_id,
    required_permission: "succession.transition.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionUpdateKnowledgeTransferArea",
    payload: { plan_id, area_index, status },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // ── Load the plan (tenant-scoped) ──
    const plan = await validateSameTenantReference(base44, "KnowledgeTransferPlan", plan_id, auth.client_id);
    if (!plan) {
      await writeDeniedReferenceEvent(base44, auth, "KnowledgeTransferPlan", plan_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "plan_not_found");
      return Response.json({ error: "Knowledge transfer plan not found" }, { status: 404 });
    }
    if (plan.status === "completed" || plan.status === "cancelled") {
      await failOperation(base44, opResult.operation.id, "plan_closed");
      return Response.json({ error: "This plan is closed and can no longer be changed" }, { status: 409 });
    }

    // ── The initiation must be live ──
    const initiation = await validateSameTenantReference(
      base44, "TransitionInitiation", plan.transition_initiation_id, auth.client_id,
    );
    if (!initiation) {
      await failOperation(base44, opResult.operation.id, "initiation_not_found");
      return Response.json({ error: "Transition initiation not found" }, { status: 404 });
    }
    if (!["approved", "in_progress"].includes(initiation.status)) {
      await failOperation(base44, opResult.operation.id, "initiation_not_live");
      return Response.json({ error: "Knowledge transfer can only be updated while the transition is approved or in progress" }, { status: 409 });
    }

    const areas = Array.isArray(plan.knowledge_areas) ? [...plan.knowledge_areas] : [];
    if (area_index < 0 || area_index >= areas.length) {
      await failOperation(base44, opResult.operation.id, "area_index_out_of_range");
      return Response.json({ error: "Knowledge area not found on this plan" }, { status: 404 });
    }

    const current = areas[area_index] || {};
    // Optimistic guard: the caller states which area it believes it is changing.
    if (expected_title && current.title && expected_title !== current.title) {
      await failOperation(base44, opResult.operation.id, "area_title_mismatch");
      return Response.json({ error: "The plan changed since it was loaded — reload and try again" }, { status: 409 });
    }

    const now = new Date().toISOString();
    const updatedArea = {
      ...current,
      status,
      waiver_reason: status === "waived" ? String(waiver_reason).trim() : null,
      status_updated_at: now,
      status_updated_by_profile_id: auth.profile_id || null,
    };
    areas[area_index] = updatedArea;

    await base44.asServiceRole.entities.KnowledgeTransferPlan.update(plan_id, {
      knowledge_areas: areas,
    });

    const done = areas.filter((a: any) => a.status === "completed" || a.status === "waived").length;
    const progress = {
      plan_id,
      total: areas.length,
      done,
      open: areas.length - done,
      pct: areas.length ? Math.round((done / areas.length) * 100) : 0,
    };

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "knowledge_transfer_area_updated",
      target_entity_type: "KnowledgeTransferPlan", target_entity_id: plan_id,
      metadata: {
        plan_id,
        transition_initiation_id: plan.transition_initiation_id,
        area_index,
        area_title: current.title || null,
        from_status: current.status || null,
        to_status: status,
        waiver_reason: status === "waived" ? String(waiver_reason).trim() : null,
        progress,
        readiness_unchanged: true,
        candidacy_unchanged: true,
      },
      operation_id, event_key: { action: "kt_area_updated", plan_id, area_index, status },
      event_type: "domain_action_completed", target_record_id: plan_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      plan_id, area_index, status, progress,
    });

    return Response.json({
      operation_id, plan_id, area_index,
      area: updatedArea,
      progress,
      readiness_unchanged: true,
      candidacy_unchanged: true,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "update_knowledge_transfer_area_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}