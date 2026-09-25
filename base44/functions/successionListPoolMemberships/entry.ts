import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { validateSameTenantReference } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionListPoolMemberships
 *
 * Secure operational read: lists memberships for a talent pool.
 *
 * Enforces:
 *   - authenticated tenant (client_id from bootstrap)
 *   - authorized role/scope (succession.discovery.view)
 *   - Platform Admin denial (via authorizeSuccessionAction)
 *   - pool belongs to the tenant (validateSameTenantReference)
 *   - integrity_status=active only
 *   - active lifecycle status only
 *   - minimum necessary fields (no quarantine metadata, no adder PII)
 *   - generic cross-tenant rejection (client_id scoping)
 *
 * Does NOT return: adder/remover profile IDs, quarantine metadata, resolution
 * rationale, or any deliberation fields.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { pool_id, limit } = body;

  if (!pool_id) return Response.json({ error: "pool_id required" }, { status: 400 });

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionListPoolMemberships",
    target_client_id: auth.client_id,
    required_permission: "succession.discovery.view",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  // Verify the pool belongs to the tenant before listing its members
  const pool = await validateSameTenantReference(base44, "TalentPool", pool_id, auth.client_id);
  if (!pool) return Response.json({ error: "Pool not found" }, { status: 404 });

  try {
    const memberships = await base44.asServiceRole.entities.TalentPoolMembership.filter({
      client_id: auth.client_id,
      pool_id,
      integrity_status: "active",
      status: "active",
    }, '-added_at', limit || 200);

    // Minimum necessary fields only — no adder/remover PII, no quarantine metadata
    const minimal = (memberships || []).map((m: any) => ({
      id: m.id,
      pool_id: m.pool_id,
      user_profile_id: m.user_profile_id,
      added_at: m.added_at || null,
      status: m.status,
    }));

    return Response.json({ memberships: minimal });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}