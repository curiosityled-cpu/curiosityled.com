import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";
import { validateStatusTransition, validateApprovalSoD } from "../../shared/successionTransitionValidator.ts";

/**
 * POST /successionUpdateTransitionInitiation
 *
 * Updates a TransitionInitiation. Handles:
 * - Draft field edits (when status=draft)
 * - Status transitions (draft→requested→approved→in_progress→completed)
 * - Cancellation (with reason for approved/in_progress)
 * - Approval (enforces SoD: approver ≠ requester, approver ≠ successor)
 * - Does NOT promote, change PositionAssignment, update UserProfile, or close candidacy
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, initiation_id, new_status, cancellation_reason,
    target_start_date, sponsor_profile_id, development_plan_link_id } = body;

  if (!operation_id || !initiation_id) {
    return Response.json({ error: "operation_id, initiation_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionUpdateTransitionInitiation",
    target_client_id: auth.client_id,
    required_permission: "succession.transition.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionUpdateTransitionInitiation",
    payload: { initiation_id, new_status },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // ── Load the initiation ──
    const initiation = await validateSameTenantReference(
      base44, "TransitionInitiation", initiation_id, auth.client_id
    );
    if (!initiation) {
      await writeDeniedReferenceEvent(base44, auth, "TransitionInitiation", initiation_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "initiation_not_found");
      return Response.json({ error: "Transition initiation not found" }, { status: 404 });
    }

    // ── If new_status is provided, handle status transition ──
    if (new_status) {
      const transitionCheck = validateStatusTransition(initiation.status, new_status, cancellation_reason);
      if (!transitionCheck.valid) {
        await failOperation(base44, opResult.operation.id, transitionCheck.error_code);
        return Response.json({ error: transitionCheck.error_message }, { status: 400 });
      }

      // ── Approval requires SoD check ──
      if (new_status === "approved") {
        const sodCheck = validateApprovalSoD(
          auth.profile_id,
          initiation.initiated_by_profile_id,
          initiation.successor_profile_id
        );
        if (!sodCheck.valid) {
          await failOperation(base44, opResult.operation.id, sodCheck.error_code);
          return Response.json({ error: sodCheck.error_message }, { status: 403 });
        }

        const now = new Date().toISOString();
        await base44.asServiceRole.entities.TransitionInitiation.update(initiation_id, {
          status: "approved",
          approved_by_profile_id: auth.profile_id,
          approved_at: now,
        });

        const auditEvent = await writeSuccessionAuditEvent({
          base44, action_type: "transition_initiation_approved",
          target_entity_type: "TransitionInitiation", target_entity_id: initiation_id,
          metadata: {
            initiation_id, previous_status: initiation.status, new_status: "approved",
            approved_by: auth.profile_id, requester: initiation.initiated_by_profile_id,
            successor: initiation.successor_profile_id,
          },
          operation_id, event_key: { action: "transition_approved", initiation_id },
          event_type: "domain_action_completed", target_record_id: initiation_id, attempt_number: 1,
        });

        await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
          initiation_id, status: "approved",
        });

        return Response.json({ operation_id, initiation_id, status: "approved" });
      }

      // ── Cancellation ──
      if (new_status === "cancelled") {
        await base44.asServiceRole.entities.TransitionInitiation.update(initiation_id, {
          status: "cancelled",
          cancellation_reason: cancellation_reason || null,
        });

        const auditEvent = await writeSuccessionAuditEvent({
          base44, action_type: "transition_initiation_cancelled",
          target_entity_type: "TransitionInitiation", target_entity_id: initiation_id,
          metadata: { initiation_id, previous_status: initiation.status, cancellation_reason },
          operation_id, event_key: { action: "transition_cancelled", initiation_id },
          event_type: "domain_action_completed", target_record_id: initiation_id, attempt_number: 1,
        });

        await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
          initiation_id, status: "cancelled",
        });

        return Response.json({ operation_id, initiation_id, status: "cancelled" });
      }

      // ── Other transitions (requested, in_progress, completed) ──
      await base44.asServiceRole.entities.TransitionInitiation.update(initiation_id, {
        status: new_status,
      });

      const auditEvent = await writeSuccessionAuditEvent({
        base44, action_type: "transition_initiation_status_changed",
        target_entity_type: "TransitionInitiation", target_entity_id: initiation_id,
        metadata: { initiation_id, previous_status: initiation.status, new_status },
        operation_id, event_key: { action: "transition_status_changed", initiation_id, new_status },
        event_type: "domain_action_completed", target_record_id: initiation_id, attempt_number: 1,
      });

      await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
        initiation_id, status: new_status,
      });

      return Response.json({ operation_id, initiation_id, status: new_status });
    }

    // ── Draft field edits (only when status=draft) ──
    if (initiation.status !== "draft") {
      await failOperation(base44, opResult.operation.id, "not_editable");
      return Response.json({ error: "Only draft initiations can be edited" }, { status: 400 });
    }

    const updates: any = {};
    if (target_start_date) updates.target_start_date = target_start_date;
    if (sponsor_profile_id) updates.sponsor_profile_id = sponsor_profile_id;
    if (development_plan_link_id !== undefined) updates.development_plan_link_id = development_plan_link_id || null;

    if (Object.keys(updates).length === 0) {
      await failOperation(base44, opResult.operation.id, "no_updates");
      return Response.json({ error: "No updates provided" }, { status: 400 });
    }

    await base44.asServiceRole.entities.TransitionInitiation.update(initiation_id, updates);

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "transition_initiation_updated",
      target_entity_type: "TransitionInitiation", target_entity_id: initiation_id,
      metadata: { initiation_id, updates },
      operation_id, event_key: { action: "transition_updated", initiation_id },
      event_type: "domain_action_completed", target_record_id: initiation_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      initiation_id, status: "draft",
    });

    return Response.json({ operation_id, initiation_id, status: "draft", updated: true });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "update_transition_initiation_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}