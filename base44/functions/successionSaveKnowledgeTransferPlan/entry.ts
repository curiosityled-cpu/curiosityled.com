import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateInitiationForPlan, validateProfileTenant } from "../../shared/successionTransitionValidator.ts";

/**
 * POST /successionSaveKnowledgeTransferPlan
 *
 * Creates or updates a KnowledgeTransferPlan for a transition initiation.
 * Initiation must be approved or in_progress. Validates that waived knowledge
 * areas have waiver_reason. Completion does not create a PositionAssignment.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, transition_initiation_id, plan_id,
    incumbent_profile_id, owner_profile_id,
    knowledge_areas, access_handoffs, stakeholder_handoffs, documentation_locations,
    start_date, target_completion_date, status } = body;

  if (!operation_id || !transition_initiation_id || !owner_profile_id || !start_date || !target_completion_date) {
    return Response.json({ error: "operation_id, transition_initiation_id, owner_profile_id, start_date, target_completion_date required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionSaveKnowledgeTransferPlan",
    target_client_id: auth.client_id,
    required_permission: "succession.transition.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionSaveKnowledgeTransferPlan",
    payload: { transition_initiation_id, plan_id },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // ── Validate initiation exists and is approved/in_progress ──
    const initCheck = await validateInitiationForPlan(base44, auth.client_id, transition_initiation_id, opResult.operation.id);
    if (!initCheck.valid) {
      await failOperation(base44, opResult.operation.id, initCheck.error_code);
      return Response.json({ error: initCheck.error_message }, { status: 400 });
    }
    const initiation = initCheck.initiation;

    // ── Validate owner belongs to tenant ──
    const ownerCheck = await validateProfileTenant(base44, auth.client_id, owner_profile_id);
    if (!ownerCheck.valid) {
      await failOperation(base44, opResult.operation.id, ownerCheck.error_code);
      return Response.json({ error: ownerCheck.error_message }, { status: 400 });
    }

    // ── Validate incumbent if provided ──
    if (incumbent_profile_id) {
      const incCheck = await validateProfileTenant(base44, auth.client_id, incumbent_profile_id);
      if (!incCheck.valid) {
        await failOperation(base44, opResult.operation.id, incCheck.error_code);
        return Response.json({ error: incCheck.error_message }, { status: 400 });
      }
    }

    // ── Validate knowledge areas: waived requires waiver_reason ──
    if (knowledge_areas && Array.isArray(knowledge_areas)) {
      for (const area of knowledge_areas) {
        if (area.status === "waived" && (!area.waiver_reason || !area.waiver_reason.trim())) {
          await failOperation(base44, opResult.operation.id, "waiver_reason_required");
          return Response.json({ error: "Waived knowledge areas require waiver_reason" }, { status: 400 });
        }
        // Validate area owner belongs to tenant
        if (area.owner_profile_id) {
          const areaOwnerCheck = await validateProfileTenant(base44, auth.client_id, area.owner_profile_id);
          if (!areaOwnerCheck.valid) {
            await failOperation(base44, opResult.operation.id, "area_owner_not_found");
            return Response.json({ error: "Knowledge area owner not found in tenant" }, { status: 400 });
          }
        }
      }
    }

    const planData: any = {
      client_id: auth.client_id,
      transition_initiation_id,
      org_position_id: initiation.org_position_id,
      incumbent_profile_id: incumbent_profile_id || null,
      successor_profile_id: initiation.successor_profile_id,
      owner_profile_id,
      knowledge_areas: knowledge_areas || [],
      access_handoffs: access_handoffs || null,
      stakeholder_handoffs: stakeholder_handoffs || null,
      documentation_locations: documentation_locations || null,
      start_date,
      target_completion_date,
      status: status || "draft",
      confidentiality_level: "confidential",
      integrity_status: "active",
    };

    let planId = plan_id;
    if (plan_id) {
      // Update existing
      await base44.asServiceRole.entities.KnowledgeTransferPlan.update(plan_id, planData);
    } else {
      // Create new
      const newPlan = await base44.asServiceRole.entities.KnowledgeTransferPlan.create(planData);
      planId = newPlan.id;
    }

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "knowledge_transfer_plan_saved",
      target_entity_type: "KnowledgeTransferPlan", target_entity_id: planId,
      metadata: { transition_initiation_id, plan_id: planId, is_update: !!plan_id },
      operation_id, event_key: { action: "kt_plan_saved", plan_id: planId },
      event_type: "domain_action_completed", target_record_id: planId, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      plan_id: planId, status: planData.status,
    });

    return Response.json({ operation_id, plan_id: planId, status: planData.status });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "save_kt_plan_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}