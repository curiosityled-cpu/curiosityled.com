/**
 * atreusOrchestrator — Unified Atreus signal router (Phase 1)
 *
 * Replaces scattered getPersonalInsights / buildSituation / buildMove calls
 * on the manager-facing Lead page. Single entry point for all Atreus context.
 *
 * Payload:
 *   trigger_type: "page_load" | "check_in_complete" | "proactive_watch" | "teams_message"
 *   page_context: { page: string, active_pattern?: string, check_in_state?: object }
 *   signal_override?: object  (for testing / external triggers)
 *
 * Returns:
 *   mode: "coaching" | "observing" | "nudge" | "celebrate"
 *   situation: string          — what the system sees right now
 *   opening_message: string    — Atreus greeting for this session
 *   suggested_actions: array   — up to 3 concrete next moves
 *   signal_score: number       — 0-100 urgency / signal strength
 *   memory_patch: object       — fields to upsert into ManagerMemory
 *   nudge?: object             — if nudge warranted: { title, body, ask_atreus_prompt }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { trigger_type = 'page_load', page_context = {}, signal_override = null } = body;

    const now = new Date();
    const todayET = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(now);

    // ── 1. Parallel data fetch ────────────────────────────────────────────────
    const [
      trends,
      memory,
      tonePrefs,
      recentCheckIns,
      activeGoals,
      recentPulses,
      latestAssessment,
    ] = await Promise.all([
      base44.entities.ManagerTrends.filter({ user_email: user.email }, '-last_trend_computed_at', 1).catch(() => []),
      base44.entities.ManagerMemory.filter({ user_email: user.email }, '-last_synthesized_at', 1).catch(() => []),
      base44.entities.TonePreference.filter({ user_email: user.email }, null, 1).catch(() => []),
      base44.entities.DailyCheckIn.filter({ user_email: user.email }, '-check_in_date', 14).catch(() => []),
      base44.entities.Goal.filter({ created_by: user.email, status: 'active' }, '-updated_date', 10).catch(() => []),
      base44.entities.ManagerPulse.filter({ user_email: user.email }, '-created_date', 20).catch(() => []),
      base44.entities.Assessment.filter({ email: user.email }, '-submission_ts', 1).catch(() => []),
    ]);

    const trend = trends[0] || null;
    const mem = memory[0] || null;
    const tone = tonePrefs[0]?.tone_mode || 'warm_candid';
    const assessment = latestAssessment[0] || null;

    // Today's check-in
    const todayCheckIn = recentCheckIns.find(c => c.check_in_date === todayET) || null;
    const morningDone = !!todayCheckIn?.morning_completed;
    const eveningDone = !!todayCheckIn?.evening_completed;

    // ── 2. Signal scoring ─────────────────────────────────────────────────────
    let signalScore = 0;
    const signals = [];

    // Energy / load signals
    if (todayCheckIn?.energy_score <= 2) { signalScore += 20; signals.push('low_energy_today'); }
    if (todayCheckIn?.load_score >= 4) { signalScore += 15; signals.push('high_load_today'); }

    // Trend signals
    if (trend?.energy_trend === 'declining') { signalScore += 20; signals.push('energy_declining_14d'); }
    if (trend?.confidence_trend === 'declining') { signalScore += 15; signals.push('confidence_declining'); }
    if (trend?.confidence_declining_days >= 3) { signalScore += 10; signals.push('confidence_multi_day_dip'); }
    if (trend?.overload_pattern_strength >= 60) { signalScore += 20; signals.push('overload_pattern_strong'); }
    if (trend?.delegation_gap_count_7d >= 2) { signalScore += 10; signals.push('delegation_gaps'); }
    if (trend?.identity_friction_active) { signalScore += 15; signals.push('identity_friction'); }
    if (trend?.learning_stall_detected) { signalScore += 10; signals.push('learning_stall'); }
    if (trend?.operator_risk_trajectory === 'increasing') { signalScore += 15; signals.push('operator_risk_rising'); }

    // Goal signals
    const overdueGoals = activeGoals.filter(g => g.timeframe_end && new Date(g.timeframe_end) < now);
    if (overdueGoals.length >= 2) { signalScore += 10; signals.push('multiple_overdue_goals'); }

    // Check-in streak
    const last7 = recentCheckIns.filter(c => {
      const d = new Date(c.check_in_date);
      return (now - d) / 86400000 <= 7;
    });
    if (last7.length === 0) { signalScore += 10; signals.push('no_checkins_7d'); }

    if (signal_override) signalScore = signal_override.score || signalScore;

    signalScore = Math.min(100, signalScore);

    // ── 3. Mode selection ─────────────────────────────────────────────────────
    let mode = 'observing';
    if (signalScore >= 60) mode = 'coaching';
    else if (signalScore >= 30) mode = 'nudge';
    else if (trend?.energy_trend === 'improving' && trend?.confidence_trend === 'improving') mode = 'celebrate';

    // ── 4. Situation narrative ────────────────────────────────────────────────
    let situation = '';
    if (signals.includes('low_energy_today') && signals.includes('high_load_today')) {
      situation = 'Low energy + high load today — a stretch day that warrants attention.';
    } else if (signals.includes('energy_declining_14d')) {
      situation = 'Energy has been trending down over the past two weeks.';
    } else if (signals.includes('overload_pattern_strong')) {
      situation = 'An overload pattern is building — this is worth naming before it compounds.';
    } else if (signals.includes('delegation_gaps')) {
      situation = 'Delegation commitments are not following through — a gap between intent and action.';
    } else if (signals.includes('identity_friction')) {
      situation = 'Some identity friction is showing up — worth exploring what\'s creating the tension.';
    } else if (signals.includes('no_checkins_7d')) {
      situation = 'No check-ins in 7 days — the system doesn\'t have enough signal to be useful right now.';
    } else if (mode === 'celebrate') {
      situation = 'Both energy and confidence are trending upward — something is working.';
    } else {
      situation = 'Signals are relatively stable. A good moment to be intentional rather than reactive.';
    }

    // Append page context to situation if present
    if (page_context?.active_pattern) {
      situation += ` Pattern detected on this page: ${page_context.active_pattern}.`;
    }

    // ── 5. Opening message (tone-aware) ───────────────────────────────────────
    const firstName = user.full_name ? user.full_name.split(' ')[0] : 'there';
    let opening_message = '';

    if (mode === 'celebrate') {
      opening_message = `${firstName}, something is shifting — and it looks like it's moving in the right direction. What's been different lately?`;
    } else if (mode === 'coaching' && signals.includes('low_energy_today')) {
      opening_message = tone === 'gentle_observant'
        ? `I noticed today looks like a heavy one. No pressure — just checking in. How are you actually doing?`
        : `${firstName}, today is reading as a stretch day. Energy is low and load is high. What's the one thing that would make the most difference right now?`;
    } else if (mode === 'coaching' && signals.includes('overload_pattern_strong')) {
      opening_message = `The pattern over the last couple of weeks is worth naming, ${firstName}. Something is building. Want to look at it together?`;
    } else if (!morningDone) {
      opening_message = `Morning, ${firstName}. You haven't checked in yet — 60 seconds of intent before the day takes over can make a real difference. Want to start there?`;
    } else if (morningDone && !eveningDone) {
      opening_message = `You set your intent this morning, ${firstName}. Let's see how the day is going — anything shifting that's worth naming?`;
    } else if (page_context?.page === 'patterns') {
      opening_message = `You're looking at the patterns view. ${situation} Anything in particular catching your attention?`;
    } else if (page_context?.page === 'practice') {
      opening_message = `Practice is where patterns change. What do you want to work on today, ${firstName}?`;
    } else if (page_context?.page === 'decision-journal' || page_context?.pageType === 'decision-journal') {
      opening_message = `You're in the Decision Journal, ${firstName}. This is where patterns in your decision-making become visible. What are you working through?`;
    } else {
      opening_message = `${firstName}, here's what I'm seeing: ${situation} What's on your mind?`;
    }

    // ── 6. Suggested actions ──────────────────────────────────────────────────
    const suggested_actions = [];

    if (!morningDone) suggested_actions.push({ label: 'Do morning check-in', type: 'check_in', target: 'morning' });
    if (signals.includes('overload_pattern_strong')) suggested_actions.push({ label: 'Explore overload pattern', type: 'practice_flow', flow_id: 'overload' });
    if (signals.includes('delegation_gaps')) suggested_actions.push({ label: 'Review delegation commitments', type: 'practice_flow', flow_id: 'delegation' });
    if (signals.includes('identity_friction')) suggested_actions.push({ label: 'Talk through what\'s creating friction', type: 'atreus_prompt', prompt: 'I want to explore the identity friction I\'ve been experiencing.' });
    if (signals.includes('confidence_declining')) suggested_actions.push({ label: 'Look at what\'s affecting confidence', type: 'atreus_prompt', prompt: 'Help me understand what\'s behind my declining confidence lately.' });
    if (overdueGoals.length > 0) suggested_actions.push({ label: `Review ${overdueGoals.length} overdue goal${overdueGoals.length > 1 ? 's' : ''}`, type: 'navigate', target: '/my-performance' });
    if (signals.includes('learning_stall')) suggested_actions.push({ label: 'Pick up where you left off in Practice', type: 'navigate', target: '/practice' });

    const final_actions = suggested_actions.slice(0, 3);

    // ── 7. Memory patch ───────────────────────────────────────────────────────
    const memory_patch = {};
    if (signals.includes('overload_pattern_strong')) {
      memory_patch.last_overload_signal = now.toISOString();
      memory_patch.overload_signal_count = (mem?.overload_signal_count || 0) + 1;
    }
    if (page_context?.page) {
      memory_patch.last_page_visited = page_context.page;
      memory_patch.last_seen_at = now.toISOString();
    }

    // Persist memory patch if there's anything to update
    if (Object.keys(memory_patch).length > 0) {
      try {
        if (mem) {
          await base44.entities.ManagerMemory.update(mem.id, memory_patch);
        } else {
          await base44.entities.ManagerMemory.create({ user_email: user.email, ...memory_patch });
        }
      } catch (e) {
        // non-blocking — memory writes should never fail silently hard
        console.warn('Memory patch write failed:', e.message);
      }
    }

    // ── 8. Nudge (for proactive_watch trigger) ────────────────────────────────
    let nudge = null;
    if (trigger_type === 'proactive_watch' && signalScore >= 40) {
      nudge = {
        title: mode === 'coaching' ? 'Atreus has something worth sharing' : 'A quick signal from Atreus',
        body: situation,
        ask_atreus_prompt: opening_message,
        signal_score: signalScore,
        signals,
      };
    }

    return Response.json({
      mode,
      situation,
      opening_message,
      suggested_actions: final_actions,
      signal_score: signalScore,
      signals,
      memory_patch,
      nudge,
      tone_used: tone,
      data_summary: {
        check_in_today: !!todayCheckIn,
        morning_done: morningDone,
        evening_done: eveningDone,
        active_goals: activeGoals.length,
        overdue_goals: overdueGoals.length,
        trend_available: !!trend,
        memory_available: !!mem,
        assessment_available: !!assessment,
      }
    });

  } catch (error) {
    console.error('atreusOrchestrator error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});