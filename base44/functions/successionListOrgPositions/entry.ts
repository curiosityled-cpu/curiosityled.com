import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { filterActiveRecords } from "../../shared/successionIntegrityHelper.ts";

/** POST /successionListOrgPositions — list positions for an org role */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { org_role_id } = await req.json().catch(() => ({}));
  if (!org_role_id) return Response.json({ error: "org_role_id required" }, { status: 400 });
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionListOrgPositions", target_client_id: auth.client_id, required_permission: "succession.roles.view" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });
  const positions = await base44.asServiceRole.entities.OrgPosition.filter({ client_id: auth.client_id, org_role_id }, '-created_date');
  return Response.json({ positions: filterActiveRecords(positions) });
}