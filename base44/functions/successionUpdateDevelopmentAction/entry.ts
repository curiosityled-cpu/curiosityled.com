import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";
import { validateTenantReference } from "../../shared/successionDevelopmentValidator.ts";

const VALID_STATUSES = ["not_started", "in_progress", "completed", "cancelled"];

/**
 * POST /successionUpdateDevelopmentAction
 *
 * Updates a DevelopmentAction: title, description, due_date, milestone_text,
 * status, linked resources. Does not complete the action (use
 * successionCompleteDevelopmentAction for that).
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, action_id, title, description, due_date, milestone_text,
    status, linked_resource_id, linked_goal_id, linked_coaching_engagement_id } = body;

  if (!operation_id || !action_id) {
    return Response.json({ error: "operation_id, action_id required" }, { status: 400 });
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionUpdateDevelopmentAction",
    target_client_id: auth.client_id,
    required_permission: "succession.development.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionUpdateDevelopmentAction",
    payload: { action_id, status },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // ── Load the action ──
    const action = await validateSameTenantReference(
      base44, "DevelopmentAction", action_id, auth.client_id
    );
    if (!action) {
      await writeDeniedReferenceEvent(base44, auth, "DevelopmentAction", action_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "action_not_found");
      return Response.json({ error: "Action not found" }, { status: 404 });
    }

    // ── Validate linked resources belong to tenant ──
    if (linked_resource_id) {
      const ref = await validateTenantReference(base44, auth.client_id, "LearningResource", linked_resource_id);
      if (!ref.valid) { await failOperation(base44, opResult.operation.id, ref.error_code); return Response.json({ error: ref.error_message }, { status: 400 }); }
    }
    if (linked_goal_id) {
      const ref = await validateTenantReference(base44, auth.client_id, "Goal", linked_goal_id);
      if (!ref.valid) { await failOperation(base44, opResult.operation.id, ref.error_code); return Response.json({ error: ref.error_message }, { status: 400 }); }
    }
    if (linked_coaching_engagement_id) {
      const ref = await validateTenantReference(base44, auth.client_id, "CoachingEngagement", linked_coaching_engagement_id);
      if (!ref.valid) { await failOperation(base44, opResult.operation.id, ref.error_code); return Response.json({ error: ref.error_message }, { status: 400 }); }
    }

    // ── Build update data ──
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (due_date) updateData.due_date = due_date;
    if (milestone_text !== undefined) updateData.milestone_text = milestone_text;
    if (status) updateData.status = status;
    if (linked_resource_id !== undefined) updateData.linked_resource_id = linked_resource_id;
    if (linked_goal_id !== undefined) updateData.linked_goal_id = linked_goal_id;
    if (linked_coaching_engagement_id !== undefined) updateData.linked_coaching_engagement_id = linked_coaching_engagement_id;

    await base44.asServiceRole.entities.DevelopmentAction.update(action_id, updateData);

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "development_action_updated",
      target_entity_type: "DevelopmentAction", target_entity_id: action_id,
      metadata: { action_id, updated_fields: Object.keys(updateData), status: status || action.status },
      operation_id, event_key: { action: "development_action_updated", action_id },
      event_type: "domain_action_completed", target_record_id: action_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      action_id, status: status || action.status,
    });

    return Response.json({ operation_id, action_id, status: status || action.status });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "update_development_action_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}