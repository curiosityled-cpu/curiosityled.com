import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { validateReviewRecord } from "../../shared/successionMonitorValidator.ts";

/**
 * POST /successionCreateReviewRecord
 *
 * Creates an operational review record. Owner, participants, and source alerts
 * must belong to the same tenant. Does not resolve source alerts, change
 * readiness, candidacy, development, transition, UserProfile, or
 * PositionAssignment.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const {
    operation_id, cycle_id, critical_role_id, candidacy_id,
    review_type, title, review_scope, owner_profile_id, scheduled_for,
    participant_profile_ids, source_alert_ids,
  } = body;

  if (!operation_id) return Response.json({ error: "operation_id required" }, { status: 400 });

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionCreateReviewRecord",
    target_client_id: auth.client_id,
    required_permission: "succession.monitor.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionCreateReviewRecord",
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

    // Validate
    const validation = validateReviewRecord({
      review_type, title, review_scope, owner_profile_id, scheduled_for,
      status: "scheduled",
    });
    if (!validation.valid) {
      await failOperation(base44, opResult.operation.id, validation.code!);
      return Response.json({ error: validation.code }, { status: 400 });
    }

    // Validate owner belongs to tenant
    if (owner_profile_id) {
      const ownerProfiles = await base44.asServiceRole.entities.UserProfile.filter({ id: owner_profile_id });
      if (ownerProfiles.length === 0 || ownerProfiles[0].tenant_id !== cid) {
        await failOperation(base44, opResult.operation.id, "owner_not_in_tenant");
        return Response.json({ error: "Owner profile does not belong to tenant" }, { status: 400 });
      }
    }

    // Validate participants belong to tenant
    if (participant_profile_ids && participant_profile_ids.length > 0) {
      for (const pid of participant_profile_ids) {
        const profiles = await base44.asServiceRole.entities.UserProfile.filter({ id: pid });
        if (profiles.length === 0 || profiles[0].tenant_id !== cid) {
          await failOperation(base44, opResult.operation.id, "participant_not_in_tenant");
          return Response.json({ error: `Participant ${pid} does not belong to tenant` }, { status: 400 });
        }
      }
    }

    // Validate source alerts belong to tenant
    if (source_alert_ids && source_alert_ids.length > 0) {
      for (const aid of source_alert_ids) {
        const alerts = await base44.asServiceRole.entities.SuccessionMonitorAlert.filter({ id: aid, client_id: cid });
        if (alerts.length === 0) {
          await failOperation(base44, opResult.operation.id, "source_alert_not_in_tenant");
          return Response.json({ error: `Source alert ${aid} does not belong to tenant` }, { status: 400 });
        }
      }
    }

    const review = await base44.asServiceRole.entities.SuccessionReviewRecord.create({
      client_id: cid,
      cycle_id: cycle_id || null,
      critical_role_id: critical_role_id || null,
      candidacy_id: candidacy_id || null,
      review_type,
      title,
      review_scope,
      owner_profile_id,
      scheduled_for,
      status: "scheduled",
      participant_profile_ids: participant_profile_ids || [],
      source_alert_ids: source_alert_ids || [],
      confidentiality_level: "confidential",
      integrity_status: "active",
      created_by_profile_id: auth.profile_id,
      created_at: now,
      updated_at: now,
    });

    await writeSuccessionAuditEvent({
      base44,
      action_type: "review_record_created",
      target_entity_type: "SuccessionReviewRecord",
      target_entity_id: review.id,
      metadata: { review_type, title, owner_profile_id },
      client_id_override: cid,
    });

    await completeOperation(base44, opResult.operation.id, null, { review_id: review.id });

    return Response.json({ operation_id, review_id: review.id, status: "scheduled" });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "create_review_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}