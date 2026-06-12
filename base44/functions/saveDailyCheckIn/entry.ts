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

    // Get today's date in Eastern time (YYYY-MM-DD)
    // Use Intl.DateTimeFormat for reliable cross-platform timezone handling
    const nowET = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
    const today = nowET; // YYYY-MM-DD
    console.log('[saveDailyCheckIn] Today (ET):', today, 'UTC now:', new Date().toISOString(), 'User:', user.email);

    // ── GET QUESTIONS ────────────────────────────────────────────────────────
    if (action === 'get_questions') {
      // Fetch recent check-ins and trends for context with retries
      const [recentCheckIns, trends, memory] = await Promise.all([
        (async () => {
          let retries = 3;
          while (retries > 0) {
            try {
              return await base44.entities.DailyCheckIn.filter({ user_email: user.email }, '-created_date', 7);
            } catch (e) {
              retries--;
              if (retries === 0) return [];
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
        })(),
        (async () => {
          let retries = 3;
          while (retries > 0) {
            try {
              return await base44.entities.ManagerTrends.filter({ user_email: user.email }, '-last_trend_computed_at', 1);
            } catch (e) {
              retries--;
              if (retries === 0) return [];
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
        })(),
        (async () => {
          let retries = 3;
          while (retries > 0) {
            try {
              return await base44.entities.ManagerMemory.filter({ user_email: user.email }, null, 1);
            } catch (e) {
              retries--;
              if (retries === 0) return [];
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
        })(),
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
        // Fetch enough records to always find today's — 30 covers any reasonable case
        let records = [];
        let retries = 3;
        while (retries > 0) {
          try {
            const allRecords = await base44.entities.DailyCheckIn.filter({ user_email: user.email }, '-created_date', 30);
            records = allRecords.filter(r => r.check_in_date === today);
            break;
          } catch (e) {
            retries--;
            if (retries === 0) throw e;
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }

        // Use the first today record regardless of check_in_type — we merge all check-in data
        // into a single record per day. If multiple exist (shouldn't happen), prefer one that
        // already has the most data.
        const existing = records.sort((a, b) => {
          const aScore = (a.morning_completed ? 1 : 0) + (a.evening_completed ? 1 : 0) + (a.midday_loop_completed ? 1 : 0);
          const bScore = (b.morning_completed ? 1 : 0) + (b.evening_completed ? 1 : 0) + (b.midday_loop_completed ? 1 : 0);
          return bScore - aScore;
        })[0] || null;

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
        // Update existing record
        const safeUpdate = { ...updateData };
        await base44.entities.DailyCheckIn.update(existing.id, safeUpdate);
        record = { ...existing, ...safeUpdate };
      } else {
        // Create new record
        const newRecord = await base44.entities.DailyCheckIn.create({
          user_email: user.email,
          check_in_date: today,
          check_in_type: check_in_type || 'morning',
          ...updateData,
        });
        record = newRecord;
      }

      return Response.json({ record, success: true, timestamp: new Date().toISOString() });
    }

    // ── GET TODAY ────────────────────────────────────────────────────────────
    if (action === 'get_today') {
      let allRecords = [];
      let retries = 3;
      while (retries > 0) {
        try {
          allRecords = await base44.entities.DailyCheckIn.filter({ user_email: user.email }, '-created_date', 30);
          break;
        } catch (e) {
          retries--;
          if (retries === 0) throw e;
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Merge all today records into one (handles edge case of duplicate records from type splits)
      const todayRecords = allRecords.filter(r => r.check_in_date === today);
      let todayRec = null;
      if (todayRecords.length > 0) {
        // Merge all today records: pick the one with most completions as base, overlay the rest
        const sorted = todayRecords.sort((a, b) => {
          const aScore = (a.morning_completed ? 1 : 0) + (a.evening_completed ? 1 : 0) + (a.midday_loop_completed ? 1 : 0);
          const bScore = (b.morning_completed ? 1 : 0) + (b.evening_completed ? 1 : 0) + (b.midday_loop_completed ? 1 : 0);
          return bScore - aScore;
        });
        todayRec = { ...sorted[0] };
        // Overlay any fields from secondary records that primary is missing
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

      // Find the most recent non-today record that has Big 3 set
      const prevWithBig3 = allRecords.find(r => r.check_in_date !== today && r.big3_priorities?.length > 0);
      const yesterday_big3 = prevWithBig3?.big3_priorities || [];
      return Response.json({ record: todayRec, yesterday_big3 });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});