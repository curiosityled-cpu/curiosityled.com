import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";

/** POST /successionListSnapshotIntegrityIncidents — governance: list incidents */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { status } = await req.json().catch(() => ({}));
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionListSnapshotIntegrityIncidents", target_client_id: auth.client_id, required_permission: "succession.governance.view" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });
  const filter: any = { client_id: auth.client_id };
  if (status) filter.status = status;
  const incidents = await base44.asServiceRole.entities.SnapshotIntegrityIncident.filter(filter, '-detected_at');
  return Response.json({ incidents });
}