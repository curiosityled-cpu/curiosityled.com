import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";
import { validateLinkedDevelopmentPlan } from "../../shared/successionDevelopmentValidator.ts";

/**
 * POST /successionUpdateDevelopmentPlanLink
 *
 * Updates a DevelopmentPlanLink: status, gap_summary, review_date,
 * reassessment_date, linked_development_plan_id, completion_summary.
 * A completed plan does not change readiness automatically.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, plan_link_id, status, gap_summary, review_date, reassessment_date,
    linked_development_plan_id, completion_summary } = body;

  if (!operation_id || !plan_link_id) {
    return Response.json({ error: "operation_id, plan_link_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionUpdateDevelopmentPlanLink",
    target_client_id: auth.client_id,
    required_permission: "succession.development.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionUpdateDevelopmentPlanLink",
    payload: { plan_link_id, status },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // ── Load the plan link ──
    const planLink = await validateSameTenantReference(
      base44, "DevelopmentPlanLink", plan_link_id, auth.client_id
    );
    if (!planLink) {
      await writeDeniedReferenceEvent(base44, auth, "DevelopmentPlanLink", plan_link_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "plan_link_not_found");
      return Response.json({ error: "Plan link not found" }, { status: 404 });
    }

    // ── If linked_development_plan_id provided, validate tenant ownership ──
    if (linked_development_plan_id) {
      const planCheck = await validateLinkedDevelopmentPlan(base44, auth.client_id, linked_development_plan_id);
      if (!planCheck.valid) {
        await failOperation(base44, opResult.operation.id, planCheck.error_code);
        return Response.json({ error: planCheck.error_message }, { status: 400 });
      }
    }

    // ── Build update data ──
    const updateData: any = {};
    if (status) updateData.status = status;
    if (gap_summary !== undefined) updateData.gap_summary = gap_summary;
    if (review_date) updateData.review_date = review_date;
    if (reassessment_date !== undefined) updateData.reassessment_date = reassessment_date;
    if (linked_development_plan_id !== undefined) updateData.linked_development_plan_id = linked_development_plan_id;
    if (completion_summary !== undefined) updateData.completion_summary = completion_summary;

    // ── If status is completed, set completed_at ──
    if (status === "completed") {
      updateData.completed_at = new Date().toISOString();
    }

    await base44.asServiceRole.entities.DevelopmentPlanLink.update(plan_link_id, updateData);

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "development_plan_link_updated",
      target_entity_type: "DevelopmentPlanLink", target_entity_id: plan_link_id,
      metadata: { plan_link_id, updated_fields: Object.keys(updateData), status: status || planLink.status },
      operation_id, event_key: { action: "development_plan_link_updated", plan_link_id },
      event_type: "domain_action_completed", target_record_id: plan_link_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      plan_link_id, status: status || planLink.status,
    });

    return Response.json({ operation_id, plan_link_id, status: status || planLink.status });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "update_development_plan_link_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}