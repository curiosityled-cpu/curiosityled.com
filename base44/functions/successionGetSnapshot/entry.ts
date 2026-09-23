import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { filterActiveRecords, INTEGRITY_STATUS } from "../../shared/successionIntegrityHelper.ts";
import { isSnapshotOperationallyBlocked } from "../../shared/successionAssignmentRules.ts";

/** POST /successionGetSnapshot — get effective snapshot details with blocking check */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { snapshot_id } = await req.json().catch(() => ({}));
  if (!snapshot_id) return Response.json({ error: "snapshot_id required" }, { status: 400 });
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionGetSnapshot", target_client_id: auth.client_id, required_permission: "succession.roles.view" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });
  const snapshots = await base44.asServiceRole.entities.EffectiveBlueprintSnapshot.filter({ id: snapshot_id, client_id: auth.client_id });
  if (snapshots.length === 0) return Response.json({ error: "Snapshot not found" }, { status: 404 });
  const snapshot = snapshots[0];
  const incidents = await base44.asServiceRole.entities.SnapshotIntegrityIncident.filter({ snapshot_id, client_id: auth.client_id });
  const blocked = isSnapshotOperationallyBlocked(incidents);
  return Response.json({ snapshot, operationally_blocked: blocked, open_incidents: incidents.filter((i:any) => i.status === "open" || i.status === "under_review") });
}