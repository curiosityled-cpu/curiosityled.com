import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { filterActiveRecords } from "../../shared/successionIntegrityHelper.ts";

/** POST /successionListBlueprints — list blueprints for an org role */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { org_role_id } = await req.json().catch(() => ({}));
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionListBlueprints", target_client_id: auth.client_id, required_permission: "succession.roles.view" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });
  const filter: any = { client_id: auth.client_id };
  if (org_role_id) filter.org_role_id = org_role_id;
  const blueprints = await base44.asServiceRole.entities.RoleSuccessBlueprint.filter(filter, '-created_date', 200);
  return Response.json({ blueprints: filterActiveRecords(blueprints) });
}