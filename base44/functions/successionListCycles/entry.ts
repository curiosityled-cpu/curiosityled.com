import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { filterActiveRecords } from "../../shared/successionIntegrityHelper.ts";

/** POST /successionListCycles — list cycles for the authenticated tenant */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionListCycles", target_client_id: auth.client_id, required_permission: "succession.cycles.view" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });
  const cycles = await base44.asServiceRole.entities.SuccessionCycle.filter({ client_id: auth.client_id }, '-created_date', body.limit || 50);
  return Response.json({ cycles: filterActiveRecords(cycles) });
}