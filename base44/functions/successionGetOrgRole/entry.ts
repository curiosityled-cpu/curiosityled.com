import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";

/** POST /successionGetOrgRole — get org role details */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { org_role_id } = await req.json().catch(() => ({}));
  if (!org_role_id) return Response.json({ error: "org_role_id required" }, { status: 400 });
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionGetOrgRole", target_client_id: auth.client_id, required_permission: "succession.roles.view" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });
  const roles = await base44.asServiceRole.entities.OrgRole.filter({ id: org_role_id, client_id: auth.client_id });
  if (roles.length === 0) return Response.json({ error: "OrgRole not found" }, { status: 404 });
  return Response.json({ org_role: roles[0] });
}