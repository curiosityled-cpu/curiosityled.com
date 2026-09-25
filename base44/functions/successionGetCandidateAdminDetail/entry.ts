import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";

/**
 * POST /successionGetCandidateAdminDetail
 *
 * Secure operational read: admin read-only detail for a single candidacy and
 * its disclosure history. Read-only — administrators cannot author or
 * overwrite candidate self-disclosures.
 *
 * Enforces:
 *   - authenticated tenant (client_id from bootstrap)
 *   - authorized role/scope (succession.discovery.view)
 *   - Platform Admin denial (via authorizeSuccessionAction)
 *   - integrity_status=active only (candidacy + disclosures)
 *   - allowed lifecycle status (active, withdrawn candidacies; current + superseded disclosures)
 *   - confidentiality clearance (via authorizeSuccessionAction)
 *   - minimum necessary fields
 *   - generic cross-tenant rejection (client_id scoping)
 *
 * Does NOT return: evidence, scores, readiness, rankings, recommendations,
 * internal deliberations, or OTHER candidates' self-disclosures.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { candidacy_id } = body;

  if (!candidacy_id) {
    return Response.json({ error: "candidacy_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionGetCandidateAdminDetail",
    target_client_id: auth.client_id,
    required_permission: "succession.discovery.view",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  try {
    // ── Load candidacy within tenant scope ──
    const candidacies = await base44.asServiceRole.entities.SuccessorCandidacy.filter({
      client_id: auth.client_id,
      id: candidacy_id,
      integrity_status: "active",
      status: { $in: ["active", "withdrawn"] },
    });
    if (candidacies.length === 0) {
      return Response.json({ error: "Candidacy not found" }, { status: 404 });
    }
    const candidacy = candidacies[0];

    // ── Load minimal critical role label (no deliberation fields) ──
    let role_label = "Critical Role";
    try {
      const roles = await base44.asServiceRole.entities.CriticalRole.filter({
        client_id: auth.client_id,
        id: candidacy.critical_role_id,
      });
      if (roles.length > 0) {
        role_label = roles[0].org_position_id || "Critical Role";
      }
    } catch { /* minimal label fallback */ }

    // ── Load disclosures for this candidacy only (active integrity) ──
    const disclosures = await base44.asServiceRole.entities.CandidateSelfDisclosure.filter({
      client_id: auth.client_id,
      candidacy_id,
      integrity_status: "active",
    });

    const sorted = (disclosures || []).sort((a: any, b: any) => (b.version || 0) - (a.version || 0));
    const current = sorted.find((d: any) => d.status === "current") || null;
    const history = sorted.filter((d: any) => d.status !== "current");

    const minimalDisclosure = (d: any) => ({
      disclosure_id: d.id,
      version: d.version,
      status: d.status,
      aspiration_status: d.aspiration_status,
      aspiration_statement: d.aspiration_statement || null,
      mobility: d.mobility,
      availability_horizon: d.availability_horizon,
      conflict_of_interest_disclosed: d.conflict_of_interest_disclosed,
      submitted_at: d.submitted_at || null,
    });

    const response = {
      candidacy: {
        id: candidacy.id,
        cycle_id: candidacy.cycle_id,
        critical_role_id: candidacy.critical_role_id,
        role_label,
        user_profile_id: candidacy.user_profile_id,
        effective_blueprint_snapshot_id: candidacy.effective_blueprint_snapshot_id || null,
        discovery_source: candidacy.discovery_source,
        status: candidacy.status,
        nominated_by_profile_id: candidacy.nominated_by_profile_id || null,
        nominated_at: candidacy.nominated_at || null,
      },
      current_disclosure: current ? minimalDisclosure(current) : null,
      disclosure_history: history.map(minimalDisclosure),
      // Read-only flag — admins cannot author or overwrite disclosures
      can_author_disclosure: false,
    };

    return Response.json(response);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}