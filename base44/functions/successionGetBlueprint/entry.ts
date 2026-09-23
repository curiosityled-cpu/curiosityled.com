import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";

/** POST /successionGetBlueprint — get blueprint details */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { blueprint_id } = await req.json().catch(() => ({}));
  if (!blueprint_id) return Response.json({ error: "blueprint_id required" }, { status: 400 });
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionGetBlueprint", target_client_id: auth.client_id, required_permission: "succession.roles.view" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });
  const blueprints = await base44.asServiceRole.entities.RoleSuccessBlueprint.filter({ id: blueprint_id, client_id: auth.client_id });
  if (blueprints.length === 0) return Response.json({ error: "Blueprint not found" }, { status: 404 });
  return Response.json({ blueprint: blueprints[0] });
}