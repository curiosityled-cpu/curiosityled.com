/**
 * saveDailyCheckIn — Save or update today's DailyCheckIn record.
 * Also generates contextual AI questions for morning/evening prompts.
 *
 * POST body: { check_in_type, action, ...fields }
 *   action = "get_questions" | "save"
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, check_in_type, ...fields } = body;

    const today = new Date().toISOString().split('T')[0];

    // ── GET QUESTIONS ────────────────────────────────────────────────────────
    if (action === 'get_questions') {
      // Fetch recent check-ins and trends for context
      const [recentCheckIns, trends, memory] = await Promise.all([
        base44.entities.DailyCheckIn.filter({ user_email: user.email }, '-created_date', 7).catch(() => []),
        base44.entities.ManagerTrends.filter({ user_email: user.email }, '-last_trend_computed_at', 1).catch(() => []),
        base44.entities.ManagerMemory.filter({ user_email: user.email }, null, 1).catch(() => []),
      ]);

      const trendData = trends[0] || {};
      const memoryData = memory[0] || {};
      const lastCheckIn = recentCheckIns[0];

      const contextSummary = [
        trendData.overload_pattern_strength > 60 ? 'User has a recurring overload pattern.' : null,
        trendData.confidence_trend === 'declining' ? 'Confidence has been declining recently.' : null,
        trendData.energy_trend === 'improving' ? 'Energy trend is improving.' : null,
        memoryData.stuck_points?.length ? `Known stuck points: ${memoryData.stuck_points.slice(0, 2).join(', ')}.` : null,
        lastCheckIn?.energy_score <= 2 ? 'Yesterday\'s energy was low.' : null,
        lastCheckIn?.load_score >= 4 ? 'Yesterday\'s load was high.' : null,
      ].filter(Boolean).join(' ');

      const prompt = check_in_type === 'morning'
        ? `Generate 5 short, conversational check-in questions for a manager starting their day. 
           One question each for: Energy/Steadiness, Confidence/Clarity, Focus/Momentum, Load/Pressure, Growth Follow-through.
           ${contextSummary ? `Context about this manager: ${contextSummary}` : ''}
           Make questions feel natural and varied — not the same phrasing every day. Avoid corporate jargon.
           Return JSON: { energy: "...", confidence: "...", focus: "...", load: "...", growth: "..." }`
        : `Generate 5 short, conversational end-of-day reflection questions for a manager closing their day.
           One question each for: Energy/Steadiness (how you finish), Confidence/Clarity (decisions made today), Focus/Momentum (on priorities), Load/Pressure (what drained you), Growth Follow-through (did you honour your intentions).
           ${contextSummary ? `Context about this manager: ${contextSummary}` : ''}
           Make questions feel like a thoughtful debrief, not a form. Varied phrasing each day.
           Return JSON: { energy: "...", confidence: "...", focus: "...", load: "...", growth: "..." }`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            energy: { type: 'string' },
            confidence: { type: 'string' },
            focus: { type: 'string' },
            load: { type: 'string' },
            growth: { type: 'string' },
          },
        },
      });

      return Response.json({ questions: result });
    }

    // ── SAVE ─────────────────────────────────────────────────────────────────
    if (action === 'save') {
       // Query today's record directly by date
       const todayRecords = await base44.entities.DailyCheckIn.filter({
         user_email: user.email,
         check_in_date: today,
       }, '-created_date', 1).catch(() => []);

       const existing = todayRecords[0] || null;

      const now = new Date().toISOString();

      // Only copy through known entity fields — never pass action/check_in_type directly
      const ALLOWED_FIELDS = [
        'energy_score', 'energy_note', 'confidence_score', 'confidence_note',
        'focus_score', 'focus_note', 'load_score', 'load_note',
        'growth_score', 'growth_note', 'questions_used', 'big3_priorities',
        'atreus_observation', 'atreus_flags',
      ];
      const updateData = {};
      for (const key of ALLOWED_FIELDS) {
        if (fields[key] !== undefined) updateData[key] = fields[key];
      }

      if (check_in_type === 'morning') {
        updateData.morning_completed = true;
        updateData.morning_completed_at = now;
      } else if (check_in_type === 'evening') {
        updateData.evening_completed = true;
        updateData.evening_completed_at = now;
      } else if (check_in_type === 'midday') {
        updateData.midday_loop_completed = true;
        updateData.midday_loop_completed_at = now;
      }

      let record;
      if (existing) {
        // Only send fields that were explicitly provided — don't overwrite unrelated fields
        // Merge: keep existing morning/evening data when updating the other side
        const safeUpdate = { ...updateData };
        if (check_in_type === 'evening' && existing.morning_completed) {
          // Preserve morning scores if they were already set and not being overridden
          // (evening call only provides evening scores so morning_score keys won't be in updateData)
        }
        record = await base44.entities.DailyCheckIn.update(existing.id, safeUpdate);
      } else {
        record = await base44.entities.DailyCheckIn.create({
          user_email: user.email,
          check_in_date: today,
          check_in_type: check_in_type || 'morning',
          ...updateData,
        });
      }

      return Response.json({ record });
    }

    // ── GET TODAY ────────────────────────────────────────────────────────────
    if (action === 'get_today') {
      const existing = await base44.entities.DailyCheckIn.filter({
        user_email: user.email,
        check_in_date: today,
      }, null, 1).catch(() => []);
      return Response.json({ record: existing[0] || null });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});