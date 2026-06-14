/**
 * saveDailyCheckIn — Save or update today's DailyCheckIn record.
 * Also generates contextual AI questions for morning/evening prompts.
 *
 * POST body: { check_in_type, action, client_date (YYYY-MM-DD, from frontend), ...fields }
 *   action = "get_questions" | "save" | "get_today"
 *
 * IMPORTANT: We rely on client_date sent from the browser (computed in the user's local timezone)
 * rather than server-side timezone computation, which is unreliable across Deno container instances.
 *
 * KEY DESIGN: Uses asServiceRole for reads (bypasses RLS filter inconsistencies) but always
 * validates user ownership. Writes use user-scoped client.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, check_in_type, client_date, ...fields } = body;

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const today = (client_date && dateRegex.test(client_date))
      ? client_date
      : new Date().toISOString().slice(0, 10);

    console.log('[saveDailyCheckIn v2] action:', action, 'today:', today, 'user:', user.email);

    // Helper: fetch today's records for this user using service role to bypass RLS quirks
    const getTodayRecords = async () => {
      const all = await base44.asServiceRole.entities.DailyCheckIn.filter(
        { user_email: user.email },
        '-created_date',
        60
      ).catch(() => []);
      return all.filter(r => r.check_in_date === today);
    };

    // ── GET QUESTIONS ────────────────────────────────────────────────────────
    if (action === 'get_questions') {
      const [recentCheckIns, trends, memory] = await Promise.all([
        base44.asServiceRole.entities.DailyCheckIn.filter({ user_email: user.email }, '-created_date', 7).catch(() => []),
        base44.asServiceRole.entities.ManagerTrends.filter({ user_email: user.email }, '-last_trend_computed_at', 1).catch(() => []),
        base44.asServiceRole.entities.ManagerMemory.filter({ user_email: user.email }, null, 1).catch(() => []),
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
      // If frontend passes back the record ID from a prior save, use it directly
      // to avoid read-after-write consistency lag when morning + evening are saved close together
      let todayRecords = [];
      const existingId = body.existing_record_id || fields.existing_record_id || null;
      if (existingId) {
        try {
          const rec = await base44.asServiceRole.entities.DailyCheckIn.get(existingId);
          if (rec && rec.user_email === user.email && rec.check_in_date === today) {
            todayRecords = [rec];
            console.log('[saveDailyCheckIn] found record via existing_record_id:', existingId);
          }
        } catch { /* fall through to filter */ }
      }
      if (todayRecords.length === 0) {
        todayRecords = await getTodayRecords();
      }
      console.log('[saveDailyCheckIn] save - todayRecords found:', todayRecords.length);

      // Pick the most complete existing record for today
      const completionScore = r => (r.morning_completed ? 1 : 0) + (r.evening_completed ? 1 : 0) + (r.midday_loop_completed ? 1 : 0);
      const existing = todayRecords.sort((a, b) => completionScore(b) - completionScore(a))[0] || null;

      const now = new Date().toISOString();

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
        console.log('[saveDailyCheckIn] updating existing record:', existing.id);
        await base44.entities.DailyCheckIn.update(existing.id, updateData);
        record = { ...existing, ...updateData };
      } else {
        console.log('[saveDailyCheckIn] creating new record for date:', today);
        record = await base44.entities.DailyCheckIn.create({
          user_email: user.email,
          check_in_date: today,
          check_in_type: check_in_type || 'morning',
          ...updateData,
        });
      }

      return Response.json({ record, success: true, timestamp: new Date().toISOString() });
    }

    // ── GET TODAY ────────────────────────────────────────────────────────────
    if (action === 'get_today') {
      const allRecords = await base44.asServiceRole.entities.DailyCheckIn.filter(
        { user_email: user.email },
        '-created_date',
        60
      ).catch(() => []);

      const todayRecords = allRecords.filter(r => r.check_in_date === today);
      let todayRec = null;

      if (todayRecords.length > 0) {
        const sorted = todayRecords.sort((a, b) => {
          const score = r => (r.morning_completed ? 1 : 0) + (r.evening_completed ? 1 : 0) + (r.midday_loop_completed ? 1 : 0);
          return score(b) - score(a);
        });
        todayRec = { ...sorted[0] };
        // Merge fields from any secondary records
        for (let i = 1; i < sorted.length; i++) {
          const r = sorted[i];
          if (r.morning_completed && !todayRec.morning_completed) {
            todayRec.morning_completed = true;
            todayRec.morning_completed_at = r.morning_completed_at;
            todayRec.energy_score = todayRec.energy_score || r.energy_score;
            todayRec.confidence_score = todayRec.confidence_score || r.confidence_score;
            todayRec.focus_score = todayRec.focus_score || r.focus_score;
            todayRec.load_score = todayRec.load_score || r.load_score;
            todayRec.growth_score = todayRec.growth_score || r.growth_score;
          }
          if (r.evening_completed && !todayRec.evening_completed) {
            todayRec.evening_completed = true;
            todayRec.evening_completed_at = r.evening_completed_at;
            todayRec.big3_priorities = todayRec.big3_priorities?.length ? todayRec.big3_priorities : r.big3_priorities;
          }
          if (r.midday_loop_completed && !todayRec.midday_loop_completed) {
            todayRec.midday_loop_completed = true;
            todayRec.midday_loop_completed_at = r.midday_loop_completed_at;
          }
        }
      }

      // Most recent prior-day record with Big 3 set
      const prevWithBig3 = allRecords.find(r => r.check_in_date !== today && r.big3_priorities?.length > 0);
      const yesterday_big3 = prevWithBig3?.big3_priorities || [];

      return Response.json({ record: todayRec, yesterday_big3, today });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('[saveDailyCheckIn] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});