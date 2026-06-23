/**
 * atreusProactiveWatch — Phase 4: Proactive Watching
 *
 * Called by a scheduled automation (every 6 hours).
 * For each manager user, calls the orchestrator logic inline,
 * and if signal_score >= 40, creates a Notification record with an
 * "Ask Atreus" CTA so the user sees it in their notification bell.
 *
 * Cooldown: will not create a new nudge if one was created within 20 hours.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // This function is called by scheduled automation — no user session exists.
    // Always use service role. Optionally allow admin-triggered calls too.
    const serviceBase44 = base44.asServiceRole;

    const now = new Date();
    const todayET = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(now);

    // Get all users with manager role (User Level 1 or manager-type roles)
    // We scan ManagerTrends to find active managers — this scopes to users with data
    const allTrends = await serviceBase44.entities.ManagerTrends.list('-last_trend_computed_at', 200);
    
    let processedCount = 0;
    let nudgesCreated = 0;

    for (const trend of allTrends) {
      if (!trend.user_email) continue;

      try {
        // Cooldown check — skip if nudge sent within 20 hours
        const recentNudges = await serviceBase44.entities.Notification.filter({
          user_email: trend.user_email,
          type: 'nudge',
        }, '-created_date', 1);

        if (recentNudges.length > 0) {
          const lastNudge = new Date(recentNudges[0].created_date);
          const hoursSince = (now - lastNudge) / (1000 * 60 * 60);
          if (hoursSince < 20) continue; // cooldown
        }

        // Score signals inline (same logic as orchestrator)
        let signalScore = 0;
        const signals = [];

        if (trend.energy_trend === 'declining') { signalScore += 20; signals.push('energy_declining_14d'); }
        if (trend.confidence_trend === 'declining') { signalScore += 15; signals.push('confidence_declining'); }
        if (trend.confidence_declining_days >= 3) { signalScore += 10; signals.push('confidence_multi_day_dip'); }
        if (trend.overload_pattern_strength >= 60) { signalScore += 20; signals.push('overload_pattern_strong'); }
        if (trend.delegation_gap_count_7d >= 2) { signalScore += 10; signals.push('delegation_gaps'); }
        if (trend.identity_friction_active) { signalScore += 15; signals.push('identity_friction'); }
        if (trend.learning_stall_detected) { signalScore += 10; signals.push('learning_stall'); }
        if (trend.operator_risk_trajectory === 'increasing') { signalScore += 15; signals.push('operator_risk_rising'); }

        // Check if they've checked in today
        const todayCheckIns = await serviceBase44.entities.DailyCheckIn.filter({
          user_email: trend.user_email,
          check_in_date: todayET,
        }, null, 1);

        const todayCheckIn = todayCheckIns[0] || null;
        if (todayCheckIn?.energy_score <= 2) { signalScore += 20; signals.push('low_energy_today'); }
        if (todayCheckIn?.load_score >= 4) { signalScore += 15; signals.push('high_load_today'); }

        signalScore = Math.min(100, signalScore);

        if (signalScore < 40) { processedCount++; continue; }

        // Build nudge body
        let nudgeBody = 'Atreus has noticed something worth a conversation.';
        if (signals.includes('overload_pattern_strong')) nudgeBody = 'An overload pattern is building. Atreus wants to check in.';
        else if (signals.includes('energy_declining_14d')) nudgeBody = 'Your energy has been trending down. Atreus has some observations to share.';
        else if (signals.includes('identity_friction')) nudgeBody = 'Some identity friction signals are showing. Atreus wants to explore this with you.';
        else if (signals.includes('delegation_gaps')) nudgeBody = 'There are delegation gaps this week. Atreus can help you look at what\'s getting in the way.';

        const askAtreusPrompt = nudgeBody.replace('Atreus wants to', 'Let\'s').replace('Atreus has', 'You have');

        // Create notification
        await serviceBase44.entities.Notification.create({
          user_email: trend.user_email,
          type: 'nudge',
          title: 'Atreus has something worth sharing',
          message: nudgeBody,
          is_read: false,
          priority: signalScore >= 60 ? 'high' : 'medium',
          metadata: {
            signal_score: signalScore,
            signals,
            ask_atreus_prompt: askAtreusPrompt,
            source: 'proactive_watch',
          },
        });

        nudgesCreated++;
        processedCount++;
      } catch (e) {
        console.warn(`Proactive watch failed for ${trend.user_email}:`, e.message);
        processedCount++;
      }
    }

    return Response.json({
      success: true,
      managers_processed: processedCount,
      nudges_created: nudgesCreated,
      run_at: now.toISOString(),
    });

  } catch (error) {
    console.error('atreusProactiveWatch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});