/**
 * atreusOrchestrator — Unified signal router for the Atreus intelligence layer.
 *
 * Receives signals from:
 *   - Entity automations (DailyCheckIn created/updated, Goal updated, ManagerTrends updated)
 *   - Scheduled jobs (pattern watchers)
 *   - Frontend page-context events
 *
 * Classifies intent → routes to sub-handlers → writes to ManagerSignalLog
 * → optionally creates AtreusPendingInsight for real-time UI consumption.
 *
 * Sub-handlers (inline):
 *   handleCheckInSignal        — post check-in synthesis, memory update trigger
 *   handlePatternSignal        — threshold crossings from ManagerTrends
 *   handlePageContextSignal    — card-level awareness from the frontend
 *   handleGoalSignal           — goal stall / completion events
 *   handleProactiveWatch       — scheduled watcher: evaluates all active managers
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Threshold configuration ──────────────────────────────────────────────────
const THRESHOLDS = {
  energy_declining_days: 5,          // days before proactive nudge
  overload_strength_high: 65,        // overload_pattern_strength threshold
  confidence_declining_days: 4,      // consecutive days
  delegation_gap_critical: 3,        // gaps in 7 days
  learning_stall_days: 14,           // days without learning activity
  workload_growth_divergence_days: 3 // high load + low growth simultaneously
};

// ── Model routing by task complexity ────────────────────────────────────────
const MODEL_NUDGE = 'gemini_3_flash';      // fast, cheap — for nudge generation
const MODEL_SYNTHESIS = 'claude_sonnet_4_6'; // deep — for pattern synthesis

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // ── Dual-mode auth: entity automation (service role) vs. direct frontend call ──
    // Entity automations send { event, data, old_data } with no user token.
    // Direct calls from the frontend send { signal_type, signal_data, page_context }
    // with a valid user token.
    let user = null;
    let signal_type = body.signal_type;
    let signal_data = body.signal_data || {};
    let page_context = body.page_context || {};

    const isEntityAutomation = !!(body.event && body.event.entity_name);

    if (isEntityAutomation) {
      // Map entity automation payload → signal format
      const entityName = body.event?.entity_name;
      const entityData = body.data || {};
      const userEmail = entityData.user_email;

      if (!userEmail) {
        return Response.json({ skipped: true, reason: 'no_user_email_in_entity_data' });
      }

      // Synthesize a virtual user object from entity data
      user = { email: userEmail, client_id: entityData.client_id || null };

      // Map entity type → signal type
      if (!signal_type) {
        if (entityName === 'ManagerTrends') {
          signal_type = 'trend_threshold_crossed';
          signal_data = {
            overload_pattern_strength: entityData.overload_pattern_strength,
            confidence_declining_days: entityData.confidence_declining_days,
            delegation_gap_count_7d: entityData.delegation_gap_count_7d,
            workload_growth_divergence_days: entityData.workload_growth_divergence_days,
          };
        } else if (entityName === 'DailyCheckIn') {
          signal_type = 'check_in_completed';
          signal_data = { check_in_type: entityData.check_in_type, check_in_date: entityData.check_in_date };
        } else {
          signal_type = 'entity_event';
          signal_data = { entity: entityName, action: body.event?.type };
        }
      }
    } else {
      // Direct frontend / scheduled call — require auth
      user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!signal_type) {
      return Response.json({ error: 'signal_type is required' }, { status: 400 });
    }

    // Log the incoming signal
    const signalLog = await base44.asServiceRole.entities.ManagerSignalLog.create({
      user_email: user.email,
      signal_type,
      signal_data,
      page_context,
      priority: classifyPriority(signal_type, signal_data),
      processed: false,
      client_id: user.client_id || user.data?.client_id || null,
    });

    // Route to sub-handler
    let result = { routed_to: null, action_taken: null, notification_sent: false };

    switch (signal_type) {
      case 'check_in_completed':
        result = await handleCheckInSignal(base44, user, signal_data, signalLog.id);
        break;
      case 'pattern_detected':
      case 'trend_threshold_crossed':
        result = await handlePatternSignal(base44, user, signal_data, signalLog.id);
        break;
      case 'page_viewed':
      case 'card_engaged':
        result = await handlePageContextSignal(base44, user, signal_data, page_context, signalLog.id);
        break;
      case 'goal_updated':
        result = await handleGoalSignal(base44, user, signal_data, signalLog.id);
        break;
      case 'proactive_watch':
        result = await handleProactiveWatch(base44, user, signalLog.id);
        break;
      default:
        result = { routed_to: 'unhandled', action_taken: 'logged_only' };
    }

    // Mark signal as processed
    await base44.asServiceRole.entities.ManagerSignalLog.update(signalLog.id, {
      processed: true,
      processed_at: new Date().toISOString(),
      routed_to: result.routed_to,
      action_taken: result.action_taken,
      notification_sent: result.notification_sent || false,
    });

    return Response.json({ success: true, signal_id: signalLog.id, ...result });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ── Priority classifier ───────────────────────────────────────────────────────
function classifyPriority(signal_type, signal_data) {
  if (signal_type === 'trend_threshold_crossed') {
    if (signal_data?.overload_pattern_strength >= THRESHOLDS.overload_strength_high) return 'high';
    if (signal_data?.confidence_declining_days >= THRESHOLDS.confidence_declining_days) return 'high';
  }
  if (signal_type === 'check_in_completed') return 'medium';
  if (signal_type === 'page_viewed' || signal_type === 'card_engaged') return 'low';
  if (signal_type === 'proactive_watch') return 'medium';
  return 'medium';
}

// ── Sub-handler: Check-In Completed ──────────────────────────────────────────
async function handleCheckInSignal(base44, user, signal_data, signalId) {
  const result = { routed_to: 'check_in_handler', action_taken: null, notification_sent: false };

  // Fetch the check-in record
  const recentCheckIns = await base44.asServiceRole.entities.DailyCheckIn.filter(
    { user_email: user.email }, '-check_in_date', 7
  );

  if (recentCheckIns.length < 3) {
    result.action_taken = 'insufficient_data';
    return result;
  }

  // Compute rolling averages
  const avgEnergy = recentCheckIns.reduce((s, c) => s + (c.energy_score || 3), 0) / recentCheckIns.length;
  const avgLoad = recentCheckIns.reduce((s, c) => s + (c.load_score || 3), 0) / recentCheckIns.length;

  // Detect high-load + low-energy pattern requiring a nudge
  const needsNudge = avgLoad >= 4 && avgEnergy <= 2.5;

  if (needsNudge) {
    const nudgeMsg = await generateNudge(base44, user, {
      avgEnergy: avgEnergy.toFixed(1),
      avgLoad: avgLoad.toFixed(1),
      pattern: 'high_load_low_energy',
    });

    await createPendingInsight(base44, user.email, {
      insight_type: 'check_in_follow_up',
      message: nudgeMsg,
      context_data: { avgEnergy, avgLoad, recent_check_ins: recentCheckIns.length },
      priority: 'high',
      source_signal_id: signalId,
    });

    result.action_taken = 'pending_insight_created';
    result.notification_sent = true;
  } else {
    result.action_taken = 'pattern_ok_no_action';
  }

  // Trigger memory update if we have enough check-ins
  if (recentCheckIns.length >= 5) {
    await base44.asServiceRole.functions.invoke('updateManagerMemory', {});
    result.action_taken = (result.action_taken || '') + '+memory_updated';
  }

  return result;
}

// ── Sub-handler: Pattern / Trend Threshold Crossed ───────────────────────────
async function handlePatternSignal(base44, user, signal_data, signalId) {
  const result = { routed_to: 'pattern_handler', action_taken: null, notification_sent: false };

  // Fetch latest trends
  const trendRows = await base44.asServiceRole.entities.ManagerTrends.filter(
    { user_email: user.email }, '-last_trend_computed_at', 1
  );
  const trends = trendRows[0];
  if (!trends) {
    result.action_taken = 'no_trends_available';
    return result;
  }

  const alerts = [];

  if (trends.overload_pattern_strength >= THRESHOLDS.overload_strength_high) {
    alerts.push({ type: 'overload', strength: trends.overload_pattern_strength });
  }
  if ((trends.confidence_declining_days || 0) >= THRESHOLDS.confidence_declining_days) {
    alerts.push({ type: 'confidence_declining', days: trends.confidence_declining_days });
  }
  if ((trends.delegation_gap_count_7d || 0) >= THRESHOLDS.delegation_gap_critical) {
    alerts.push({ type: 'delegation_gap', gaps: trends.delegation_gap_count_7d });
  }
  if ((trends.workload_growth_divergence_days || 0) >= THRESHOLDS.workload_growth_divergence_days) {
    alerts.push({ type: 'workload_growth_divergence', days: trends.workload_growth_divergence_days });
  }

  if (alerts.length === 0) {
    result.action_taken = 'no_thresholds_crossed';
    return result;
  }

  // Generate a synthesized pattern message using deeper model
  const synthesisPrompt = `
You are Atreus, a private leadership companion. A manager's behavioral data has crossed important thresholds.
Alerts detected: ${JSON.stringify(alerts)}
Trend data: overload_strength=${trends.overload_pattern_strength}, energy_trend=${trends.energy_trend}, confidence_trend=${trends.confidence_trend}

Write a single, brief (2-3 sentences), warm and non-alarming message that Atreus might open a conversation with.
It should feel like a check-in from a trusted colleague, not a system alert. Use first-person coach voice.
Start with "I've been noticing..." or "Something I want to check in on..."
Do NOT use diagnostic language or terms like "burnout", "at risk", "struggling".
  `.trim();

  const nudgeMessage = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: synthesisPrompt,
    model: MODEL_SYNTHESIS,
  });

  await createPendingInsight(base44, user.email, {
    insight_type: 'pattern_alert',
    message: typeof nudgeMessage === 'string' ? nudgeMessage : nudgeMessage?.text || "I've been noticing some patterns worth checking in on. Want to explore them together?",
    context_data: { alerts, trends_snapshot: { overload_pattern_strength: trends.overload_pattern_strength, energy_trend: trends.energy_trend } },
    priority: alerts.some(a => a.type === 'overload') ? 'high' : 'medium',
    source_signal_id: signalId,
  });

  result.action_taken = `pending_insight_created:${alerts.map(a => a.type).join(',')}`;
  result.notification_sent = true;

  return result;
}

// ── Sub-handler: Page Context / Card Engaged ─────────────────────────────────
async function handlePageContextSignal(base44, user, signal_data, page_context, signalId) {
  const result = { routed_to: 'page_context_handler', action_taken: 'context_logged', notification_sent: false };

  // Only generate an insight if the card data shows something actionable
  const { card, metrics = {} } = signal_data;

  // Example: WatchlistCard showing high-confidence signals
  if (card === 'WatchlistCard' && metrics.high_confidence_signals > 0) {
    const existing = await base44.asServiceRole.entities.AtreusPendingInsight.filter(
      { user_email: user.email, consumed: false, insight_type: 'page_context_insight' }, '-created_date', 1
    );

    // Don't spam — only create if no unconsumed page insight exists
    if (existing.length === 0) {
      await createPendingInsight(base44, user.email, {
        insight_type: 'page_context_insight',
        message: `I see you're looking at your Watchlist. There ${metrics.high_confidence_signals === 1 ? 'is' : 'are'} ${metrics.high_confidence_signals} strong signal${metrics.high_confidence_signals !== 1 ? 's' : ''} worth unpacking. Want to talk through any of them?`,
        context_data: { card, metrics, page_context },
        priority: 'low',
        source_signal_id: signalId,
      });
      result.action_taken = 'page_insight_created';
    }
  }

  return result;
}

// ── Sub-handler: Goal Updated ─────────────────────────────────────────────────
async function handleGoalSignal(base44, user, signal_data, signalId) {
  const result = { routed_to: 'goal_handler', action_taken: null, notification_sent: false };
  const { goal_id, previous_status, new_status, progress } = signal_data;

  // Goal completed → celebrate
  if (new_status === 'archived' && previous_status === 'active') {
    await createPendingInsight(base44, user.email, {
      insight_type: 'goal_reminder',
      message: "I noticed you just completed a goal. That deserves a moment of acknowledgment — what made the difference for you this time?",
      context_data: { goal_id, event: 'goal_completed' },
      priority: 'medium',
      source_signal_id: signalId,
    });
    result.action_taken = 'completion_insight_created';
    result.notification_sent = true;
    return result;
  }

  // Goal stalled (progress hasn't moved in a while and it's active)
  if (new_status === 'active' && typeof progress === 'number' && progress < 20) {
    result.action_taken = 'goal_stall_logged';
  }

  return result;
}

// ── Sub-handler: Proactive Watch (scheduled) ──────────────────────────────────
async function handleProactiveWatch(base44, user, signalId) {
  const result = { routed_to: 'proactive_watcher', action_taken: [], notification_sent: false };

  const trendRows = await base44.asServiceRole.entities.ManagerTrends.filter(
    { user_email: user.email }, '-last_trend_computed_at', 1
  );
  const trends = trendRows[0];
  if (!trends) {
    result.action_taken = ['no_trends'];
    return result;
  }

  // Check for unacknowledged pending insights — don't pile on
  const pending = await base44.asServiceRole.entities.AtreusPendingInsight.filter(
    { user_email: user.email, consumed: false }, '-created_date', 5
  );
  if (pending.length >= 2) {
    result.action_taken = ['max_pending_reached'];
    return result;
  }

  const actions = [];

  // Learning stall
  if (trends.learning_stall_detected) {
    await createPendingInsight(base44, user.email, {
      insight_type: 'proactive_nudge',
      message: "I've been noticing development activity has been quiet for a while. Even 30 minutes on something that matters to you can reset the momentum. What's one area you've been meaning to revisit?",
      context_data: { trigger: 'learning_stall' },
      priority: 'medium',
      source_signal_id: signalId,
    });
    actions.push('learning_stall_nudge');
  }

  // Identity friction
  if (trends.identity_friction_active) {
    await createPendingInsight(base44, user.email, {
      insight_type: 'proactive_nudge',
      message: "Something I want to check in on — there have been some signals around role clarity lately. Not alarming, just worth a conversation. What's been on your mind about how you're showing up as a leader right now?",
      context_data: { trigger: 'identity_friction' },
      priority: 'medium',
      source_signal_id: signalId,
    });
    actions.push('identity_friction_nudge');
  }

  result.action_taken = actions.length > 0 ? actions : ['no_thresholds_crossed'];
  result.notification_sent = actions.length > 0;
  return result;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function generateNudge(base44, user, data) {
  const prompt = `
You are Atreus, a private leadership companion. A manager's recent check-ins show avg energy ${data.avgEnergy}/5 and avg load ${data.avgLoad}/5 — high load, low energy pattern.
Write a 1-2 sentence warm, non-alarming check-in message to open a conversation with the manager.
Start with "I've been noticing..." or "Something worth checking in on..."
Never use the words: burnout, struggling, stressed, at risk, overwhelmed.
  `.trim();

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    model: MODEL_NUDGE,
  });
  return typeof result === 'string' ? result : (result?.text || "I've been noticing your energy has been lower recently. Want to take a moment to explore what's been going on?");
}

async function createPendingInsight(base44, user_email, data) {
  // Set default expiry — 48 hours
  const expires_at = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  return base44.asServiceRole.entities.AtreusPendingInsight.create({
    user_email,
    expires_at,
    consumed: false,
    ...data,
  });
}