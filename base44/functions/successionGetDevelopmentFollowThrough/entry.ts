import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { computeDevelopmentFollowThrough } from "../../shared/successionFollowThrough.ts";

/**
 * POST /successionGetDevelopmentFollowThrough
 *
 * Read-only view of whether committed development work is actually closing:
 * what is on time, what is overdue, what has stalled, and how each plan is
 * progressing. Optionally scoped to one cycle.
 *
 * Deliberately reports execution, not performance: an overdue action is a
 * plan that needs attention, never a judgement about the person. No ranking,
 * scoring, or recommendation is produced.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, cycle_id } = body;

  if (!operation_id) {
    return Response.json({ error: "operation_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionGetDevelopmentFollowThrough",
    target_client_id: auth.client_id,
    required_permission: "succession.development.view",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  try {
    const followThrough = await computeDevelopmentFollowThrough(base44, auth.client_id, cycle_id || null);
    return Response.json({ operation_id, ...followThrough });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}