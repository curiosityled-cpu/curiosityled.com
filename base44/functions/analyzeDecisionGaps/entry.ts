/**
 * analyzeDecisionGaps — Maps DQ audit gaps to real Competency entity records.
 * Called after audit completion to identify development opportunities.
 * Writes linked_competencies with real DB IDs back to DecisionJournal.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// DQ gap → preferred competency names (matched against actual Competency entity 'name' field)
// Ordered by priority — first match wins for a given gap
const COMPETENCY_PRIORITY_MAP = {
  frame:        ['Situational Intelligence', 'Decision Making'],
  alternatives: ['Decision Making', 'Strategic Thinking', 'Situational Intelligence'],
  information:  ['Situational Intelligence', 'Evidence-Based Management', 'Critical Thinking'],
  tradeoffs:    ['Decision Making', 'Judgment', 'Resource Management'],
  reasoning:    ['Decision Making', 'Problem Solving', 'Situational Intelligence'],
  commitment:   ['Performance Management', 'Stakeholder Management', 'Accountability'],
};

function identifyGaps(auditData) {
  const gaps = [];
  if (!auditData.decision_text || auditData.decision_text.length < 10) gaps.push('frame');
  if (!auditData.structured_alternatives || auditData.structured_alternatives.length < 2) gaps.push('alternatives');
  if ((!auditData.knowns || auditData.knowns.length === 0) &&
      (!auditData.critical_assumptions || auditData.critical_assumptions.length === 0)) gaps.push('information');
  if (!auditData.primary_value || !auditData.tradeoffs_accepted || auditData.tradeoffs_accepted.length === 0) gaps.push('tradeoffs');
  if (!auditData.decision_made || !auditData.failure_mode) gaps.push('reasoning');
  if (!auditData.next_step || !auditData.review_trigger) gaps.push('commitment');
  return gaps;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { decision_id } = body;
    if (!decision_id) return Response.json({ error: 'decision_id required' }, { status: 400 });

    const decision = await base44.entities.DecisionJournal.get(decision_id);
    if (!decision || decision.user_email !== user.email) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    // Load real competency records from DB (publicly readable per entity RLS)
    const allCompetencies = await base44.asServiceRole.entities.Competency.list();

    // Build lookup: lowercase name → competency record
    const compByName = {};
    for (const c of allCompetencies) {
      if (c.name) compByName[c.name.toLowerCase().trim()] = c;
    }

    // Identify gaps and map to real competency records
    const gaps = identifyGaps(decision);
    const seen = new Set();
    const linkedCompetencies = [];

    for (const gap of gaps) {
      const candidates = COMPETENCY_PRIORITY_MAP[gap] || [];
      let matched = false;

      for (const candidateName of candidates) {
        const compRecord = compByName[candidateName.toLowerCase().trim()];
        const dedupeKey = `${gap}:${compRecord?.id || candidateName}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        matched = true;

        linkedCompetencies.push({
          competency_id: compRecord?.id || candidateName.toLowerCase().replace(/\s+/g, '_'),
          competency_name: compRecord?.name || candidateName,
          dq_gap: gap,
          // flag whether we resolved to a real entity
          resolved: !!compRecord?.id,
        });
        break; // one competency per gap (primary match only)
      }

      // Fallback if no name matched any DB record — use first candidate as display name
      if (!matched && candidates.length > 0) {
        const fallbackName = candidates[0];
        const dedupeKey = `${gap}:${fallbackName}`;
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          linkedCompetencies.push({
            competency_id: fallbackName.toLowerCase().replace(/\s+/g, '_'),
            competency_name: fallbackName,
            dq_gap: gap,
            resolved: false,
          });
        }
      }
    }

    // Persist back to DecisionJournal
    await base44.entities.DecisionJournal.update(decision_id, {
      linked_competencies: linkedCompetencies,
    });

    return Response.json({ gaps, competencies: linkedCompetencies });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});