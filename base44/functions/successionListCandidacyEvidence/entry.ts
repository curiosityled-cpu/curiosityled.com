import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { validateSameTenantReference } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionListCandidacyEvidence
 *
 * Secure operational read: lists evidence records for a candidacy.
 *
 * Enforces:
 *   - authenticated tenant (client_id from bootstrap)
 *   - authorized role/scope (succession.evidence.view)
 *   - Platform Admin denial (via authorizeSuccessionAction)
 *   - candidacy belongs to the tenant
 *   - integrity_status=active only
 *   - minimum necessary fields (no quarantine metadata, no PII beyond submitter ID)
 *   - includes latest review decision summary per record
 *
 * Does NOT return: readiness scores, rankings, recommendations, or deliberation notes.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { candidacy_id, status_filter, limit } = body;

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionListCandidacyEvidence",
    target_client_id: auth.client_id,
    required_permission: "succession.evidence.view",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  // If candidacy_id is provided, verify it belongs to the tenant
  if (candidacy_id) {
    const candidacy = await validateSameTenantReference(base44, "SuccessorCandidacy", candidacy_id, auth.client_id);
    if (!candidacy) return Response.json({ error: "Candidacy not found" }, { status: 404 });
  }

  try {
    const filter: any = {
      client_id: auth.client_id,
      integrity_status: "active",
    };
    if (candidacy_id) {
      filter.candidacy_id = candidacy_id;
    }
    // Allow filtering by status; default to all non-withdrawn/non-superseded
    if (status_filter) {
      if (Array.isArray(status_filter)) {
        filter.status = { $in: status_filter };
      } else {
        filter.status = status_filter;
      }
    } else {
      filter.status = { $in: ["draft", "submitted", "under_review", "accepted", "accepted_with_limitations", "rejected", "expired", "withdrawn", "superseded"] };
    }

    const records = await base44.asServiceRole.entities.EvidenceRecord.filter(
      filter, '-submitted_at', limit || 200
    );

    // Fetch latest review decision for each evidence record
    const evidenceWithReviews = await Promise.all((records || []).map(async (e: any) => {
      const reviews = await base44.asServiceRole.entities.EvidenceReviewDecision.filter({
        client_id: auth.client_id,
        evidence_record_id: e.id,
        integrity_status: "active",
      }, '-reviewed_at', 1);

      const latestReview = reviews.length > 0 ? reviews[0] : null;

      return {
        id: e.id,
        candidacy_id: e.candidacy_id,
        effective_requirement_snapshot_id: e.effective_requirement_snapshot_id,
        evidence_type: e.evidence_type,
        source_system: e.source_system,
        source_date: e.source_date,
        title: e.title,
        status: e.status,
        submitted_by_profile_id: e.submitted_by_profile_id,
        submitted_at: e.submitted_at,
        freshness_review_date: e.freshness_review_date,
        expiration_date: e.expiration_date || null,
        supersedes_evidence_record_id: e.supersedes_evidence_record_id || null,
        latest_review: latestReview ? {
          decision: latestReview.decision,
          evidence_strength: latestReview.evidence_strength,
          confidence: latestReview.confidence,
          relevance: latestReview.relevance,
          limitations: latestReview.limitations || null,
          contrary_evidence_indicator: latestReview.contrary_evidence_indicator || false,
          reviewed_at: latestReview.reviewed_at,
          reviewer_profile_id: latestReview.reviewer_profile_id,
        } : null,
      };
    }));

    return Response.json({ evidence: evidenceWithReviews });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}