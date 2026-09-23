import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";

/**
 * POST /successionReviewSnapshotIntegrityIncident
 *
 * Human review of a SnapshotIntegrityIncident. Blocks future operational use
 * of the snapshot. The snapshot is preserved unchanged — never mutated.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, incident_id, review_status, resolution_rationale } = body;

  if (!operation_id || !incident_id || !review_status) {
    return Response.json({ error: "operation_id, incident_id, review_status required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) {
    return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  }

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionReviewSnapshotIntegrityIncident",
    target_client_id: auth.client_id,
    required_permission: "succession.governance.manage",
  });
  if (!authz.allowed) {
    return Response.json({ error: authz.denied_reason }, { status: 403 });
  }

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionReviewSnapshotIntegrityIncident",
    payload: { incident_id, review_status },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });

  if (opResult.rejected_payload_mismatch) {
    return Response.json({ error: "operation_id payload mismatch" }, { status: 409 });
  }
  if (opResult.is_duplicate) {
    return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate attached" });
  }

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    const incidents = await base44.asServiceRole.entities.SnapshotIntegrityIncident.filter({ id: incident_id });
    if (incidents.length === 0) {
      await failOperation(base44, opResult.operation.id, "incident_not_found");
      return Response.json({ error: "Incident not found" }, { status: 404 });
    }

    // Update incident status — snapshot is NEVER mutated
    const operational_use_blocked = review_status !== "dismissed";
    await base44.asServiceRole.entities.SnapshotIntegrityIncident.update(incident_id, {
      status: review_status,
      resolved_by_profile_id: auth.profile_id,
      resolved_at: new Date().toISOString(),
      resolution_rationale: resolution_rationale || "",
      operational_use_blocked,
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "snapshot_incident_reviewed",
      target_entity_type: "SnapshotIntegrityIncident", target_entity_id: incident_id,
      metadata: { review_status, operational_use_blocked, snapshot_id: incidents[0].snapshot_id },
      operation_id, event_key: { action: "snapshot_incident_reviewed", incident_id },
      event_type: "domain_action_completed", target_record_id: incident_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      incident_id, review_status, operational_use_blocked,
    });

    return Response.json({
      operation_id, incident_id, review_status, operational_use_blocked,
      snapshot_preserved: true,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "review_incident_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}