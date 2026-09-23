import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";

/** POST /successionGetCycle — get cycle details */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { cycle_id } = await req.json().catch(() => ({}));
  if (!cycle_id) return Response.json({ error: "cycle_id required" }, { status: 400 });
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionGetCycle", target_client_id: auth.client_id, required_permission: "succession.cycles.view" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });
  const cycles = await base44.asServiceRole.entities.SuccessionCycle.filter({ id: cycle_id, client_id: auth.client_id });
  if (cycles.length === 0) return Response.json({ error: "Cycle not found" }, { status: 404 });
  return Response.json({ cycle: cycles[0] });
}