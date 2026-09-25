import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";

/**
 * POST /successionListCandidacies
 *
 * Secure operational read: lists successor candidacies for the authenticated tenant.
 *
 * Enforces:
 *   - authenticated tenant (client_id from bootstrap)
 *   - authorized role/scope:
 *       * succession.discovery.view or .manage → all tenant candidacies
 *       * no view permission → candidate self-service: own candidacies only
 *   - Platform Admin denial (via authorizeSuccessionAction)
 *   - integrity_status=active only
 *   - allowed lifecycle status (active, withdrawn)
 *   - confidentiality clearance (via authorizeSuccessionAction)
 *   - minimum necessary fields (no scores, readiness, evidence, recommendations)
 *   - generic cross-tenant rejection (client_id scoping)
 *
 * Does NOT return: evidence, scores, readiness, rankings, recommendations,
 * internal deliberations, or other candidates' self-disclosures.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { cycle_id, critical_role_id, limit } = body;

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  // authorizeSuccessionAction denies Platform Admin and checks tenant scope.
  // No required_permission — the self-service path (own candidacies) is allowed
  // for users without discovery.view. The admin path requires discovery.view.
  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionListCandidacies",
    target_client_id: auth.client_id,
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const hasViewPermission =
    auth.permissions.includes("succession.discovery.view") ||
    auth.permissions.includes("succession.discovery.manage") ||
    auth.permissions.includes("*");

  try {
    const filter: any = {
      client_id: auth.client_id,
      integrity_status: "active",
      status: { $in: ["active", "withdrawn"] },
    };

    // Self-service: users without discovery.view see only their own candidacies
    if (!hasViewPermission) {
      filter.user_profile_id = auth.profile_id;
    }

    if (cycle_id) filter.cycle_id = cycle_id;
    if (critical_role_id) filter.critical_role_id = critical_role_id;

    const candidacies = await base44.asServiceRole.entities.SuccessorCandidacy.filter(
      filter, '-nominated_at', limit || 100
    );

    // Minimum necessary fields only — no scores, readiness, evidence, recommendations
    const minimal = (candidacies || []).map((c: any) => ({
      id: c.id,
      cycle_id: c.cycle_id,
      critical_role_id: c.critical_role_id,
      user_profile_id: c.user_profile_id,
      effective_blueprint_snapshot_id: c.effective_blueprint_snapshot_id || null,
      discovery_source: c.discovery_source,
      status: c.status,
      nominated_at: c.nominated_at || null,
    }));

    return Response.json({ candidacies: minimal, is_self_service: !hasViewPermission });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}