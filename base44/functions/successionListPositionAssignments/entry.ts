import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { filterActiveRecords } from "../../shared/successionIntegrityHelper.ts";

/** POST /successionListPositionAssignments — list assignments for a position */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { org_position_id } = await req.json().catch(() => ({}));
  if (!org_position_id) return Response.json({ error: "org_position_id required" }, { status: 400 });
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionListPositionAssignments", target_client_id: auth.client_id, required_permission: "succession.roles.view" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });
  const assignments = await base44.asServiceRole.entities.PositionAssignment.filter({ client_id: auth.client_id, org_position_id }, '-start_date');
  return Response.json({ assignments: filterActiveRecords(assignments) });
}