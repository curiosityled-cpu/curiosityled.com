/**
 * analyzeDecisionGaps — Maps DQ audit gaps to leadership competencies
 * Called after audit completion to identify development opportunities
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const COMPETENCY_MAP = {
  frame: ['Situational Intelligence', 'Judgment'],
  alternatives: ['Decision Making', 'Strategic Thinking'],
  information: ['Evidence-Based Management', 'Critical Thinking'],
  tradeoffs: ['Judgment', 'Resource Management'],
  reasoning: ['Problem Solving', 'Emotional Intelligence'],
  commitment: ['Accountability', 'Execution Discipline'],
};

function identifyGaps(auditData) {
  const gaps = [];

  // Frame: check if decision_text and decision_scope are clear
  if (!auditData.decision_text || auditData.decision_text.length < 10) {
    gaps.push('frame');
  }

  // Alternatives: check if at least 2 distinct alternatives documented
  if (!auditData.structured_alternatives || auditData.structured_alternatives.length < 2) {
    gaps.push('alternatives');
  }

  // Information: check if knowns/assumptions documented
  if ((!auditData.knowns || auditData.knowns.length === 0) && 
      (!auditData.critical_assumptions || auditData.critical_assumptions.length === 0)) {
    gaps.push('information');
  }

  // Trade-offs: check if primary_value and tradeoffs_accepted are explicit
  if (!auditData.primary_value || !auditData.tradeoffs_accepted || auditData.tradeoffs_accepted.length === 0) {
    gaps.push('tradeoffs');
  }

  // Reasoning: check if decision_made and failure_mode are present
  if (!auditData.decision_made || !auditData.failure_mode) {
    gaps.push('reasoning');
  }

  // Commitment: check if next_step and review_trigger are present
  if (!auditData.next_step || !auditData.review_trigger) {
    gaps.push('commitment');
  }

  return gaps;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { decision_id } = body;

    if (!decision_id) {
      return Response.json({ error: 'decision_id required' }, { status: 400 });
    }

    const decision = await base44.entities.DecisionJournal.get(decision_id);
    if (!decision || decision.user_email !== user.email) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    // Identify gaps
    const gaps = identifyGaps(decision);
    const linkedCompetencies = gaps.flatMap(gap => 
      COMPETENCY_MAP[gap].map(comp => ({
        competency_id: comp.toLowerCase().replace(/\s+/g, '_'),
        competency_name: comp,
        dq_gap: gap,
      }))
    );

    // Update decision with linked competencies
    await base44.entities.DecisionJournal.update(decision_id, {
      linked_competencies: linkedCompetencies,
    });

    return Response.json({ gaps, competencies: linkedCompetencies });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});