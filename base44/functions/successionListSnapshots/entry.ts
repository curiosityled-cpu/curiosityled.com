import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { filterActiveRecords } from "../../shared/successionIntegrityHelper.ts";

/**
 * POST /successionListSnapshots — list effective blueprint snapshots.
 *
 * Accepts either org_role_id or critical_role_id (at least one required).
 * When critical_role_id is provided without org_role_id, lists snapshots
 * for that critical role — used by the candidacy creation flow.
 *
 * Permission: succession.roles.view OR succession.discovery.view/.manage.
 * The discovery path supports admin users selecting a snapshot to bind
 * a candidacy to, without requiring the broader roles.view permission.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { org_role_id, critical_role_id, status, limit } = await req.json().catch(() => ({}));
  if (!org_role_id && !critical_role_id) {
    return Response.json({ error: "org_role_id or critical_role_id required" }, { status: 400 });
  }
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });

  // authorizeSuccessionAction handles Platform Admin denial + tenant scope.
  // No required_permission here — we check for either roles.view or discovery.view below.
  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionListSnapshots",
    target_client_id: auth.client_id,
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const hasPermission =
    auth.permissions.includes("succession.roles.view") ||
    auth.permissions.includes("succession.discovery.view") ||
    auth.permissions.includes("succession.discovery.manage") ||
    auth.permissions.includes("*");

  if (!hasPermission) {
    await writeSuccessionAuditEvent({
      base44,
      action_type: "denied_action",
      metadata: {
        action: "successionListSnapshots",
        denied_reason: "missing_permission",
        required_permissions: "succession.roles.view or succession.discovery.view",
        actor_role: auth.role,
      },
      client_id_override: auth.client_id,
    });
    return Response.json({ error: "Missing permission: succession.roles.view or succession.discovery.view" }, { status: 403 });
  }

  const filter: any = { client_id: auth.client_id };
  if (org_role_id) filter.org_role_id = org_role_id;
  if (critical_role_id) filter.critical_role_id = critical_role_id;
  if (status) filter.status = status;

  const snapshots = await base44.asServiceRole.entities.EffectiveBlueprintSnapshot.filter(
    filter, '-generated_at', limit || 100
  );
  return Response.json({ snapshots: filterActiveRecords(snapshots) });
}