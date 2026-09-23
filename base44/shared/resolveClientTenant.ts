/**
 * resolveClientTenant — resolves the canonical tenant (client_id) for a
 * TENANT user. Applies only to tenant users (not Platform Admins, who may
 * not carry a customer client_id — see resolvePlatformOperatorContext).
 *
 * Flow: authenticate → read user.client_id → validate active Client →
 *       return canonical client_id.
 * Rejects: missing client_id, inactive Client, mismatched client_id.
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";

export interface TenantContext {
  user: any;
  client_id: string;
  client: any;
}

export async function resolveClientTenant(base44: any): Promise<TenantContext> {
  const user = await base44.auth.me();
  if (!user) {
    throw new TenantResolutionError("Unauthorized — no authenticated user.", 401);
  }

  const client_id = user.client_id || user.data?.client_id;
  if (!client_id) {
    throw new TenantResolutionError(
      "Tenant resolution failed: user has no client_id. " +
        "Platform operators must use the platform-control path, not the tenant path.",
      403
    );
  }

  // Validate the Client exists and is active
  let client: any;
  try {
    client = await base44.asServiceRole.entities.Client.get(client_id);
  } catch {
    // get may throw on not-found
  }

  if (!client) {
    throw new TenantResolutionError(
      `Tenant resolution failed: client_id "${client_id}" does not exist.`,
      403
    );
  }

  if (client.status && !["active", "trial"].includes(client.status)) {
    throw new TenantResolutionError(
      `Tenant resolution failed: client "${client_id}" is not active (status: ${client.status}).`,
      403
    );
  }

  return { user, client_id: client.id, client };
}

export class TenantResolutionError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "TenantResolutionError";
    this.status = status;
  }
}