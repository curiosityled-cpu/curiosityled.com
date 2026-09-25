import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { filterByConfidentiality } from "../../shared/confidentialityFilter.ts";

/**
 * POST /successionListMonitorAlerts
 *
 * Lists monitor alerts with filters. Tenant-scoped, confidentiality-filtered.
 * Does not return confidential source text, evidence, or panel data.
 */
const PAGE_LIMIT = 50;
const MAX_LIMIT = 200;

export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, cycle_id, critical_role_id, alert_type, severity, status, due_within_days, limit, offset } = body;

  if (!operation_id) return Response.json({ error: "operation_id required" }, { status: 400 });

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionListMonitorAlerts",
    target_client_id: auth.client_id,
    required_permission: "succession.monitor.view",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionListMonitorAlerts",
    payload: { cycle_id, critical_role_id, alert_type, severity, status, due_within_days, limit, offset },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);
    const cid = auth.client_id;
    const callerClearance = getCallerClearance(auth);
    const pageLimit = Math.min(Math.max(limit || PAGE_LIMIT, 1), MAX_LIMIT);
    const pageOffset = Math.max(offset || 0, 0);

    const filter: any = { client_id: cid, integrity_status: "active" };
    if (cycle_id) filter.cycle_id = cycle_id;
    if (critical_role_id) filter.critical_role_id = critical_role_id;
    if (alert_type) filter.alert_type = alert_type;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;

    let alerts = await base44.asServiceRole.entities.SuccessionMonitorAlert.filter(filter, "-detected_at", MAX_LIMIT);

    // Apply due-date window filter
    if (due_within_days) {
      const cutoff = new Date(Date.now() + due_within_days * 24 * 60 * 60 * 1000);
      alerts = alerts.filter((a: any) => a.due_date && new Date(a.due_date) <= cutoff);
    }

    // Confidentiality filter
    alerts = filterByConfidentiality(alerts, callerClearance);

    // Paginate
    const total = alerts.length;
    const paged = alerts.slice(pageOffset, pageOffset + pageLimit);

    // Minimize output — no confidential source text
    const summaries = paged.map((a: any) => ({
      alert_id: a.id,
      alert_type: a.alert_type,
      severity: a.severity,
      title: a.title,
      description: a.description,
      status: a.status,
      due_date: a.due_date || null,
      detected_at: a.detected_at,
      last_detected_at: a.last_detected_at,
      cycle_id: a.cycle_id || null,
      critical_role_id: a.critical_role_id || null,
      candidacy_id: a.candidacy_id || null,
      readiness_conclusion_id: a.readiness_conclusion_id || null,
      development_plan_link_id: a.development_plan_link_id || null,
      development_action_id: a.development_action_id || null,
      transition_initiation_id: a.transition_initiation_id || null,
      source_entity_type: a.source_entity_type,
      source_entity_id: a.source_entity_id,
      assigned_to_profile_id: a.assigned_to_profile_id || null,
      acknowledged_by_profile_id: a.acknowledged_by_profile_id || null,
      acknowledged_at: a.acknowledged_at || null,
    }));

    await completeOperation(base44, opResult.operation.id, null, { count: total, page: summaries.length });

    return Response.json({
      operation_id,
      alerts: summaries,
      total,
      limit: pageLimit,
      offset: pageOffset,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "list_alerts_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

function getCallerClearance(auth: any): string {
  if (auth.isPlatformAdmin) return "legally_restricted";
  const adminRoles = ["Platform Admin", "Platform Administrator", "admin", "Super Administrator", "Admin Level 2", "Admin Level 1"];
  if (adminRoles.includes(auth.role)) return "highly_confidential";
  return "standard";
}