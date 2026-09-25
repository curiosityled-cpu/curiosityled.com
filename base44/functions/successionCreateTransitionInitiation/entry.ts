import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSuccessionProcessChain, validateExceptionBasis, validateProfileTenant } from "../../shared/successionTransitionValidator.ts";

/**
 * POST /successionCreateTransitionInitiation
 *
 * Creates a TransitionInitiation. For succession_process basis, validates the
 * full candidacy → conclusion → role chain. For exception basis, requires
 * external_authorization_reference and exception_reason. Does not promote,
 * change PositionAssignment, update UserProfile, or close candidacy.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, cycle_id, critical_role_id, org_position_id, successor_profile_id,
    candidacy_id, readiness_conclusion_id, development_plan_link_id,
    initiation_type, initiation_basis, external_authorization_reference, exception_reason,
    target_start_date, sponsor_profile_id } = body;

  if (!operation_id || !cycle_id || !critical_role_id || !org_position_id || !successor_profile_id ||
    !initiation_type || !initiation_basis || !target_start_date || !sponsor_profile_id) {
    return Response.json({ error: "operation_id, cycle_id, critical_role_id, org_position_id, successor_profile_id, initiation_type, initiation_basis, target_start_date, sponsor_profile_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionCreateTransitionInitiation",
    target_client_id: auth.client_id,
    required_permission: "succession.transition.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionCreateTransitionInitiation",
    payload: { cycle_id, critical_role_id, org_position_id, successor_profile_id, initiation_basis },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // ── Validate sponsor belongs to tenant ──
    const sponsorCheck = await validateProfileTenant(base44, auth.client_id, sponsor_profile_id);
    if (!sponsorCheck.valid) {
      await failOperation(base44, opResult.operation.id, sponsorCheck.error_code);
      return Response.json({ error: sponsorCheck.error_message }, { status: 400 });
    }

    // ── Validate successor belongs to tenant ──
    const successorCheck = await validateProfileTenant(base44, auth.client_id, successor_profile_id);
    if (!successorCheck.valid) {
      await failOperation(base44, opResult.operation.id, successorCheck.error_code);
      return Response.json({ error: successorCheck.error_message }, { status: 400 });
    }

    // ── Validate based on initiation_basis ──
    if (initiation_basis === "succession_process") {
      if (!candidacy_id || !readiness_conclusion_id) {
        await failOperation(base44, opResult.operation.id, "missing_succession_refs");
        return Response.json({ error: "candidacy_id and readiness_conclusion_id required for succession_process basis" }, { status: 400 });
      }

      const chain = await validateSuccessionProcessChain(
        base44, auth.client_id, critical_role_id, org_position_id,
        successor_profile_id, candidacy_id, readiness_conclusion_id,
        opResult.operation.id
      );
      if (!chain.valid) {
        await failOperation(base44, opResult.operation.id, chain.error_code);
        return Response.json({ error: chain.error_message }, { status: 400 });
      }
    } else {
      // Exception-based: validate external_authorization_reference + exception_reason
      const excCheck = validateExceptionBasis(initiation_basis, external_authorization_reference, exception_reason);
      if (!excCheck.valid) {
        await failOperation(base44, opResult.operation.id, excCheck.error_code);
        return Response.json({ error: excCheck.error_message }, { status: 400 });
      }
    }

    // ── Optional: validate development_plan_link_id belongs to tenant ──
    if (development_plan_link_id) {
      const devPlanLink = await base44.asServiceRole.entities.DevelopmentPlanLink.filter({
        id: development_plan_link_id, client_id: auth.client_id, integrity_status: "active",
      });
      if (!devPlanLink || devPlanLink.length === 0) {
        await failOperation(base44, opResult.operation.id, "dev_plan_link_not_found");
        return Response.json({ error: "Development plan link not found" }, { status: 400 });
      }
    }

    // ── Create the initiation (status=draft) ──
    const now = new Date().toISOString();
    const initiation = await base44.asServiceRole.entities.TransitionInitiation.create({
      client_id: auth.client_id, cycle_id, critical_role_id, org_position_id,
      successor_profile_id,
      candidacy_id: candidacy_id || null,
      readiness_conclusion_id: readiness_conclusion_id || null,
      development_plan_link_id: development_plan_link_id || null,
      initiation_type, initiation_basis,
      external_authorization_reference: external_authorization_reference || null,
      exception_reason: exception_reason || null,
      initiated_by_profile_id: auth.profile_id,
      initiated_at: now,
      target_start_date, sponsor_profile_id,
      status: "draft",
      confidentiality_level: "confidential",
      integrity_status: "active",
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "transition_initiation_created",
      target_entity_type: "TransitionInitiation", target_entity_id: initiation.id,
      metadata: {
        cycle_id, critical_role_id, org_position_id, successor_profile_id,
        initiation_basis, initiation_type,
        candidacy_id: candidacy_id || null,
        readiness_conclusion_id: readiness_conclusion_id || null,
      },
      operation_id, event_key: { action: "transition_initiation_created", initiation_id: initiation.id },
      event_type: "domain_action_completed", target_record_id: initiation.id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      initiation_id: initiation.id, status: "draft",
    });

    return Response.json({ operation_id, initiation_id: initiation.id, status: "draft" });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "create_transition_initiation_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}