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

/**
 * resolveCanonicalClient — the ONE canonical server-side tenant resolver.
 *
 * Accepts a raw client identifier that may be either:
 *   - a Client entity ID (MongoDB ObjectId), OR
 *   - a legacy slug (e.g. "demo-acme-corp", "acme-corp")
 *
 * Resolves to the canonical Client entity and returns its entity ID.
 * Rejects: missing, not-found, ambiguous (multiple slug matches), inactive.
 *
 * This helper is used by both resolveClientTenant (general tenant functions)
 * and successionAuthBootstrap (succession authorization) so that every
 * server-side code path applies the SAME resolution logic.
 */
export async function resolveCanonicalClient(
  base44: any,
  rawClientId: string
): Promise<{ client: any; canonical_id: string }> {
  if (!rawClientId) {
    throw new TenantResolutionError(
      "Tenant resolution failed: no client identifier provided.",
      403
    );
  }

  // ── 1. Try by entity ID first (the common / correct case) ──────────────────
  let client: any = null;
  try {
    client = await base44.asServiceRole.entities.Client.get(rawClientId);
  } catch {
    // Not found by entity ID — may be a legacy slug
  }

  if (client) {
    return { client, canonical_id: client.id };
  }

  // ── 2. Fall back to slug lookup (legacy identifier format) ────────────────
  let slugMatches: any[] = [];
  try {
    slugMatches = await base44.asServiceRole.entities.Client.filter({
      slug: rawClientId,
    });
  } catch {
    // filter may throw on error
  }

  if (slugMatches.length === 0) {
    throw new TenantResolutionError(
      `Tenant resolution failed: no Client found for identifier "${rawClientId}". ` +
        `Checked both entity ID and slug.`,
      403
    );
  }

  if (slugMatches.length > 1) {
    throw new TenantResolutionError(
      `Tenant resolution failed: ambiguous Client match for slug "${rawClientId}" — ` +
        `${slugMatches.length} clients found. Cannot resolve to a single tenant.`,
      403
    );
  }

  client = slugMatches[0];
  return { client, canonical_id: client.id };
}

export async function resolveClientTenant(base44: any): Promise<TenantContext> {
  const user = await base44.auth.me();
  if (!user) {
    throw new TenantResolutionError("Unauthorized — no authenticated user.", 401);
  }

  const rawClientId = user.client_id || user.data?.client_id;
  if (!rawClientId) {
    throw new TenantResolutionError(
      "Tenant resolution failed: user has no client_id. " +
        "Platform operators must use the platform-control path, not the tenant path.",
      403
    );
  }

  // Use the canonical resolver — handles both entity ID and slug formats
  const { client, canonical_id } = await resolveCanonicalClient(base44, rawClientId);

  if (client.status && !["active", "trial"].includes(client.status)) {
    throw new TenantResolutionError(
      `Tenant resolution failed: client "${canonical_id}" is not active (status: ${client.status}).`,
      403
    );
  }

  // Cross-tenant substitution check: the resolved canonical ID must match
  // what the user claims. If the user supplied a slug that resolved to a
  // different entity, we use the canonical ID — but we also verify the
  // user isn't trying to override their tenant via browser-supplied data.
  const userClaimedId = user.data?.client_id_override;
  if (userClaimedId && userClaimedId !== canonical_id && userClaimedId !== rawClientId) {
    throw new TenantResolutionError(
      `Tenant resolution failed: browser-supplied client override "${userClaimedId}" ` +
        `does not match resolved tenant "${canonical_id}".`,
      403
    );
  }

  return { user, client_id: canonical_id, client };
}

export class TenantResolutionError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "TenantResolutionError";
    this.status = status;
  }
}