import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { filterActiveRecords } from "../../shared/successionIntegrityHelper.ts";

/** POST /successionListOrgRoles — list org roles for a cycle */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { cycle_id } = await req.json().catch(() => ({}));
  if (!cycle_id) return Response.json({ error: "cycle_id required" }, { status: 400 });
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionListOrgRoles", target_client_id: auth.client_id, required_permission: "succession.roles.view" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });
  const roles = await base44.asServiceRole.entities.OrgRole.filter({ client_id: auth.client_id, cycle_id }, '-created_date', 200);
  return Response.json({ org_roles: filterActiveRecords(roles) });
}