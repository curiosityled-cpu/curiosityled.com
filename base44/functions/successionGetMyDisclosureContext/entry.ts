import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";

/**
 * POST /successionGetMyDisclosureContext
 *
 * Secure candidate self-service read path. Returns ONLY the minimal fields a
 * candidate needs to view and submit their own self-disclosure:
 *   - candidacy ID
 *   - minimal role label (critical role display, no internal notes)
 *   - candidate's current disclosure (version, date, fields)
 *   - permitted actions (can_submit_disclosure)
 *
 * Does NOT return: readiness, internal HR notes, inclusion rationale, other
 * candidates, administrative succession deliberations, scores, rankings, or
 * recommendations.
 *
 * Backend enforcement: authenticated_profile_id MUST equal candidacy.user_profile_id.
 * The succession.discovery.disclose permission controls UI visibility only;
 * the backend enforces ownership regardless of permission.
 *
 * Platform Admin is denied.
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

  // authorizeSuccessionAction denies Platform Admin and checks tenant scope.
  // No required_permission — ownership check below is the real gate.
  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionGetMyDisclosureContext",
    target_client_id: auth.client_id,
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  try {
    // Fetch candidacy within tenant scope
    const candidacies = await base44.asServiceRole.entities.SuccessorCandidacy.filter({
      client_id: auth.client_id,
      id: candidacy_id,
    });
    if (candidacies.length === 0) {
      return Response.json({ error: "Candidacy not found" }, { status: 404 });
    }
    const candidacy = candidacies[0];

    // ── Ownership enforcement: auth.profile_id must match candidacy.user_profile_id ──
    if (candidacy.user_profile_id !== auth.profile_id) {
      await writeSuccessionAuditEvent({
        base44, action_type: "denied_action",
        target_entity_type: "SuccessorCandidacy", target_entity_id: candidacy_id,
        metadata: {
          action: "successionGetMyDisclosureContext",
          denied_reason: "not_own_candidacy",
          actor_profile_id: auth.profile_id,
          candidacy_user_profile_id: candidacy.user_profile_id,
        },
        operation_id: `disclosure-ctx-${Date.now()}`,
        event_key: { action: "denied_disclosure_ctx_not_own_candidacy", candidacy_id },
        event_type: "denied_action",
      });
      return Response.json({ error: "You may only view disclosure context for your own candidacy." }, { status: 403 });
    }

    // Fetch critical role label (minimal — no internal notes or deliberations)
    let role_label = "Critical Role";
    try {
      const roles = await base44.asServiceRole.entities.CriticalRole.filter({
        client_id: auth.client_id,
        id: candidacy.critical_role_id,
      });
      if (roles.length > 0) {
        const role = roles[0];
        // Use org_position_id as a minimal label; do NOT expose designation_reason,
        // governance_tier, continuity_urgency, or any deliberation fields.
        role_label = role.org_position_id || "Critical Role";
      }
    } catch { /* minimal label fallback */ }

    // Fetch the candidate's current disclosure only (active integrity)
    const disclosures = await base44.asServiceRole.entities.CandidateSelfDisclosure.filter({
      client_id: auth.client_id,
      candidacy_id,
      status: "current",
      integrity_status: "active",
    });

    const currentDisclosure = disclosures.length > 0 ? disclosures[0] : null;

    // Build the minimal response — no readiness, no HR notes, no other candidates,
    // no inclusion rationale, no deliberations, no scores, no rankings.
    const response = {
      candidacy_id: candidacy.id,
      candidacy_status: candidacy.status,
      role_label,
      current_disclosure: currentDisclosure ? {
        disclosure_id: currentDisclosure.id,
        version: currentDisclosure.version,
        aspiration_status: currentDisclosure.aspiration_status,
        aspiration_statement: currentDisclosure.aspiration_statement || null,
        mobility: currentDisclosure.mobility,
        availability_horizon: currentDisclosure.availability_horizon,
        conflict_of_interest_disclosed: currentDisclosure.conflict_of_interest_disclosed,
        submitted_at: currentDisclosure.submitted_at,
      } : null,
      permitted_actions: {
        can_submit_disclosure: candidacy.status === "active",
      },
    };

    return Response.json(response);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}