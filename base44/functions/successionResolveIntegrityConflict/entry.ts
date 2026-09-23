import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { resolveIntegrityConflict, RESOLUTION_DISPOSITION } from "../../shared/successionIntegrityHelper.ts";

/**
 * POST /successionResolveIntegrityConflict
 *
 * Human-authorized, audited resolution of a quarantined record.
 * disposition controls the outcome:
 *   activate_selected_record, retire_duplicate, withdraw_record,
 *   correct_and_revalidate, keep_quarantined, escalate
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, entity_name, record_id, resolution_rationale, disposition } = body;

  if (!operation_id || !entity_name || !record_id || !disposition) {
    return Response.json({ error: "operation_id, entity_name, record_id, disposition required" }, { status: 400 });
  }

  const validDispositions = Object.values(RESOLUTION_DISPOSITION);
  if (!validDispositions.includes(disposition)) {
    return Response.json({ error: `Invalid disposition. Valid: ${validDispositions.join(", ")}` }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) {
    return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  }

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionResolveIntegrityConflict",
    target_client_id: auth.client_id,
    required_permission: "succession.governance.manage",
  });
  if (!authz.allowed) {
    return Response.json({ error: authz.denied_reason }, { status: 403 });
  }

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionResolveIntegrityConflict",
    payload: { entity_name, record_id, disposition },
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

    await resolveIntegrityConflict({
      base44, entity_name, record_id,
      resolved_by_profile_id: auth.profile_id,
      resolution_rationale: resolution_rationale || "",
      disposition,
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "integrity_conflict_resolved",
      target_entity_type: entity_name, target_entity_id: record_id,
      metadata: { disposition, resolution_rationale },
      operation_id, event_key: { action: "integrity_resolved", entity_name, record_id },
      event_type: "integrity_resolved", target_record_id: record_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      entity_name, record_id, disposition,
    });

    return Response.json({ operation_id, entity_name, record_id, disposition, status: "resolved" });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "resolve_integrity_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}