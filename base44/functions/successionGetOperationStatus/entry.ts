import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { getOperationStatus } from "../../shared/successionOperationHelper.ts";

/**
 * POST /successionGetOperationStatus
 *
 * Restricted operational-status function. Returns minimum-necessary non-sensitive
 * fields only: {operation_id, function_name, status, integrity_status, attempt_count,
 * last_heartbeat_at, error_code, lease_expires_at}. No payload, no actor PII, no domain records.
 *
 * Ordinary entity reads of SuccessionOperation are denied (RLS read=false).
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id } = body;

  if (!operation_id) {
    return Response.json({ error: "operation_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) {
    return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  }

  const status = await getOperationStatus(base44, operation_id);
  if (!status) {
    return Response.json({ error: "Operation not found" }, { status: 404 });
  }

  return Response.json(status);
}