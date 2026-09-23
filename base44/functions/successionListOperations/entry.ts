import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";

/** POST /successionListOperations — governance: list operations (restricted) */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { status, limit } = await req.json().catch(() => ({}));
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionListOperations", target_client_id: auth.client_id, required_permission: "succession.governance.view" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });
  const filter: any = { client_id: auth.client_id };
  if (status) filter.status = status;
  const ops = await base44.asServiceRole.entities.SuccessionOperation.filter(filter, '-created_date', limit || 50);
  // Return minimum-necessary fields only
  return Response.json({
    operations: ops.map((op: any) => ({
      operation_id: op.operation_id, function_name: op.function_name,
      status: op.status, integrity_status: op.integrity_status,
      attempt_count: op.attempt_count, last_heartbeat_at: op.last_heartbeat_at,
      error_code: op.error_code, lease_expires_at: op.lease_expires_at,
    })),
  });
}