import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { validateSameTenantReference } from "../../shared/successionCrossTenantValidation.ts";
import { LEADERSHIP_INDEX_FRAMEWORK_VERSION, LEADERSHIP_INDEX_COMPETENCY_KEYS } from "../../shared/successionLeadershipIndexValidator.ts";

/**
 * POST /successionListEligibleLeadershipIndexAssessments
 *
 * Given a candidacy_id, returns only assessments that:
 * - belong to the candidacy's candidate profile (email match)
 * - belong to the same tenant
 * - are Leadership Index assessments (CustomAssessment with LI competencies)
 * - are completed and finalized (scored or reviewed)
 * - have a known framework version (derived constant)
 * - have a known leadership level
 * - contain competency-level results
 * - satisfy existing authorization (RLS)
 * - are visible to the authenticated actor
 *
 * Returns minimum metadata only. No raw responses, question text, or narrative.
 */
const SCAN_LIMIT = 100;

export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { candidacy_id } = body;

  if (!candidacy_id) return Response.json({ error: "candidacy_id required" }, { status: 400 });

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionListEligibleLeadershipIndexAssessments",
    target_client_id: auth.client_id,
    required_permission: "succession.evidence.view",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  try {
    const cid = auth.client_id;

    // ── 1. Load candidacy (same tenant) ──
    const candidacy = await validateSameTenantReference(base44, "SuccessorCandidacy", candidacy_id, cid);
    if (!candidacy) return Response.json({ error: "Candidacy not found" }, { status: 404 });
    if (candidacy.status !== "active") return Response.json({ error: "Candidacy is not active" }, { status: 400 });

    // ── 2. Load candidate UserProfile ──
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({
      id: candidacy.user_profile_id,
      tenant_id: cid,
    });
    if (profiles.length === 0) return Response.json({ error: "Candidate profile not found" }, { status: 404 });
    const candidateProfile = profiles[0];
    const candidateEmail = candidateProfile.email;

    // ── 3. Load finalized AssessmentSubmissions for this candidate ──
    const submissions = await base44.asServiceRole.entities.AssessmentSubmission.filter({
      user_email: candidateEmail,
      client_id: cid,
    }, "-submission_date", SCAN_LIMIT);

    // Filter to finalized only
    const finalized = submissions.filter((s: any) =>
      s.status === "scored" || s.status === "reviewed"
    );

    // ── 4. For each, check if it's a Leadership Index assessment ──
    const eligibleAssessments = [];
    for (const sub of finalized) {
      if (!sub.custom_assessment_id || !sub.leadership_level) continue;

      // Load CustomAssessment
      const customAssessments = await base44.asServiceRole.entities.CustomAssessment.filter({
        id: sub.custom_assessment_id,
        client_id: cid,
      });
      if (customAssessments.length === 0) continue;
      const ca = customAssessments[0];

      // Check for Leadership Index competencies
      const competencyIds = ca.competency_ids || [];
      if (competencyIds.length === 0) continue;

      let hasLICompetencies = false;
      let competencyResultCount = 0;
      const userResponses = sub.user_responses || [];

      for (const cid_ of competencyIds) {
        try {
          const comps = await base44.asServiceRole.entities.Competency.filter({ id: cid_ });
          if (comps.length > 0 && comps[0].field_key && LEADERSHIP_INDEX_COMPETENCY_KEYS.has(comps[0].field_key)) {
            hasLICompetencies = true;
          }
        } catch { /* skip */ }
      }

      // Count competency-level results
      competencyResultCount = userResponses.filter((r: any) => r.competency_id && r.proficiency_value != null).length;

      if (!hasLICompetencies || competencyResultCount === 0) continue;

      // ── 5. Check existing evidence links ──
      const existingEvidence = await base44.asServiceRole.entities.EvidenceRecord.filter({
        client_id: cid,
        candidacy_id,
        source_record_id: sub.id,
        source_system: "curiosity_led",
      }, "-created_date", 10);
      const alreadyLinked = existingEvidence.length > 0;

      eligibleAssessments.push({
        assessment_id: sub.id,
        assessment_definition_id: sub.custom_assessment_id,
        assessment_definition_title: ca.title,
        framework_version: LEADERSHIP_INDEX_FRAMEWORK_VERSION,
        leadership_level: sub.leadership_level,
        completion_date: sub.submission_date?.split("T")[0] || null,
        result_status: sub.status,
        competency_result_count: competencyResultCount,
        already_linked: alreadyLinked,
        linked_evidence_count: existingEvidence.length,
      });
    }

    return Response.json({
      candidacy_id,
      candidate_email: candidateEmail,
      assessments: eligibleAssessments,
      total: eligibleAssessments.length,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}