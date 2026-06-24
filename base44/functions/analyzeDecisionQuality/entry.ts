/**
 * analyzeDecisionQuality
 *
 * Analyzes a manager's Decision Journal history to produce:
 * 1. confidence_calibration — correlation between confidence and outcomes
 * 2. pattern_flags — recurring biases detected (e.g. overconfidence when outcome=changed_course)
 * 3. premortem_question — a personalized, pattern-aware challenge question for the current decision
 * 4. debrief_prompt — for after a disappointing outcome (partly / changed_course)
 *
 * Payload:
 *   mode: "premortem" | "debrief" | "calibration"
 *   decision_text?: string   (for premortem — the decision being drafted)
 *   decision_id?: string     (for debrief — the decision that just got an outcome)
 *   outcome?: string         (for debrief)
 *   outcome_notes?: string
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { mode = 'calibration', decision_text = '', decision_id = null, outcome = null, outcome_notes = '' } = body;

    // Load last 30 decisions + manager memory in parallel
    const [decisions, memoryRecords] = await Promise.all([
      base44.entities.DecisionJournal.filter({ user_email: user.email }, '-created_date', 30).catch(() => []),
      base44.entities.ManagerMemory.filter({ user_email: user.email }, '-last_synthesized_at', 1).catch(() => []),
    ]);

    const memory = memoryRecords[0] || null;
    const completedDecisions = decisions.filter(d => d.outcome);
    const firstName = user.full_name ? user.full_name.split(' ')[0] : 'you';

    // ── Confidence Calibration ────────────────────────────────────────────────
    const calibrationMap = { high: { total: 0, good: 0 }, medium: { total: 0, good: 0 }, low: { total: 0, good: 0 } };
    for (const d of completedDecisions) {
      const conf = d.confidence || 'medium';
      if (!calibrationMap[conf]) continue;
      calibrationMap[conf].total++;
      if (d.outcome === 'did_it' || d.outcome === 'partly') calibrationMap[conf].good++;
    }

    const calibration = {};
    for (const [level, { total, good }] of Object.entries(calibrationMap)) {
      calibration[level] = total > 0 ? { total, success_rate: Math.round((good / total) * 100) } : null;
    }

    // Detect overconfidence pattern: high confidence but mostly changed_course
    const highConf = completedDecisions.filter(d => d.confidence === 'high');
    const highConfBad = highConf.filter(d => d.outcome === 'changed_course' || d.outcome === 'not_yet');
    const overconfidenceDetected = highConf.length >= 2 && (highConfBad.length / highConf.length) >= 0.5;

    // Detect underconfidence pattern: low confidence but mostly did_it
    const lowConf = completedDecisions.filter(d => d.confidence === 'low');
    const lowConfGood = lowConf.filter(d => d.outcome === 'did_it');
    const underconfidenceDetected = lowConf.length >= 2 && (lowConfGood.length / lowConf.length) >= 0.6;

    const pattern_flags = [];
    if (overconfidenceDetected) pattern_flags.push('overconfidence_bias');
    if (underconfidenceDetected) pattern_flags.push('underconfidence_bias');

    // ── Mode: Pre-Mortem ─────────────────────────────────────────────────────
    if (mode === 'premortem') {
      const recentContext = completedDecisions.slice(0, 5).map(d =>
        `- Decision: "${(d.decision_text || '').slice(0, 120)}" | Confidence: ${d.confidence} | Outcome: ${d.outcome}`
      ).join('\n');

      const memoryContext = memory ? [
        memory.recurring_triggers?.length ? `Recurring triggers: ${memory.recurring_triggers.slice(0, 3).join(', ')}` : null,
        memory.stuck_points?.length ? `Where they get stuck: ${memory.stuck_points.slice(0, 2).join(', ')}` : null,
      ].filter(Boolean).join('\n') : '';

      const overconfidenceNote = overconfidenceDetected
        ? `IMPORTANT: This manager has a pattern of high-confidence decisions that frequently end in "Changed course". Ask a calibration question that gently surfaces this.`
        : '';

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are Atreus, a trusted leadership coach. A manager is about to commit to a high-stakes decision.

DECISION THEY ARE DRAFTING: "${decision_text}"

THEIR RECENT DECISION HISTORY:
${recentContext || 'No prior decisions logged.'}

BEHAVIORAL MEMORY:
${memoryContext || 'No behavioral memory available.'}

${overconfidenceNote}

Generate ONE sharp, personalized pre-mortem question (2-3 sentences max). The question should:
- Be grounded in their specific history, not generic
- Ask them to imagine the decision failing 3-6 months from now and identify the most likely reason
- Reference a pattern from their history if one is visible
- Be conversational, not clinical

Return JSON: { "question": string, "rationale": string (1 sentence, internal note on why this question, not shown to user) }`,
        response_json_schema: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            rationale: { type: 'string' }
          },
          required: ['question']
        }
      }).catch(() => null);

      return Response.json({
        mode: 'premortem',
        premortem_question: result?.question || `If this decision doesn't work out, ${firstName}, what's the most likely reason you'll look back on?`,
        calibration,
        pattern_flags,
        overconfidence_detected: overconfidenceDetected,
      });
    }

    // ── Mode: Debrief ────────────────────────────────────────────────────────
    if (mode === 'debrief') {
      const decision = decisions.find(d => d.id === decision_id) || null;
      const originalAssumptions = decision?.assumptions || '';
      const originalRisks = decision?.risks || '';
      const decisionText = decision?.decision_text || decision_text;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are Atreus, a trusted leadership coach. A manager just logged an outcome on a decision.

DECISION: "${decisionText}"
ORIGINAL ASSUMPTIONS: "${originalAssumptions}"
ORIGINAL RISKS: "${originalRisks}"
OUTCOME: ${outcome}
MANAGER'S NOTES: "${outcome_notes}"

${overconfidenceDetected ? `PATTERN CONTEXT: This manager has a recurring overconfidence pattern — they often rate high confidence before changing course.` : ''}

Write a short debrief message (3-5 sentences) that:
1. Acknowledges the outcome without judgment
2. Highlights the most interesting delta between their original assumptions and what actually happened
3. Asks ONE specific, forward-looking question to help them learn from this

Keep it warm, grounded, and specific to their situation. Use "you" not "the manager."

Return JSON: { "debrief_message": string, "opening_prompt": string (a short sentence to start the Atreus conversation, ≤15 words) }`,
        response_json_schema: {
          type: 'object',
          properties: {
            debrief_message: { type: 'string' },
            opening_prompt: { type: 'string' }
          },
          required: ['debrief_message', 'opening_prompt']
        }
      }).catch(() => null);

      return Response.json({
        mode: 'debrief',
        debrief_message: result?.debrief_message || null,
        opening_prompt: result?.opening_prompt || `Let's debrief this decision together — what did you learn?`,
        calibration,
        pattern_flags,
      });
    }

    // ── Mode: Calibration summary ─────────────────────────────────────────────
    return Response.json({
      mode: 'calibration',
      calibration,
      pattern_flags,
      overconfidence_detected: overconfidenceDetected,
      underconfidence_detected: underconfidenceDetected,
      total_decisions: decisions.length,
      completed_decisions: completedDecisions.length,
    });

  } catch (error) {
    console.error('analyzeDecisionQuality error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});