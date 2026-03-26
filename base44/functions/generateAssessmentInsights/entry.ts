import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * generateAssessmentInsights
 *
 * Called by an entity automation whenever an Assessment record is created.
 * Generates AI-powered insights and saves them to AssessmentInsights.
 * Upserts on assessment_id to prevent duplicates.
 *
 * Payload (from entity automation):
 *   event.type        - "create" | "update"
 *   event.entity_id   - Assessment record ID
 *   data              - Assessment record fields
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const body = await req.json();
    const { event, data: assessmentData } = body;

    const assessmentId = event?.entity_id;
    if (!assessmentId) {
      console.error('[AssessmentInsights] Missing entity_id in automation payload');
      return Response.json({ error: 'Missing entity_id' }, { status: 400 });
    }

    console.log(`[AssessmentInsights] Processing assessment: ${assessmentId}`);

    // -------------------------------------------------------
    // 1. Fetch full Assessment record (payload_too_large guard)
    // -------------------------------------------------------
    let assessment = assessmentData;
    if (!assessment || body.payload_too_large) {
      console.log('[AssessmentInsights] Fetching full assessment record from DB');
      const records = await base44.asServiceRole.entities.Assessment.filter({ id: assessmentId });
      if (!records || records.length === 0) {
        console.error(`[AssessmentInsights] Assessment ${assessmentId} not found`);
        return Response.json({ error: 'Assessment not found' }, { status: 404 });
      }
      assessment = records[0];
    }

    // Guard: skip if no meaningful score data yet
    if (!assessment.overall_pct && !assessment.si_pct) {
      console.warn(`[AssessmentInsights] Assessment ${assessmentId} has no scores yet — skipping`);
      return Response.json({ skipped: true, reason: 'no_scores' });
    }

    // -------------------------------------------------------
    // 2. Fetch user context
    // -------------------------------------------------------
    let userContext = {};
    if (assessment.email) {
      try {
        const users = await base44.asServiceRole.entities.User.filter({ email: assessment.email });
        if (users.length > 0) {
          const u = users[0];
          userContext = {
            full_name: u.full_name,
            current_role: u.current_role,
            department: u.department,
            leadership_level: u.leadership_level,
            sector: u.sector,
            app_role: u.app_role
          };
        }
      } catch (err) {
        console.warn('[AssessmentInsights] Could not fetch user context:', err.message);
      }
    }

    // -------------------------------------------------------
    // 3. Fetch org context
    // -------------------------------------------------------
    let orgName = 'the organization';
    let orgIndustry = null;
    if (assessment.client_id) {
      try {
        const clients = await base44.asServiceRole.entities.Client.filter({ id: assessment.client_id });
        if (clients.length > 0) {
          orgName = clients[0].name || orgName;
          orgIndustry = clients[0].industry || null;
        }
      } catch (err) {
        console.warn('[AssessmentInsights] Could not fetch org context:', err.message);
      }
    }

    // -------------------------------------------------------
    // 4. Build OpenAI prompt
    // -------------------------------------------------------
    const scoreBlock = `
- Overall Leadership Score: ${assessment.overall_pct ?? 'N/A'}%
- Situational Intelligence (SI): ${assessment.si_pct ?? 'N/A'}%
- Decision Making (DM): ${assessment.dm_pct ?? 'N/A'}%
- Communication (COMM): ${assessment.comm_pct ?? 'N/A'}%
- Resource Management (RM): ${assessment.rm_pct ?? 'N/A'}%
- Stakeholder Management (SM): ${assessment.sm_pct ?? 'N/A'}%
- Performance Management (PM): ${assessment.pm_pct ?? 'N/A'}%
- Proficiency Band: ${assessment.band_overall ?? 'N/A'}
- Archetype (rule-based): ${assessment.archetype_label ?? 'N/A'}
`.trim();

    const userBlock = userContext.full_name ? `
Leader: ${userContext.full_name}
Current Role: ${userContext.current_role ?? 'Not specified'}
Department: ${userContext.department ?? 'Not specified'}
Leadership Level: ${userContext.leadership_level ?? 'Not specified'}
Sector: ${userContext.sector ?? 'Not specified'}
`.trim() : 'User context: not available';

    const prompt = `You are an expert leadership development coach analyzing a completed Leadership Index assessment.

ORGANIZATION: ${orgName}${orgIndustry ? ` (${orgIndustry})` : ''}

${userBlock}

ASSESSMENT SCORES:
${scoreBlock}

Based on these results, generate a structured leadership insight report with the following fields:

1. archetype (string): A refined leadership archetype label that best fits the score pattern. Use one of these if applicable: "The Adaptive Strategist", "The Influential Connector", "The Resourceful Optimizer", "The Performance Catalyst", "The Steady Operator", "The Change Navigator", "The Collaborative Problem-Solver", "The Visionary Architect". Otherwise generate an appropriate new label.

2. top_strengths (array of 3-5 strings): Specific competency-based strengths supported by the scores. Be concrete and reference actual score areas.

3. development_areas (array of 3-5 strings): Competency gaps or improvement areas clearly grounded in lower scores. Be specific and constructive.

4. risk_flags (array of 0-3 strings): Only include if genuinely warranted by the data. Use labels like "low_situational_intelligence", "critical_communication_gap", "resource_management_deficit", "stakeholder_alignment_risk". Return an empty array if no material risks exist.

5. summary (string, 3-4 sentences): A professional narrative summary of this leader's profile — their archetype, what their scores reveal about their leadership style, and their readiness level. Write for an L&D professional audience.

6. recommendations (array of 4-6 strings): Specific, actionable development recommendations grounded in the score data. Reference specific competencies and suggest concrete actions.

Be precise. Do not hallucinate strengths or risks that are not supported by the score data. If a score is missing or zero for a competency, treat it as insufficient data rather than a zero score.`;

    console.log(`[AssessmentInsights] Invoking OpenAI for assessment ${assessmentId}`);

    // -------------------------------------------------------
    // 5. Call OpenAI via Base44 LLM integration
    // -------------------------------------------------------
    let aiResult;
    try {
      aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            archetype: { type: 'string' },
            top_strengths: { type: 'array', items: { type: 'string' } },
            development_areas: { type: 'array', items: { type: 'string' } },
            risk_flags: { type: 'array', items: { type: 'string' } },
            summary: { type: 'string' },
            recommendations: { type: 'array', items: { type: 'string' } }
          },
          required: ['archetype', 'top_strengths', 'development_areas', 'risk_flags', 'summary', 'recommendations']
        }
      });
    } catch (llmError) {
      console.error(`[AssessmentInsights] OpenAI call failed for assessment ${assessmentId}:`, llmError.message);

      // Mark as failed in AssessmentInsights so dashboards know not to display stale/missing data
      await upsertInsights(base44, assessmentId, assessment, {
        status: 'failed',
        summary: null
      });

      return Response.json({ success: false, error: 'LLM call failed', detail: llmError.message }, { status: 500 });
    }

    console.log(`[AssessmentInsights] AI generation complete for assessment ${assessmentId}`);

    // -------------------------------------------------------
    // 6. Upsert into AssessmentInsights
    // -------------------------------------------------------
    const insightRecord = {
      status: 'generated',
      archetype: aiResult.archetype,
      top_strengths: aiResult.top_strengths || [],
      development_areas: aiResult.development_areas || [],
      risk_flags: aiResult.risk_flags || [],
      summary: aiResult.summary,
      recommendations: aiResult.recommendations || []
    };

    const saved = await upsertInsights(base44, assessmentId, assessment, insightRecord);

    console.log(`[AssessmentInsights] ✅ Saved insights record ${saved.id} for assessment ${assessmentId}`);

    return Response.json({
      success: true,
      assessment_id: assessmentId,
      insights_id: saved.id,
      archetype: aiResult.archetype
    });

  } catch (error) {
    console.error('[AssessmentInsights] Unexpected error:', error.message, error.stack);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});

/**
 * Upsert helper — finds existing record by assessment_id and updates,
 * or creates a new one. Prevents duplicate insight records.
 */
async function upsertInsights(base44, assessmentId, assessment, fields) {
  const existing = await base44.asServiceRole.entities.AssessmentInsights.filter({
    assessment_id: assessmentId
  });

  const payload = {
    assessment_id: assessmentId,
    user_email: assessment.email || null,
    client_id: assessment.client_id || null,
    ...fields
  };

  if (existing.length > 0) {
    console.log(`[AssessmentInsights] Updating existing record ${existing[0].id}`);
    return await base44.asServiceRole.entities.AssessmentInsights.update(existing[0].id, payload);
  } else {
    console.log(`[AssessmentInsights] Creating new AssessmentInsights record`);
    return await base44.asServiceRole.entities.AssessmentInsights.create(payload);
  }
}