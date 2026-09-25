import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionUpdateReadinessConditionStatus
 *
 * Updates the status of a ReadinessCondition. Condition changes NEVER
 * automatically change readiness — conditions are tracked independently
 * and require a new conclusion version to affect readiness.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, condition_id, status, waiver_reason } = body;

  if (!operation_id || !condition_id || !status) {
    return Response.json({ error: "operation_id, condition_id, status required" }, { status: 400 });
  }

  const validStatuses = ["open", "in_progress", "met", "not_met", "waived"];
  if (!validStatuses.includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  if (status === "waived" && (!waiver_reason || !waiver_reason.trim())) {
    return Response.json({ error: "waiver_reason is required when status is waived" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionUpdateReadinessConditionStatus",
    target_client_id: auth.client_id,
    required_permission: "succession.deliberate.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionUpdateReadinessConditionStatus",
    payload: { condition_id, status, waiver_reason },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // ── Load the condition ──
    const condition = await validateSameTenantReference(
      base44, "ReadinessCondition", condition_id, auth.client_id
    );
    if (!condition) {
      await writeDeniedReferenceEvent(base44, auth, "ReadinessCondition", condition_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "condition_not_found");
      return Response.json({ error: "Condition not found" }, { status: 404 });
    }

    // ── Update the condition status ──
    const updateData: any = {
      status,
      updated_by_profile_id: auth.profile_id,
      updated_at: new Date().toISOString(),
    };
    if (status === "waived") {
      updateData.waiver_reason = waiver_reason;
    }

    await base44.asServiceRole.entities.ReadinessCondition.update(condition_id, updateData);

    // ── CRITICAL: Condition changes NEVER change readiness ──
    // We do NOT touch the ReadinessConclusion. The conclusion's workflow_status
    // and ratified_value remain unchanged. A condition status change is an
    // independent tracking event. To change readiness, a new conclusion version
    // must be created via successionSaveReadinessDraft with supersedes_conclusion_id.

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "condition_status_updated",
      target_entity_type: "ReadinessCondition", target_entity_id: condition_id,
      metadata: {
        readiness_conclusion_id: condition.readiness_conclusion_id,
        old_status: condition.status,
        new_status: status,
        waiver_reason: status === "waived" ? waiver_reason : null,
        note: "condition_change_does_not_update_readiness",
      },
      operation_id, event_key: { action: "condition_status_updated", condition_id, status },
      event_type: "domain_action_completed", target_record_id: condition_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      condition_id, new_status: status,
    });

    return Response.json({
      operation_id, condition_id, new_status: status,
      note: "Condition status updated. Readiness conclusion is unchanged — condition changes do not affect readiness.",
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "update_condition_status_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}