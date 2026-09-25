import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validatePlanLinkChain, validateLinkedDevelopmentPlan } from "../../shared/successionDevelopmentValidator.ts";

/**
 * POST /successionCreateDevelopmentPlanLink
 *
 * Creates a DevelopmentPlanLink connecting a readiness conclusion to an
 * optional existing DevelopmentPlan. Validates:
 * - candidacy exists and is active
 * - conclusion belongs to the candidacy
 * - conclusion is ratified, overridden, or returned for development
 * - snapshot matches both
 * - linked DevelopmentPlan belongs to the same tenant
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, candidacy_id, readiness_conclusion_id, effective_blueprint_snapshot_id,
    gap_summary, owner_profile_id, review_date, linked_development_plan_id, reassessment_date } = body;

  if (!operation_id || !candidacy_id || !readiness_conclusion_id || !effective_blueprint_snapshot_id || !gap_summary || !owner_profile_id || !review_date) {
    return Response.json({ error: "operation_id, candidacy_id, readiness_conclusion_id, effective_blueprint_snapshot_id, gap_summary, owner_profile_id, review_date required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionCreateDevelopmentPlanLink",
    target_client_id: auth.client_id,
    required_permission: "succession.development.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionCreateDevelopmentPlanLink",
    payload: { candidacy_id, readiness_conclusion_id, effective_blueprint_snapshot_id },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // ── Validate the plan link chain ──
    const chain = await validatePlanLinkChain(
      base44, auth.client_id, candidacy_id, readiness_conclusion_id,
      effective_blueprint_snapshot_id, opResult.operation.id
    );
    if (!chain.valid) {
      await failOperation(base44, opResult.operation.id, chain.error_code);
      return Response.json({ error: chain.error_message }, { status: 400 });
    }

    // ── If linked_development_plan_id provided, validate it belongs to the tenant ──
    if (linked_development_plan_id) {
      const planCheck = await validateLinkedDevelopmentPlan(base44, auth.client_id, linked_development_plan_id);
      if (!planCheck.valid) {
        await failOperation(base44, opResult.operation.id, planCheck.error_code);
        return Response.json({ error: planCheck.error_message }, { status: 400 });
      }
    }

    // ── Create the plan link ──
    const now = new Date().toISOString();
    const planLink = await base44.asServiceRole.entities.DevelopmentPlanLink.create({
      client_id: auth.client_id,
      candidacy_id,
      readiness_conclusion_id,
      linked_development_plan_id: linked_development_plan_id || null,
      effective_blueprint_snapshot_id,
      gap_summary,
      owner_profile_id,
      status: "draft",
      review_date,
      reassessment_date: reassessment_date || null,
      confidentiality_level: "confidential",
      integrity_status: "active",
      created_by_profile_id: auth.profile_id,
      created_at: now,
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "development_plan_link_created",
      target_entity_type: "DevelopmentPlanLink", target_entity_id: planLink.id,
      metadata: {
        candidacy_id, readiness_conclusion_id,
        conclusion_status: chain.conclusion.workflow_status,
        linked_development_plan_id: linked_development_plan_id || null,
      },
      operation_id, event_key: { action: "development_plan_link_created", candidacy_id, readiness_conclusion_id },
      event_type: "domain_action_completed", target_record_id: planLink.id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      plan_link_id: planLink.id, status: "draft",
    });

    return Response.json({ operation_id, plan_link_id: planLink.id, status: "draft" });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "create_development_plan_link_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}