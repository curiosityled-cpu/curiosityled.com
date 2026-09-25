import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { validateAlertUpdate } from "../../shared/successionMonitorValidator.ts";

/**
 * POST /successionUpdateMonitorAlert
 *
 * Acknowledge, assign, resolve, or dismiss a monitor alert. Alert status
 * changes never mutate source entities. Critical alerts cannot be dismissed
 * by unauthorized actors. Dismissal requires a reason.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, alert_id, new_status, resolution_note, dismissal_reason, assigned_to_profile_id } = body;

  if (!operation_id) return Response.json({ error: "operation_id required" }, { status: 400 });
  if (!alert_id) return Response.json({ error: "alert_id required" }, { status: 400 });
  if (!new_status) return Response.json({ error: "new_status required" }, { status: 400 });

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionUpdateMonitorAlert",
    target_client_id: auth.client_id,
    required_permission: "succession.monitor.view",
    target_entity_type: "SuccessionMonitorAlert",
    target_entity_id: alert_id,
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionUpdateMonitorAlert",
    payload: { alert_id, new_status, resolution_note, dismissal_reason, assigned_to_profile_id },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);
    const cid = auth.client_id;
    const now = new Date().toISOString();

    // Load alert
    const alerts = await base44.asServiceRole.entities.SuccessionMonitorAlert.filter({ id: alert_id, client_id: cid });
    if (alerts.length === 0) {
      await failOperation(base44, opResult.operation.id, "alert_not_found");
      return Response.json({ error: "Alert not found or cross-tenant" }, { status: 404 });
    }
    const alert = alerts[0];

    // Validate the update
    const validation = validateAlertUpdate({
      auth,
      alert,
      new_status,
      resolution_note: resolution_note || null,
      dismissal_reason: dismissal_reason || null,
      assigned_to_profile_id: assigned_to_profile_id || null,
    });
    if (!validation.valid) {
      await failOperation(base44, opResult.operation.id, validation.code!);
      return Response.json({ error: validation.code }, { status: 400 });
    }

    // Build update
    const update: any = { updated_at: now };

    if (new_status === "acknowledged") {
      update.status = "acknowledged";
      update.acknowledged_by_profile_id = auth.profile_id;
      update.acknowledged_at = now;
    } else if (new_status === "resolved") {
      update.status = "resolved";
      update.resolved_by_profile_id = auth.profile_id;
      update.resolved_at = now;
      update.resolution_note = resolution_note;
    } else if (new_status === "dismissed") {
      update.status = "dismissed";
      update.resolution_note = dismissal_reason;
      update.dismissal_reason = dismissal_reason;
      update.resolved_by_profile_id = auth.profile_id;
      update.resolved_at = now;
    }

    if (assigned_to_profile_id) {
      update.assigned_to_profile_id = assigned_to_profile_id;
    }

    await base44.asServiceRole.entities.SuccessionMonitorAlert.update(alert_id, update);

    await writeSuccessionAuditEvent({
      base44,
      action_type: "monitor_alert_updated",
      target_entity_type: "SuccessionMonitorAlert",
      target_entity_id: alert_id,
      metadata: { new_status, resolution_note: resolution_note || null, dismissal_reason: dismissal_reason || null },
      client_id_override: cid,
    });

    await completeOperation(base44, opResult.operation.id, null, { alert_id, new_status });

    return Response.json({ operation_id, alert_id, new_status, updated: true });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "update_alert_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}