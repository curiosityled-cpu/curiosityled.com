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
import { CHECK_IN_PRESETS, getPreset } from '../../shared/checkInPresets.ts';

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

      // Resolve the client's active check-in preset (org-level config on Client.settings)
      let presetId = 'balance';
      try {
        if (user.client_id) {
          const client = await base44.asServiceRole.entities.Client.get(user.client_id).catch(() => null);
          if (client?.settings?.check_in_config?.preset_id) {
            presetId = client.settings.check_in_config.preset_id;
          }
        }
      } catch { /* fall back to balance */ }
      const preset = getPreset(presetId);
      const measures = preset.measures;

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

      const measureList = measures.map(m => `${m.key} (${m.label} — ${m.desc})`).join(', ');
      const jsonKeys = measures.map(m => `"${m.key}"`).join(', ');

      const prompt = check_in_type === 'morning'
        ? `Generate 5 short check-in statements for a manager starting their day — one for each measure: ${measureList}.
           Each statement MUST be a first-person, present-tense sentence that can be rated on a 1-5 scale (1=Low, 5=Strong).
           Examples of the correct format: "I feel steady and rested this morning." / "I can see my top priorities clearly."
           Do NOT ask open-ended questions. Do NOT use question marks. Each statement should be rateable — the user will score 1-5 on how true it feels right now.
           ${contextSummary ? `Context about this manager: ${contextSummary}` : ''}
           Vary the phrasing naturally day to day. Avoid corporate jargon. Keep each statement under 12 words.
           Return JSON: { ${jsonKeys}: "..." }`
        : `Generate 5 short end-of-day reflection statements for a manager closing their day — one for each measure: ${measureList}.
           Each statement MUST be a first-person, present-tense sentence reflecting on today, rateable on a 1-5 scale (1=Low, 5=Strong).
           Examples: "I finished the day with energy to spare." / "I made clear decisions under pressure today."
           Do NOT ask open-ended questions. Do NOT use question marks. Each statement should be rateable.
           ${contextSummary ? `Context about this manager: ${contextSummary}` : ''}
           Vary the phrasing naturally. Keep each statement under 12 words.
           Return JSON: { ${jsonKeys}: "..." }`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: Object.fromEntries(measures.map(m => [m.key, { type: 'string' }])),
        },
      });

      // ── Likert guardrail: validate each question reads as a rateable statement ──
      // If any question starts with a question word or contains a question mark,
      // run a rewrite pass to convert them all to first-person Likert statements.
      const questionWords = /^(how|what|why|did|do|are|is|can|could|would|will|have|has|should)\b/i;
      let questions = result || {};
      let needsRewrite = false;
      for (const m of measures) {
        const q = (questions[m.key] || '').trim();
        if (!q || questionWords.test(q) || q.includes('?')) {
          needsRewrite = true;
          break;
        }
      }

      if (needsRewrite) {
        try {
          const rewritePrompt = `Rewrite each of these check-in prompts as a first-person, present-tense statement that can be rated 1-5 (1=Low, 5=Strong). Do NOT use question marks or question words (How, What, Why, etc.). Keep each under 12 words.\nReturn JSON with the same keys.\n${JSON.stringify(questions)}`;
          const rewritten = await base44.integrations.Core.InvokeLLM({
            prompt: rewritePrompt,
            response_json_schema: {
              type: 'object',
              properties: Object.fromEntries(measures.map(m => [m.key, { type: 'string' }])),
            },
          });
          if (rewritten) questions = rewritten;
        } catch { /* keep original if rewrite fails */ }
      }

      return Response.json({ questions, preset_id: presetId, measures });
    }

    // ── SAVE ─────────────────────────────────────────────────────────────────
    if (action === 'save') {
      // If frontend passes back the record ID, use it directly — skip DB lookup entirely
      // to avoid read-after-write lag and RLS inconsistencies between requests
      const existingId = body.existing_record_id || fields.existing_record_id || null;
      let existing = null;
      if (existingId) {
        // Verify ownership — never trust a client-supplied record ID without
        // confirming the record belongs to the authenticated caller.
        const records = await base44.asServiceRole.entities.DailyCheckIn.filter({ id: existingId }, null, 1).catch(() => []);
        if (records.length === 0 || records[0].user_email !== user.email) {
          return Response.json({ error: 'Record not found or not owned by caller' }, { status: 403 });
        }
        existing = records[0];
      } else {
        const todayRecords = await getTodayRecords();
        const completionScore = r => (r.morning_completed ? 1 : 0) + (r.evening_completed ? 1 : 0) + (r.midday_loop_completed ? 1 : 0);
        existing = todayRecords.sort((a, b) => completionScore(b) - completionScore(a))[0] || null;
      }

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
        // Merge fields from any secondary records (handles duplicate records
        // created when Big3QuickSet and MorningCheckIn race to create separate records)
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
          }
          // Merge big3_priorities from ANY secondary record that has them,
          // not just those with evening_completed (Big3QuickSet creates records
          // with big3_priorities but no evening_completed flag)
          if (r.big3_priorities?.length && !todayRec.big3_priorities?.length) {
            todayRec.big3_priorities = r.big3_priorities;
          }
          // Also merge midday status updates on big3 items from secondary records
          if (r.midday_loop_completed && !todayRec.midday_loop_completed) {
            todayRec.midday_loop_completed = true;
            todayRec.midday_loop_completed_at = r.midday_loop_completed_at;
            // If the secondary record has updated midday statuses on big3 items, use those
            if (r.big3_priorities?.length && todayRec.big3_priorities?.length) {
              todayRec.big3_priorities = todayRec.big3_priorities.map((p, idx) => {
                const sec = r.big3_priorities[idx];
                return sec?.midday_status ? { ...p, midday_status: sec.midday_status, midday_note: sec.midday_note } : p;
              });
            }
          }
        }
      }

      // Only return Big 3 from the immediately preceding day (yesterday).
      // This ensures priorities reset daily — older days' Big 3 don't carry over.
      const yesterdayDate = new Date(today + 'T00:00:00');
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);
      const prevWithBig3 = allRecords.find(r => r.check_in_date === yesterdayStr && r.big3_priorities?.length > 0);
      const yesterday_big3 = prevWithBig3?.big3_priorities || [];

      return Response.json({ record: todayRec, yesterday_big3, today });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('[saveDailyCheckIn] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});