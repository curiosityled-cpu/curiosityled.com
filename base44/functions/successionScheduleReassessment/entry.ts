import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionScheduleReassessment
 *
 * Updates the reassessment_date on a DevelopmentPlanLink.
 * Does not change readiness, candidacy status, or any conclusion.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, plan_link_id, reassessment_date } = body;

  if (!operation_id || !plan_link_id || !reassessment_date) {
    return Response.json({ error: "operation_id, plan_link_id, reassessment_date required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionScheduleReassessment",
    target_client_id: auth.client_id,
    required_permission: "succession.development.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionScheduleReassessment",
    payload: { plan_link_id, reassessment_date },
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

    // ── Update reassessment_date ──
    await base44.asServiceRole.entities.DevelopmentPlanLink.update(plan_link_id, {
      reassessment_date,
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "reassessment_scheduled",
      target_entity_type: "DevelopmentPlanLink", target_entity_id: plan_link_id,
      metadata: { plan_link_id, reassessment_date, readiness_unchanged: true },
      operation_id, event_key: { action: "reassessment_scheduled", plan_link_id },
      event_type: "domain_action_completed", target_record_id: plan_link_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      plan_link_id, reassessment_date,
    });

    return Response.json({ operation_id, plan_link_id, reassessment_date, readiness_unchanged: true });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "schedule_reassessment_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}