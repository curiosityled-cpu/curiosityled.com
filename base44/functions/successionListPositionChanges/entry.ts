import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";

/**
 * POST /successionListPositionChanges
 * Lists OrgPositionChange records for the caller's tenant. Optionally filtered
 * by org_position_id. Returns results sorted by changed_at descending.
 * Read-only — no operation tracking or audit event needed for list queries.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { org_position_id, limit } = await req.json().catch(() => ({}));
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionListPositionChanges", target_client_id: auth.client_id, required_permission: "succession.roles.manage" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });
  try {
    const filter: any = { client_id: auth.client_id };
    if (org_position_id) filter.org_position_id = org_position_id;
    const changes = await base44.asServiceRole.entities.OrgPositionChange.filter(filter, "-changed_date", limit || 100);
    return Response.json({ changes, count: changes.length });
  } catch (error) { return Response.json({ error: (error as Error).message }, { status: 500 }); }
}