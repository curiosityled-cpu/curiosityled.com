import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/** POST /successionGetCriticalRole — get a single critical role designation */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { critical_role_id } = await req.json().catch(() => ({}));
  if (!critical_role_id) return Response.json({ error: "critical_role_id required" }, { status: 400 });
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionGetCriticalRole", target_client_id: auth.client_id, required_permission: "succession.roles.view" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });
  const role = await validateSameTenantReference(base44, "CriticalRole", critical_role_id, auth.client_id);
  if (!role) {
    await writeDeniedReferenceEvent(base44, auth, "CriticalRole", critical_role_id, "cross_tenant_or_not_found");
    return Response.json({ error: "Critical role not found" }, { status: 404 });
  }
  return Response.json({ critical_role: role });
}