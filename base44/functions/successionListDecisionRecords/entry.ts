import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";

/**
 * POST /successionListDecisionRecords
 *
 * Reads the tenant's decision records. Tenant-scoped server-side; never accepts
 * a client_id from the caller. Filters: cycle_id, role_id, status.
 */
export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { cycle_id, role_id, status } = body;

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44,
    auth,
    action: "successionListDecisionRecords",
    target_client_id: auth.client_id,
    required_permission: "succession.readiness.ratify",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const query: Record<string, any> = { client_id: auth.client_id };
  if (cycle_id) query.cycle_id = cycle_id;
  if (role_id) query.role_id = role_id;
  if (status && status !== "all") query.status = status;

  try {
    const records = await base44.asServiceRole.entities.SuccessionDecisionRecord.filter(query, {
      sort: "-created_date",
      limit: 200,
    });

    return Response.json({ decision_records: records || [] });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}