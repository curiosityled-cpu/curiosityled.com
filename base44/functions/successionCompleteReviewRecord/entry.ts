import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";

/**
 * POST /successionCompleteReviewRecord
 *
 * Completes or cancels a review record. Completing does NOT resolve source
 * alerts automatically and does NOT change readiness, candidacy, development,
 * transition, UserProfile, or PositionAssignment. Cancellation requires a
 * reason.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, review_id, action, operational_notes, follow_up_actions, next_review_date, cancellation_reason } = body;

  if (!operation_id) return Response.json({ error: "operation_id required" }, { status: 400 });
  if (!review_id) return Response.json({ error: "review_id required" }, { status: 400 });
  if (!action || !["complete", "cancel"].includes(action)) {
    return Response.json({ error: "action must be 'complete' or 'cancel'" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionCompleteReviewRecord",
    target_client_id: auth.client_id,
    required_permission: "succession.monitor.manage",
    target_entity_type: "SuccessionReviewRecord",
    target_entity_id: review_id,
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionCompleteReviewRecord",
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

    // Cannot complete/cancel a terminal review
    if (review.status === "completed" || review.status === "cancelled") {
      await failOperation(base44, opResult.operation.id, "review_is_terminal");
      return Response.json({ error: "Review is already completed or cancelled" }, { status: 400 });
    }

    if (action === "cancel") {
      if (!cancellation_reason || !cancellation_reason.trim()) {
        await failOperation(base44, opResult.operation.id, "cancellation_requires_reason");
        return Response.json({ error: "Cancellation requires a reason" }, { status: 400 });
      }
      await base44.asServiceRole.entities.SuccessionReviewRecord.update(review_id, {
        status: "cancelled",
        cancellation_reason,
        updated_at: now,
      });

      await writeSuccessionAuditEvent({
        base44,
        action_type: "review_record_cancelled",
        target_entity_type: "SuccessionReviewRecord",
        target_entity_id: review_id,
        metadata: { cancellation_reason },
        client_id_override: cid,
      });

      await completeOperation(base44, opResult.operation.id, null, { review_id, status: "cancelled" });
      return Response.json({ operation_id, review_id, status: "cancelled" });
    }

    // action === "complete"
    const update: any = {
      status: "completed",
      completed_at: now,
      updated_at: now,
    };
    if (operational_notes !== undefined) update.operational_notes = operational_notes;
    if (follow_up_actions !== undefined) update.follow_up_actions = follow_up_actions;
    if (next_review_date !== undefined) update.next_review_date = next_review_date;

    await base44.asServiceRole.entities.SuccessionReviewRecord.update(review_id, update);

    await writeSuccessionAuditEvent({
      base44,
      action_type: "review_record_completed",
      target_entity_type: "SuccessionReviewRecord",
      target_entity_id: review_id,
      metadata: { operational_notes: operational_notes ? "recorded" : null, follow_up_actions: follow_up_actions ? "recorded" : null },
      client_id_override: cid,
    });

    // NOTE: We deliberately do NOT resolve source alerts here.
    // Completing a review does not resolve alerts automatically.

    await completeOperation(base44, opResult.operation.id, null, { review_id, status: "completed" });
    return Response.json({ operation_id, review_id, status: "completed" });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "complete_review_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}