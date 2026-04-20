import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * generateAssessmentInsights
 *
 * Called by an entity automation whenever an Assessment record is CREATED.
 * Generates AI-powered insights and saves them to AssessmentInsights.
 *
 * Reliability guarantees:
 *  - Upserts on assessment_id (duplicate-safe)
 *  - Never throws beyond the outer handler (assessment completion is never broken)
 *  - Logs failures with full detail and writes a 'failed' status record for retry
 *  - Tracks retry_count, last_attempted_at, error_message on every failure
 *  - Returns 200 even on LLM failure so the automation platform doesn't mark it as crashed
 *
 * Can also be called manually for retries by passing { assessment_id } in the body.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  let assessmentId = null; // kept in outer scope for failure logging

  try {
    const body = await req.json().catch(() => ({}));
    const { event, data: automationData, payload_too_large } = body;

    // ── Resolve assessment ID ──────────────────────────────────
    // Supports both: entity automation payload AND manual retry call
    assessmentId = event?.entity_id || body.assessment_id || null;

    if (!assessmentId) {
      console.error('[AssessmentInsights] Missing assessment ID in payload');
      return Response.json({ success: false, error: 'Missing assessment_id' }, { status: 400 });
    }

    console.log(`[AssessmentInsights] START — assessment: ${assessmentId}`);

    // ── 1. Guard: check existing record first (idempotency) ───
    // If a 'generated' record already exists, skip entirely.
    // If a 'pending' record exists from a concurrent call, also skip.
    const existingRecords = await base44.asServiceRole.entities.AssessmentInsights.filter({
      assessment_id: assessmentId
    });
    const existing = existingRecords[0] || null;

    if (existing?.status === 'generated') {
      console.log(`[AssessmentInsights] SKIP — insights already generated for ${assessmentId} (record: ${existing.id})`);
      return Response.json({ success: true, skipped: true, reason: 'already_generated', insights_id: existing.id });
    }

    const retryCount = (existing?.retry_count || 0) + (existing?.status === 'failed' ? 1 : 0);

    // Mark as pending immediately to prevent concurrent duplicate runs.
    // Only include user_email/client_id if we already have them from a prior record
    // (they'll be filled in properly once we load the assessment below).
    const pendingPayload = {
      status: 'pending',
      retry_count: retryCount,
      last_attempted_at: new Date().toISOString(),
      error_message: null,
    };
    if (existing?.user_email) pendingPayload.user_email = existing.user_email;
    if (existing?.client_id)  pendingPayload.client_id  = existing.client_id;

    // For a brand-new record, user_email is required by the entity — defer creation
    // until we have the assessment and can supply user_email.
    let pendingRecord = existing || null; // will be set after assessment load for new records

    // ── 2. Fetch full Assessment record ───────────────────────
    let assessment = (!payload_too_large && automationData?.overall_pct != null) ? automationData : null;

    if (!assessment) {
      console.log('[AssessmentInsights] Fetching assessment from DB');
      const records = await base44.asServiceRole.entities.Assessment.filter({ id: assessmentId });
      if (!records || records.length === 0) {
        console.error(`[AssessmentInsights] Assessment ${assessmentId} not found in DB`);
        // Can only write failure if we already have an existing record (has user_email)
        if (existing) {
          await failInsight(base44, assessmentId, existing, 'Assessment record not found in database', retryCount);
        }
        return Response.json({ success: false, error: 'Assessment not found' });
      }
      assessment = records[0];
    }

    // Now that we have the assessment, write the pending record (with user_email)
    if (existing) {
      // Update existing record to pending
      pendingRecord = await upsertInsights(base44, assessmentId, existing, {
        ...pendingPayload,
        user_email: assessment.email || existing.user_email,
        client_id:  assessment.client_id || existing.client_id || null,
      });
    } else {
      // Create brand-new pending record — user_email now available
      pendingRecord = await upsertInsights(base44, assessmentId, null, {
        ...pendingPayload,
        user_email: assessment.email,
        client_id:  assessment.client_id || null,
      });
    }

    // Guard: no usable score data
    if (!assessment.overall_pct && !assessment.si_pct) {
      console.warn(`[AssessmentInsights] Assessment ${assessmentId} has no scores — skipping`);
      await upsertInsights(base44, assessmentId, pendingRecord, {
        status: 'pending',
        error_message: 'No score data available yet',
        user_email: assessment.email || null,
        client_id: assessment.client_id || null,
      });
      return Response.json({ success: false, skipped: true, reason: 'no_scores' });
    }

    // ── 3. Fetch user + org context (non-fatal if missing) ────
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
          };
        }
      } catch (err) {
        console.warn('[AssessmentInsights] Could not fetch user context (non-fatal):', err.message);
      }
    }

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
        console.warn('[AssessmentInsights] Could not fetch org context (non-fatal):', err.message);
      }
    }

    // ── 4. Fetch live competency definitions ─────────────────
    let competencyModelBlock = '';
    try {
      const competencies = await base44.asServiceRole.entities.Competency.filter({ is_platform_default: true });
      if (competencies.length > 0) {
        const lines = competencies.map(c => {
          const components = (c.key_components || [])
            .map(kc => `${kc.name} (${kc.weight}%)`)
            .join(', ');
          return `${c.name.toUpperCase()} (${c.field_key || c.category})\nCategory: ${c.category}\nDefinition: ${c.definition || 'N/A'}\nKey Components: ${components || 'N/A'}`;
        });
        competencyModelBlock = lines.join('\n\n');
        console.log(`[AssessmentInsights] Loaded ${competencies.length} competencies from DB`);
      }
    } catch (err) {
      console.warn('[AssessmentInsights] Could not fetch competencies (non-fatal):', err.message);
    }

    // ── 5. Build prompt ───────────────────────────────────────
    const scoreBlock = [
      `Overall Leadership Score: ${assessment.overall_pct ?? 'N/A'}%`,
      `Situational Intelligence (SI): ${assessment.si_pct ?? 'N/A'}%`,
      `Decision Making (DM): ${assessment.dm_pct ?? 'N/A'}%`,
      `Communication (COMM): ${assessment.comm_pct ?? 'N/A'}%`,
      `Resource Management (RM): ${assessment.rm_pct ?? 'N/A'}%`,
      `Stakeholder Management (SM): ${assessment.sm_pct ?? 'N/A'}%`,
      `Performance Management (PM): ${assessment.pm_pct ?? 'N/A'}%`,
      `Proficiency Band: ${assessment.band_overall ?? 'N/A'}`,
      `Archetype (rule-based): ${assessment.archetype_label ?? 'N/A'}`,
    ].join('\n');

    // Only use full_name if it looks like a real name (not an email or email prefix)
    const validName = userContext.full_name && !userContext.full_name.includes('@') && userContext.full_name.trim().length > 0
      ? userContext.full_name
      : null;

    const userBlock = validName
      ? `Leader: ${validName}\nCurrent Role: ${userContext.current_role ?? 'Not specified'}\nDepartment: ${userContext.department ?? 'Not specified'}\nLeadership Level: ${userContext.leadership_level ?? 'Not specified'}\nSector: ${userContext.sector ?? 'Not specified'}`
      : 'User context: not available (refer to the leader generically in your response)';

    const prompt = `You are an expert leadership development coach analyzing a completed Leadership Index assessment. You have deep knowledge of the Curiosity Led Leadership Competency Model and Leadership Archetypes framework.

ORGANIZATION: ${orgName}${orgIndustry ? ` (${orgIndustry})` : ''}

${userBlock}

ASSESSMENT SCORES:
${scoreBlock}

=== COMPETENCY MODEL REFERENCE ===
The assessment measures leadership competencies across Tactical, Self Leadership, People Leadership, and Situational Intelligence categories. Use this live competency framework for depth and accuracy in your analysis:

${competencyModelBlock || 'Competency model data unavailable — use general leadership development principles.'}

=== LEADERSHIP ARCHETYPES ===
Match the leader's pattern to the most fitting archetype. Each archetype has predictable strengths, blind spots, and development paths:

- The Adaptive Strategist: High SI + high DM. Systems thinking, change navigation. Blind spot: analysis paralysis, over-complexity. Dev focus: execution translation.
- The Influential Connector: High COMM + high SM. Relationship capital, stakeholder alignment. Blind spot: consensus-seeking delays. Dev focus: decisive leadership.
- The Resourceful Optimizer: High RM + high PM. Operational excellence, efficiency. Blind spot: efficiency over innovation. Dev focus: people-centered leadership.
- The Performance Catalyst: High PM + high COMM. Talent development, coaching. Blind spot: development over delivery. Dev focus: strategic balance.
- The Steady Operator: High RM + PM with low adaptability. Stability, quality assurance. Blind spot: change resistance. Dev focus: adaptive flexibility.
- The Change Navigator: High SI + high adaptability. Transformation, innovation. Blind spot: change fatigue blindness. Dev focus: change sustainability.
- The Collaborative Problem-Solver: High COMM + SM + balanced profile. Inclusive decision-making. Blind spot: decision speed. Dev focus: decisive leadership.
- The Visionary Architect: High SI + high DM with strategic orientation. Long-term vision, purpose alignment. Blind spot: implementation gaps. Dev focus: execution excellence.

=== INDUSTRY BENCHMARKS (for percentile context) ===
Percentile framework: <25th = Development Need (intensive coaching), 25-49th = Emerging (targeted development), 50-74th = Proficient (meeting expectations), 75-89th = Advanced (stretch assignments), ≥90th = Exceptional (succession candidate).
Healthcare adds +3-5pts to DM and SI benchmarks. Government adds +2-3pts to SM. Corporate highest standards for COMM executive presence.

Based on these results, generate a structured leadership insight report with the following fields:

1. archetype (string): Match to one of the 8 archetypes above. Use the exact label (e.g. "The Adaptive Strategist"). If scores don't clearly fit, use the closest match.

2. top_strengths (array of 3-5 strings): Specific competency-based strengths supported by the scores. Reference actual score areas and sub-components where scores are ≥65%. Include evidence-based context.

3. development_areas (array of 3-5 strings): Competency gaps grounded in lower scores. Reference sub-components. Be specific, constructive, and grounded in the research (e.g. "Coaching delivery — currently below the 69% PM benchmark for this level, affecting subordinate growth").

4. risk_flags (array of 0-3 strings): Only include if genuinely warranted. Use labels like "low_situational_intelligence", "critical_communication_gap", "resource_management_deficit", "stakeholder_alignment_risk". Return empty array if no material risks.

5. summary (string, 3-4 sentences): Professional narrative for an L&D audience. Reference the archetype, key score patterns, and one meaningful benchmark comparison.

6. recommendations (array of 4-6 strings): Specific, actionable development recommendations grounded in the competency model. Each recommendation should reference a specific sub-component or research-backed practice (e.g. "Practice the BLUF communication method to improve message clarity, the highest-weighted sub-component of Communication at 35%").

Be precise. Do not hallucinate strengths or risks not supported by score data. Treat missing or zero scores as insufficient data. Use benchmark comparisons to add context where helpful.`;

    // ── 6. Call OpenAI ────────────────────────────────────────
    console.log(`[AssessmentInsights] Calling LLM for assessment ${assessmentId} (attempt ${retryCount + 1})`);

    let aiResult;
    try {
      aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            archetype:         { type: 'string' },
            top_strengths:     { type: 'array', items: { type: 'string' } },
            development_areas: { type: 'array', items: { type: 'string' } },
            risk_flags:        { type: 'array', items: { type: 'string' } },
            summary:           { type: 'string' },
            recommendations:   { type: 'array', items: { type: 'string' } }
          },
          required: ['archetype', 'top_strengths', 'development_areas', 'risk_flags', 'summary', 'recommendations']
        }
      });
    } catch (llmError) {
      // LLM failed — write detailed failure record, return 200 so assessment is NOT broken
      const errMsg = llmError?.message || 'Unknown LLM error';
      console.error(`[AssessmentInsights] LLM FAILED for assessment ${assessmentId} (attempt ${retryCount + 1}): ${errMsg}`);
      await failInsight(base44, assessmentId, pendingRecord, errMsg, retryCount, {
        user_email: assessment.email || null,
        client_id: assessment.client_id || null,
      });
      // Return 200 — assessment completion must not be blocked
      return Response.json({
        success: false,
        assessment_id: assessmentId,
        error: 'LLM call failed',
        detail: errMsg,
        retry_count: retryCount + 1,
        retryable: true
      });
    }

    // ── 7. Validate AI output ─────────────────────────────────
    if (!aiResult?.archetype || !aiResult?.summary) {
      const errMsg = 'LLM returned incomplete output (missing archetype or summary)';
      console.error(`[AssessmentInsights] ${errMsg} for assessment ${assessmentId}`, JSON.stringify(aiResult));
      await failInsight(base44, assessmentId, pendingRecord, errMsg, retryCount, {
        user_email: assessment.email || null,
        client_id: assessment.client_id || null,
      });
      return Response.json({ success: false, assessment_id: assessmentId, error: errMsg, retryable: true });
    }

    // ── 8. Write final generated record ──────────────────────
    const saved = await upsertInsights(base44, assessmentId, pendingRecord, {
      status: 'generated',
      archetype:         aiResult.archetype,
      top_strengths:     aiResult.top_strengths     || [],
      development_areas: aiResult.development_areas || [],
      risk_flags:        aiResult.risk_flags         || [],
      summary:           aiResult.summary,
      recommendations:   aiResult.recommendations   || [],
      error_message:     null,
      retry_count:       retryCount,
      last_attempted_at: new Date().toISOString(),
      user_email:        assessment.email       || pendingRecord?.user_email || null,
      client_id:         assessment.client_id   || pendingRecord?.client_id  || null,
    });

    console.log(`[AssessmentInsights] ✅ SUCCESS — saved record ${saved.id} for assessment ${assessmentId} (archetype: ${aiResult.archetype})`);

    return Response.json({
      success: true,
      assessment_id: assessmentId,
      insights_id: saved.id,
      archetype: aiResult.archetype,
      retry_count: retryCount,
    });

  } catch (outerError) {
    // Catch-all: unexpected crash in orchestration logic (not from LLM)
    const errMsg = outerError?.message || 'Unexpected error';
    console.error(`[AssessmentInsights] UNEXPECTED ERROR for assessment ${assessmentId || 'unknown'}: ${errMsg}`, outerError?.stack);

    // Attempt to record the failure — wrapped so it never throws
    if (assessmentId) {
      try {
        const existing = await base44.asServiceRole.entities.AssessmentInsights.filter({ assessment_id: assessmentId });
        await failInsight(base44, assessmentId, existing[0] || null, `Unexpected error: ${errMsg}`, 0);
      } catch (writeErr) {
        console.error('[AssessmentInsights] Could not write failure record:', writeErr.message);
      }
    }

    // Always return 200 — never block the automation platform
    return Response.json({ success: false, error: errMsg, retryable: true });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Upsert an AssessmentInsights record by assessment_id.
 * existingRecord: the existing DB record object (or null).
 * fields: fields to merge in.
 */
async function upsertInsights(base44, assessmentId, existingRecord, fields) {
  const payload = {
    assessment_id: assessmentId,
    ...fields,
  };

  if (existingRecord?.id) {
    console.log(`[AssessmentInsights] Updating record ${existingRecord.id} → status: ${fields.status}`);
    return await base44.asServiceRole.entities.AssessmentInsights.update(existingRecord.id, payload);
  } else {
    console.log(`[AssessmentInsights] Creating new AssessmentInsights record → status: ${fields.status}`);
    return await base44.asServiceRole.entities.AssessmentInsights.create(payload);
  }
}

/**
 * Write a failed status record with full diagnostic context.
 * Never throws — safe to call from any error path.
 */
async function failInsight(base44, assessmentId, existingRecord, errorMessage, retryCount = 0, extraFields = {}) {
  try {
    await upsertInsights(base44, assessmentId, existingRecord, {
      status: 'failed',
      error_message: String(errorMessage).slice(0, 1000), // cap length
      retry_count: retryCount,
      last_attempted_at: new Date().toISOString(),
      ...extraFields,
    });
    console.log(`[AssessmentInsights] Failure record written for assessment ${assessmentId} (retry_count: ${retryCount})`);
  } catch (writeErr) {
    // Last-resort: if we can't even write the failure record, just log it
    console.error(`[AssessmentInsights] CRITICAL — could not write failure record for ${assessmentId}: ${writeErr.message}`);
  }
}