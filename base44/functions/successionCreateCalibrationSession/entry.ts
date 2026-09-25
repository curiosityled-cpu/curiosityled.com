import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionCreateCalibrationSession
 *
 * Creates a CalibrationSession and one CalibrationCase per submitted readiness
 * conclusion. Each case gets a case-specific panel roster. Only rostered,
 * same-tenant panelists may record judgments.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, cycle_id, scheduled_at, quorum_required, blind_judgment, cases } = body;

  if (!operation_id || !cycle_id || !scheduled_at || !cases || !Array.isArray(cases)) {
    return Response.json({ error: "operation_id, cycle_id, scheduled_at, cases required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionCreateCalibrationSession",
    target_client_id: auth.client_id,
    required_permission: "succession.deliberate.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionCreateCalibrationSession",
    payload: { cycle_id, scheduled_at, quorum_required, blind_judgment, cases },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // ── Validate cycle ──
    const cycle = await validateSameTenantReference(base44, "SuccessionCycle", cycle_id, auth.client_id);
    if (!cycle) {
      await writeDeniedReferenceEvent(base44, auth, "SuccessionCycle", cycle_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "cycle_not_found");
      return Response.json({ error: "Cycle not found" }, { status: 404 });
    }

    const effectiveQuorum = quorum_required || 3;
    const effectiveBlind = blind_judgment !== undefined ? !!blind_judgment : true;

    // ── Create the session ──
    const session = await base44.asServiceRole.entities.CalibrationSession.create({
      client_id: auth.client_id,
      cycle_id,
      scheduled_at,
      status: "scheduled",
      quorum_required: effectiveQuorum,
      concurrence_rule: "majority",
      blind_judgment: effectiveBlind,
      created_by_profile_id: auth.profile_id,
      created_at: new Date().toISOString(),
      confidentiality_level: "confidential",
      integrity_status: "active",
    });

    // ── Create cases ──
    const createdCases = [];
    for (const c of cases) {
      if (!c.readiness_conclusion_id || !c.panel_member_profile_ids || !Array.isArray(c.panel_member_profile_ids)) {
        await failOperation(base44, opResult.operation.id, "invalid_case");
        return Response.json({ error: "Each case requires readiness_conclusion_id and panel_member_profile_ids" }, { status: 400 });
      }

      // ── Validate the conclusion is proposed and belongs to the tenant ──
      const conclusion = await validateSameTenantReference(
        base44, "ReadinessConclusion", c.readiness_conclusion_id, auth.client_id
      );
      if (!conclusion) {
        await failOperation(base44, opResult.operation.id, "conclusion_not_found");
        return Response.json({ error: `Conclusion not found: ${c.readiness_conclusion_id}` }, { status: 404 });
      }
      if (conclusion.workflow_status !== "proposed") {
        await failOperation(base44, opResult.operation.id, "conclusion_not_proposed");
        return Response.json({ error: `Conclusion must be in proposed status: ${c.readiness_conclusion_id}` }, { status: 409 });
      }
      if (conclusion.cycle_id !== cycle_id) {
        await failOperation(base44, opResult.operation.id, "conclusion_cycle_mismatch");
        return Response.json({ error: "Conclusion does not belong to this cycle" }, { status: 409 });
      }

      const minPanel = c.minimum_panel_size || effectiveQuorum;
      if (c.panel_member_profile_ids.length < minPanel) {
        await failOperation(base44, opResult.operation.id, "panel_below_minimum");
        return Response.json({ error: `Panel must have at least ${minPanel} members` }, { status: 400 });
      }

      const now = new Date().toISOString();
      const calCase = await base44.asServiceRole.entities.CalibrationCase.create({
        client_id: auth.client_id,
        session_id: session.id,
        candidacy_id: conclusion.candidacy_id,
        readiness_conclusion_id: c.readiness_conclusion_id,
        effective_blueprint_snapshot_id: conclusion.effective_blueprint_snapshot_id,
        status: "open",
        panel_determination: null,
        dissent: null,
        concurrence_met: null,
        participating_count: null,
        abstention_count: 0,
        panel_member_profile_ids: c.panel_member_profile_ids,
        minimum_panel_size: minPanel,
        panel_roster_finalized_at: now,
        panel_roster_finalized_by_profile_id: auth.profile_id,
        confidentiality_level: "confidential",
        integrity_status: "active",
      });
      createdCases.push(calCase.id);

      // ── Update conclusion status to in_calibration ──
      await base44.asServiceRole.entities.ReadinessConclusion.update(c.readiness_conclusion_id, {
        workflow_status: "in_calibration",
      });
    }

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "calibration_session_created",
      target_entity_type: "CalibrationSession", target_entity_id: session.id,
      metadata: {
        cycle_id, case_count: createdCases.length,
        quorum_required: effectiveQuorum, blind_judgment: effectiveBlind,
      },
      operation_id, event_key: { action: "calibration_session_created", session_id: session.id },
      event_type: "domain_action_completed", target_record_id: session.id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      session_id: session.id, case_count: createdCases.length,
    });

    return Response.json({
      operation_id, session_id: session.id, case_ids: createdCases,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "create_calibration_session_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}