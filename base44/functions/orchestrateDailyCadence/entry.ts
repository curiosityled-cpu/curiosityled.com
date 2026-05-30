/**
 * orchestrateDailyCadence — smart daily check-in prompt dispatcher.
 *
 * Runs every morning (Mon–Fri, 8:30am ET). Determines the right prompt
 * type for each active manager based on:
 *   - Day of week
 *   - Recent prompt history (avoid repetition)
 *   - Current risk score
 *   - Pending triggers from evaluatePredictiveTriggers
 *   - Cadence preference (every_other_day, important_only, paused)
 *
 * Cadence rules:
 *   MON  → morning_intent (set the week's intention)
 *   TUE  → baseline_energy or contextual (risk-gated)
 *   WED  → confidence_check or overload_check (risk-gated)
 *   THU  → baseline_energy or follow_up (if pending)
 *   FRI  → weekly_reflection (always)
 *
 *   Override: if risk ≥ 60 on any day → overload_check
 *   Override: if predictive trigger notification is pending (unseen) → contextual prompt for that trigger
 *
 * Admin-only. Invoked by scheduled automation Mon–Fri 8:30am ET.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Day-of-week base schedule ────────────────────────────────────────────────

const DAY_SCHEDULE = {
  1: 'morning_intent',       // Monday
  2: 'baseline_energy',      // Tuesday
  3: 'contextual',           // Wednesday (confidence/overload-gated)
  4: 'baseline_energy',      // Thursday
  5: 'weekly_reflection',    // Friday
};

// ─── Operator mode risk scoring (mirror of sendTeamsPrompt) ──────────────────

function computeRiskScore(recentPulses, recentActivity) {
  let score = 0;
  if (recentPulses.length > 0) {
    const latest = recentPulses[0];
    if (latest.energy_level === 'drained') score += 20;
    else if (latest.energy_level === 'stretched') score += 10;
    if (latest.perceived_load === 'unsustainable') score += 20;
    else if (latest.perceived_load === 'heavy') score += 10;
  }
  if (recentActivity.length > 0) {
    const today = recentActivity[0];
    if ((today.meeting_minutes_day || 0) > 300) score += 15;
    else if ((today.meeting_minutes_day || 0) > 210) score += 8;
    if ((today.back_to_back_density || 0) > 0.6) score += 10;
    if ((today.late_day_load_minutes || 0) > 60) score += 10;
    if ((today.stalled_strategic_goals || 0) > 1) score += 15;
    if ((today.learning_inertia_days || 0) > 7) score += 10;
  }
  return Math.min(score, 100);
}

// ─── Compute engagement rate (responses vs opportunities in last 14d) ─────────

function computeEngagementRate(recentPulses) {
  // Count web-sourced pulses (manager actually responded) in last 14 days
  const cutoff = new Date(Date.now() - 14 * 24 * 3600000);
  const responses = recentPulses.filter(p =>
    p.source === 'web' &&
    p.prompt_type !== 'follow_up' &&
    new Date(p.created_date) > cutoff
  ).length;
  // Rough denominator: assume ~10 prompts sent in 14d (Mon–Fri, every_other_day)
  return Math.min(responses / 10, 1.0);
}

// ─── Select final prompt type for this manager today ─────────────────────────

function selectPromptType(dayOfWeek, riskScore, recentPulses, pendingTriggers) {
  // Hard override: high risk always surfaces overload check
  if (riskScore >= 60) return 'overload_check';

  // Pending trigger override: surface relevant check-in
  if (pendingTriggers.includes('identity_friction')) return 'contextual';
  if (pendingTriggers.includes('confidence_dip')) return 'contextual';
  if (pendingTriggers.includes('delegation_gap')) return 'follow_up';

  // Follow-up override: if there's an unresolved follow_up pending from overload
  const pendingFollowUp = recentPulses.find(p =>
    p.source === 'system' &&
    p.prompt_type === 'follow_up' &&
    !p.follow_up_sent
  );
  if (pendingFollowUp) return 'follow_up';

  // Base schedule
  const base = DAY_SCHEDULE[dayOfWeek] || 'baseline_energy';

  // Wed: choose between confidence_check and overload based on moderate risk
  if (dayOfWeek === 3) {
    return riskScore >= 40 ? 'overload_check' : 'contextual';
  }

  return base;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat

    // Only run Mon–Fri
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return Response.json({ sent: 0, reason: 'Weekend — no prompts sent' });
    }

    // All onboarded managers (TonePreference = completed onboarding)
    const tonePrefs = await base44.asServiceRole.entities.TonePreference.list('-created_date', 200);

    const results = [];

    for (const pref of tonePrefs) {
      const email = pref.user_email;
      if (!email) continue;

      // Respect cadence preference
      if (pref.cadence_preference === 'paused') {
        results.push({ email, status: 'skipped', reason: 'Cadence paused' });
        continue;
      }

      if (pref.cadence_preference === 'every_other_day') {
        const lastSent = pref.last_prompt_sent_at ? new Date(pref.last_prompt_sent_at) : null;
        if (lastSent) {
          const hoursSince = (now - lastSent) / 3600000;
          if (hoursSince < 36) {
            results.push({ email, status: 'skipped', reason: 'every_other_day cadence not yet elapsed' });
            continue;
          }
        }
      }

      try {
        // Fetch context for this manager
        const [recentPulses, recentActivity, recentNotifs] = await Promise.all([
          base44.asServiceRole.entities.ManagerPulse.filter({ user_email: email }, '-created_date', 10),
          base44.asServiceRole.entities.UserActivity.filter({ user_email: email }, '-date', 2),
          base44.asServiceRole.entities.Notification.filter({ user_email: email }, '-created_date', 10),
        ]);

        // Anti-spam: already sent something today?
        const todayStr = now.toISOString().split('T')[0];
        const sentToday = recentPulses.find(p =>
          p.source === 'system' &&
          p.created_date?.toString().startsWith(todayStr)
        );
        if (sentToday) {
          results.push({ email, status: 'skipped', reason: 'Already sent today' });
          continue;
        }

        const riskScore = computeRiskScore(recentPulses, recentActivity);
        const engagementRate = computeEngagementRate(recentPulses);

        // Adaptive cadence: if engagement is very low (< 20% response rate), back off
        // unless risk is high (then we still need to reach them)
        if (engagementRate < 0.2 && riskScore < 50 && pref.cadence_preference !== 'important_only') {
          // Check last prompt wasn't more than 3 days ago (don't go completely silent)
          const lastSent = pref.last_prompt_sent_at ? new Date(pref.last_prompt_sent_at) : null;
          if (lastSent && (now - lastSent) / 3600000 < 72) {
            results.push({ email, status: 'skipped', reason: 'Low engagement — backing off cadence', engagement_rate: engagementRate });
            continue;
          }
        }

        // Adaptive cadence: if engagement is high (> 70%) AND risk is moderate, allow slightly more frequent prompts
        // (already handled by not suppressing, just log the engagement signal)

        // Check for unread predictive trigger notifications
        const pendingTriggers = recentNotifs
          .filter(n => n.related_entity_type === 'predictive_trigger' && !n.is_read)
          .map(n => n.related_entity_id);

        const promptType = selectPromptType(dayOfWeek, riskScore, recentPulses, pendingTriggers);

        // Delegate to sendTeamsPrompt for actual delivery + tone application
        // Use base44.functions.invoke (user-scoped, admin has auth) not asServiceRole
        let sendResult;
        try {
          sendResult = await base44.functions.invoke('sendTeamsPrompt', {
            user_email: email,
            prompt_type: promptType,
            force: true,  // skip anti-spam gate — orchestrator acts as dispatcher
          });
        } catch (invokeErr) {
          console.error(`sendTeamsPrompt invoke failed for ${email}:`, invokeErr.message);
          sendResult = { sent: false, error: invokeErr.message };
        }

        // Update last_prompt_sent_at on TonePreference
        await base44.asServiceRole.entities.TonePreference.update(pref.id, {
          last_prompt_sent_at: now.toISOString(),
        });

        results.push({
          email,
          status: 'ok',
          prompt_type: promptType,
          risk_score: riskScore,
          engagement_rate: engagementRate,
          pending_triggers: pendingTriggers,
          send_result: sendResult?.sent,
        });

      } catch (err) {
        results.push({ email, status: 'error', error: err.message });
      }
    }

    return Response.json({
      day: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek],
      sent: results.filter(r => r.status === 'ok' && r.send_result).length,
      skipped: results.filter(r => r.status === 'skipped').length,
      failed: results.filter(r => r.status === 'error').length,
      results,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});