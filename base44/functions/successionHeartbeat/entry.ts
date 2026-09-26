import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { heartbeatOperation } from "../../shared/successionOperationHelper.ts";

/** POST /successionHeartbeat — heartbeat an operation to keep its lease alive */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { operation_id } = await req.json().catch(() => ({}));
  if (!operation_id) return Response.json({ error: "operation_id required" }, { status: 400 });
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  // Verify the operation belongs to the caller's tenant before heartbeating.
  const ops = await base44.asServiceRole.entities.SuccessionOperation.filter({
    operation_id, client_id: auth.client_id,
  });
  if (ops.length === 0) return Response.json({ error: "Operation not found in tenant scope" }, { status: 404 });
  await heartbeatOperation(base44, ops[0].id);
  return Response.json({ operation_id, heartbeat_at: new Date().toISOString() });
}