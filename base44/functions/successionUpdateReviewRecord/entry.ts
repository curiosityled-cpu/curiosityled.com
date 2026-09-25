import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { validateReviewRecord, isValidReviewStatus } from "../../shared/successionMonitorValidator.ts";

/**
 * POST /successionUpdateReviewRecord
 *
 * Updates a review record's schedule, participants, or starts it (in_progress).
 * Does not complete or cancel — use successionCompleteReviewRecord for those.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const {
    operation_id, review_id,
    scheduled_for, participant_profile_ids, new_status,
    operational_notes, follow_up_actions, next_review_date,
  } = body;

  if (!operation_id) return Response.json({ error: "operation_id required" }, { status: 400 });
  if (!review_id) return Response.json({ error: "review_id required" }, { status: 400 });

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionUpdateReviewRecord",
    target_client_id: auth.client_id,
    required_permission: "succession.monitor.manage",
    target_entity_type: "SuccessionReviewRecord",
    target_entity_id: review_id,
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionUpdateReviewRecord",
    payload: body,
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);
    const cid = auth.client_id;
    const now = new Date().toISOString();

    // Load review
    const reviews = await base44.asServiceRole.entities.SuccessionReviewRecord.filter({ id: review_id, client_id: cid });
    if (reviews.length === 0) {
      await failOperation(base44, opResult.operation.id, "review_not_found");
      return Response.json({ error: "Review not found or cross-tenant" }, { status: 404 });
    }
    const review = reviews[0];

    // Cannot update a completed or cancelled review
    if (review.status === "completed" || review.status === "cancelled") {
      await failOperation(base44, opResult.operation.id, "review_is_terminal");
      return Response.json({ error: "Cannot update a completed or cancelled review" }, { status: 400 });
    }

    // Validate new status if provided
    if (new_status && !isValidReviewStatus(new_status)) {
      await failOperation(base44, opResult.operation.id, "invalid_status");
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    // Only allow transition to in_progress here (complete/cancel via dedicated function)
    if (new_status && new_status !== "in_progress") {
      await failOperation(base44, opResult.operation.id, "invalid_status_transition");
      return Response.json({ error: "Use successionCompleteReviewRecord for completion or cancellation" }, { status: 400 });
    }

    // Validate participants if provided
    if (participant_profile_ids && participant_profile_ids.length > 0) {
      for (const pid of participant_profile_ids) {
        const profiles = await base44.asServiceRole.entities.UserProfile.filter({ id: pid });
        if (profiles.length === 0 || profiles[0].tenant_id !== cid) {
          await failOperation(base44, opResult.operation.id, "participant_not_in_tenant");
          return Response.json({ error: `Participant ${pid} does not belong to tenant` }, { status: 400 });
        }
      }
    }

    const update: any = { updated_at: now };
    if (scheduled_for) update.scheduled_for = scheduled_for;
    if (participant_profile_ids) update.participant_profile_ids = participant_profile_ids;
    if (new_status === "in_progress") {
      update.status = "in_progress";
      update.held_at = now;
    }
    if (operational_notes !== undefined) update.operational_notes = operational_notes;
    if (follow_up_actions !== undefined) update.follow_up_actions = follow_up_actions;
    if (next_review_date !== undefined) update.next_review_date = next_review_date;

    await base44.asServiceRole.entities.SuccessionReviewRecord.update(review_id, update);

    await writeSuccessionAuditEvent({
      base44,
      action_type: "review_record_updated",
      target_entity_type: "SuccessionReviewRecord",
      target_entity_id: review_id,
      metadata: { new_status: new_status || null, fields_updated: Object.keys(update).filter(k => k !== "updated_at") },
      client_id_override: cid,
    });

    await completeOperation(base44, opResult.operation.id, null, { review_id });

    return Response.json({ operation_id, review_id, updated: true });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "update_review_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}