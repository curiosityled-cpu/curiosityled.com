import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateActionContext, validateTenantReference } from "../../shared/successionDevelopmentValidator.ts";

const VALID_ACTION_TYPES = [
  "learning", "coaching", "stretch_assignment", "critical_experience",
  "credential", "business_goal", "other",
];

/**
 * POST /successionCreateDevelopmentAction
 *
 * Creates a DevelopmentAction within a plan link. Validates:
 * - plan link is active or draft
 * - linked condition belongs to the conclusion
 * - linked frozen requirement belongs to the bound snapshot
 * - owner and linked resources belong to the tenant
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, development_plan_link_id, action_type, title, description,
    owner_profile_id, due_date, milestone_text,
    readiness_condition_id, effective_requirement_snapshot_id,
    linked_resource_id, linked_goal_id, linked_coaching_engagement_id } = body;

  if (!operation_id || !development_plan_link_id || !action_type || !title || !description ||
      !owner_profile_id || !due_date || !milestone_text) {
    return Response.json({ error: "operation_id, development_plan_link_id, action_type, title, description, owner_profile_id, due_date, milestone_text required" }, { status: 400 });
  }

  if (!VALID_ACTION_TYPES.includes(action_type)) {
    return Response.json({ error: "Invalid action_type" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionCreateDevelopmentAction",
    target_client_id: auth.client_id,
    required_permission: "succession.development.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionCreateDevelopmentAction",
    payload: { development_plan_link_id, action_type },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // ── Validate action context (plan link, condition, requirement) ──
    const ctx = await validateActionContext(
      base44, auth.client_id, development_plan_link_id,
      readiness_condition_id || null, effective_requirement_snapshot_id || null,
      opResult.operation.id
    );
    if (!ctx.valid) {
      await failOperation(base44, opResult.operation.id, ctx.error_code);
      return Response.json({ error: ctx.error_message }, { status: 400 });
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

    // ── Create the action ──
    const now = new Date().toISOString();
    const action = await base44.asServiceRole.entities.DevelopmentAction.create({
      client_id: auth.client_id,
      development_plan_link_id,
      candidacy_id: ctx.plan_link.candidacy_id,
      readiness_condition_id: readiness_condition_id || null,
      effective_requirement_snapshot_id: effective_requirement_snapshot_id || null,
      action_type,
      title, description,
      owner_profile_id,
      linked_resource_id: linked_resource_id || null,
      linked_goal_id: linked_goal_id || null,
      linked_coaching_engagement_id: linked_coaching_engagement_id || null,
      due_date, milestone_text,
      status: "not_started",
      confidentiality_level: "confidential",
      integrity_status: "active",
      created_by_profile_id: auth.profile_id,
      created_at: now,
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "development_action_created",
      target_entity_type: "DevelopmentAction", target_entity_id: action.id,
      metadata: {
        development_plan_link_id, action_type, candidacy_id: ctx.plan_link.candidacy_id,
        readiness_condition_id: readiness_condition_id || null,
        effective_requirement_snapshot_id: effective_requirement_snapshot_id || null,
      },
      operation_id, event_key: { action: "development_action_created", plan_link_id: development_plan_link_id, action_type },
      event_type: "domain_action_completed", target_record_id: action.id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      action_id: action.id, status: "not_started",
    });

    return Response.json({ operation_id, action_id: action.id, status: "not_started" });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "create_development_action_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}