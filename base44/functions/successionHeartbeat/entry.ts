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
  await heartbeatOperation(base44, operation_id);
  return Response.json({ operation_id, heartbeat_at: new Date().toISOString() });
}