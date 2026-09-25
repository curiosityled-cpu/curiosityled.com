import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionCompleteDevelopmentAction
 *
 * Completes a DevelopmentAction. This:
 * - updates ONLY the action (status=completed, completion_date, outcome_notes)
 * - may create a suggested EvidenceRecord (status=draft, not decision-eligible)
 * - does NOT accept the suggested evidence
 * - does NOT close a ReadinessCondition automatically
 * - does NOT change ReadinessConclusion
 * - does NOT change candidacy status automatically
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, action_id, outcome_notes, create_suggested_evidence } = body;

  if (!operation_id || !action_id) {
    return Response.json({ error: "operation_id, action_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionCompleteDevelopmentAction",
    target_client_id: auth.client_id,
    required_permission: "succession.development.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionCompleteDevelopmentAction",
    payload: { action_id },
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

    if (action.status === "completed") {
      await failOperation(base44, opResult.operation.id, "action_already_completed");
      return Response.json({ error: "Action is already completed" }, { status: 409 });
    }

    // ── Complete the action ──
    const now = new Date().toISOString();
    const today = now.split("T")[0];
    await base44.asServiceRole.entities.DevelopmentAction.update(action_id, {
      status: "completed",
      completion_date: today,
      outcome_notes: outcome_notes || null,
    });

    let suggestedEvidenceId = null;

    // ── Optionally create suggested EvidenceRecord (draft, not decision-eligible) ──
    if (create_suggested_evidence !== false) {
      // Load the plan link to get the candidacy and snapshot context
      const planLink = await validateSameTenantReference(
        base44, "DevelopmentPlanLink", action.development_plan_link_id, auth.client_id
      );
      if (planLink) {
        // Load the conclusion to get critical_role_id
        const conclusion = await validateSameTenantReference(
          base44, "ReadinessConclusion", planLink.readiness_conclusion_id, auth.client_id
        );
        if (!conclusion) {
          await failOperation(base44, opResult.operation.id, "conclusion_not_found_for_evidence");
          return Response.json({ error: "Readiness conclusion not found for plan link" }, { status: 404 });
        }

        // Map action_type to evidence_type
        const evidenceTypeMap: Record<string, string> = {
          learning: "development_completion",
          coaching: "coaching_milestone",
          stretch_assignment: "stretch_assignment",
          critical_experience: "critical_experience",
          credential: "credential",
          business_goal: "business_outcome",
          other: "manual_other",
        };
        const evidenceType = evidenceTypeMap[action.action_type] || "manual_other";

        const suggestedEvidence = await base44.asServiceRole.entities.EvidenceRecord.create({
          client_id: auth.client_id,
          candidacy_id: action.candidacy_id,
          user_profile_id: planLink.owner_profile_id,
          critical_role_id: conclusion.critical_role_id,
          effective_blueprint_snapshot_id: planLink.effective_blueprint_snapshot_id,
          effective_requirement_snapshot_id: action.effective_requirement_snapshot_id || null,
          evidence_type: evidenceType,
          source_system: "curiosity_led",
          source_record_id: action.id,
          source_date: today,
          title: `Development Action: ${action.title}`,
          description: action.description + (outcome_notes ? `\n\nOutcome: ${outcome_notes}` : ""),
          submitted_by_profile_id: auth.profile_id,
          submitted_at: now,
          freshness_review_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          confidentiality_level: "confidential",
          integrity_status: "active",
          status: "draft", // NOT decision-eligible until reviewed and accepted
        });

        suggestedEvidenceId = suggestedEvidence.id;

        // Link the evidence to the action
        await base44.asServiceRole.entities.DevelopmentAction.update(action_id, {
          evidence_record_id: suggestedEvidence.id,
        });
      }
    }

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "development_action_completed",
      target_entity_type: "DevelopmentAction", target_entity_id: action_id,
      metadata: {
        action_id, outcome_notes: outcome_notes ? true : false,
        suggested_evidence_created: suggestedEvidenceId ? true : false,
        suggested_evidence_id: suggestedEvidenceId,
        readiness_unchanged: true,
        condition_unchanged: true,
      },
      operation_id, event_key: { action: "development_action_completed", action_id },
      event_type: "domain_action_completed", target_record_id: action_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      action_id, status: "completed", suggested_evidence_id: suggestedEvidenceId,
    });

    return Response.json({
      operation_id, action_id, status: "completed",
      suggested_evidence_id: suggestedEvidenceId,
      suggested_evidence_status: suggestedEvidenceId ? "draft" : null,
      readiness_unchanged: true,
      condition_unchanged: true,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "complete_development_action_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}