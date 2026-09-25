import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";

/**
 * POST /successionListTalentPools
 *
 * Secure operational read: lists talent pools for the authenticated tenant.
 *
 * Enforces:
 *   - authenticated tenant (client_id from bootstrap)
 *   - authorized role/scope (succession.discovery.view)
 *   - Platform Admin denial (via authorizeSuccessionAction)
 *   - integrity_status=active only
 *   - allowed lifecycle status (active, archived)
 *   - minimum necessary fields (no member data, no audit internals)
 *   - generic cross-tenant rejection (client_id scoping)
 *
 * Does NOT return: member lists, pool creator PII, quarantine metadata,
 * resolution rationale, or any deliberation fields.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { cycle_id, limit } = body;

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionListTalentPools",
    target_client_id: auth.client_id,
    required_permission: "succession.discovery.view",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  try {
    const filter: any = {
      client_id: auth.client_id,
      integrity_status: "active",
      status: { $in: ["active", "archived"] },
    };
    if (cycle_id) filter.cycle_id = cycle_id;

    const pools = await base44.asServiceRole.entities.TalentPool.filter(
      filter, '-created_at', limit || 100
    );

    // Minimum necessary fields only
    const minimal = (pools || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description || null,
      status: p.status,
      cycle_id: p.cycle_id,
      created_at: p.created_at || null,
    }));

    return Response.json({ pools: minimal });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}