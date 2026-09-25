import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionGetEvidenceDetail
 *
 * Secure operational read: returns full detail for a single EvidenceRecord,
 * including its linked frozen requirement and all review decisions (append-only).
 *
 * Enforces:
 *   - authenticated tenant
 *   - succession.evidence.view permission
 *   - evidence belongs to the tenant
 *   - integrity_status=active
 *   - includes the linked EffectiveRequirementSnapshot (frozen text, not mutable source)
 *   - includes all review decisions in chronological order
 *
 * Does NOT return: readiness scores, rankings, or recommendations.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { evidence_id } = body;

  if (!evidence_id) return Response.json({ error: "evidence_id required" }, { status: 400 });

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionGetEvidenceDetail",
    target_client_id: auth.client_id,
    required_permission: "succession.evidence.view",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  try {
    const evidence = await validateSameTenantReference(base44, "EvidenceRecord", evidence_id, auth.client_id);
    if (!evidence) {
      await writeDeniedReferenceEvent(base44, auth, "EvidenceRecord", evidence_id, "cross_tenant_or_not_found");
      return Response.json({ error: "Evidence not found" }, { status: 404 });
    }

    // Load the frozen requirement child
    const requirements = await base44.asServiceRole.entities.EffectiveRequirementSnapshot.filter({
      id: evidence.effective_requirement_snapshot_id,
      client_id: auth.client_id,
    });
    const requirement = requirements.length > 0 ? requirements[0] : null;

    // Load all review decisions (append-only — full history)
    const reviews = await base44.asServiceRole.entities.EvidenceReviewDecision.filter({
      client_id: auth.client_id,
      evidence_record_id: evidence_id,
      integrity_status: "active",
    }, 'reviewed_at');

    const reviewHistory = (reviews || []).map((r: any) => ({
      id: r.id,
      decision: r.decision,
      evidence_strength: r.evidence_strength,
      confidence: r.confidence,
      relevance: r.relevance,
      limitations: r.limitations || null,
      contrary_evidence_indicator: r.contrary_evidence_indicator || false,
      contrary_evidence_notes: r.contrary_evidence_notes || null,
      reviewed_at: r.reviewed_at,
      reviewer_profile_id: r.reviewer_profile_id,
    }));

    return Response.json({
      evidence: {
        id: evidence.id,
        candidacy_id: evidence.candidacy_id,
        user_profile_id: evidence.user_profile_id,
        critical_role_id: evidence.critical_role_id,
        effective_blueprint_snapshot_id: evidence.effective_blueprint_snapshot_id,
        effective_requirement_snapshot_id: evidence.effective_requirement_snapshot_id,
        evidence_type: evidence.evidence_type,
        source_system: evidence.source_system,
        source_record_id: evidence.source_record_id || null,
        source_date: evidence.source_date,
        title: evidence.title,
        description: evidence.description,
        submitted_by_profile_id: evidence.submitted_by_profile_id,
        submitted_at: evidence.submitted_at,
        freshness_review_date: evidence.freshness_review_date,
        expiration_date: evidence.expiration_date || null,
        status: evidence.status,
        supersedes_evidence_record_id: evidence.supersedes_evidence_record_id || null,
        withdrawn_at: evidence.withdrawn_at || null,
        withdrawn_by_profile_id: evidence.withdrawn_by_profile_id || null,
        withdrawal_reason: evidence.withdrawal_reason || null,
      },
      frozen_requirement: requirement ? {
        id: requirement.id,
        requirement_key: requirement.requirement_key,
        requirement_type: requirement.requirement_type,
        source_type: requirement.source_type,
        modification_type: requirement.modification_type,
        frozen_title: requirement.frozen_title,
        effective_language: requirement.effective_language,
        effective_level: requirement.effective_level || null,
        applicability_status: requirement.applicability_status,
      } : null,
      review_history: reviewHistory,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}