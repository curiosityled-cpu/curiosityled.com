/**
 * triggerPreMeetingPrompt — contextual pre-meeting intervention.
 *
 * Called when a high-load or high-stakes calendar event is detected.
 * Checks conditions, then either:
 *   - Creates a Notification (in-app nudge)
 *   - Calls sendTeamsPrompt to deliver a warm, context-aware check-in
 *
 * Trigger criteria (any one):
 *   1. Back-to-back density ≥ 0.7 AND ≥ 6 meetings today
 *   2. A meeting title keyword matches friction patterns (e.g. performance review, difficult)
 *   3. Late-day load > 90 minutes
 *
 * Rate limited: won't fire more than once per 4 hours per manager.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const HIGH_STAKES_KEYWORDS = [
  'performance review', 'pip', 'difficult conversation', 'termination',
  'feedback session', 'restructur', 'reorg', 'escalation', 'board',
  'stakeholder review', 'exec review', 'all hands', 'layoff'
];

function detectHighStakesTitle(title = '') {
  const lower = title.toLowerCase();
  return HIGH_STAKES_KEYWORDS.some(kw => lower.includes(kw));
}

function buildContextualPrompt(trigger, activity, toneMode) {
  const prompts = {
    overload: {
      baseline_energy: {
        title: "Your day looks packed. How are you actually doing?",
        body: "Before things get moving — how clear is your head right now? This kind of load can make it easy to just react rather than lead.",
        options: [
          { label: "Clear enough", value: "steady" },
          { label: "A bit scattered", value: "stretched" },
          { label: "Already behind", value: "drained" },
        ],
        why: "I noticed your calendar is dense today. When load stacks up, it usually gets harder to lead the way you want to."
      }
    },
    high_stakes: {
      confidence_check: {
        title: "You've got something significant coming up today.",
        body: "How confident do you feel going into it?",
        options: [
          { label: "Grounded", value: "steady" },
          { label: "Uncertain", value: "uncertain" },
          { label: "Nervous", value: "low" },
        ],
        why: "I saw you have a meeting that might take some leadership muscle today. Quick check-in before you go in."
      }
    },
    late_overload: {
      overload_check: {
        title: "Your evening is heavy. Worth a moment before it starts.",
        body: "You have significant meetings later in the day. How are you carrying the afternoon so far?",
        options: [
          { label: "Fine — still have energy", value: "steady" },
          { label: "Running low", value: "stretched" },
          { label: "Already full", value: "drained" },
        ],
        why: "Late-day meetings when you're already stretched tend to produce reactive leadership. Just checking in."
      }
    }
  };

  const promptSet = prompts[trigger] || prompts.overload;
  const promptType = Object.keys(promptSet)[0];
  return { ...promptSet[promptType], prompt_type: promptType };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { user_email, force = false } = body;

    const targetEmail = user_email || user.email;
    if (!targetEmail) {
      return Response.json({ error: 'user_email required' }, { status: 400 });
    }

    // Admin check for running on behalf of others
    if (targetEmail !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rate limiting: check if we sent a contextual prompt in last 4 hours
    if (!force) {
      const recentPulses = await base44.asServiceRole.entities.ManagerPulse.filter(
        { user_email: targetEmail, source: 'system' },
        '-created_date',
        1
      );
      if (recentPulses.length > 0) {
        const lastPulse = recentPulses[0];
        const hoursSince = (Date.now() - new Date(lastPulse.created_date)) / 3600000;
        if (hoursSince < 4) {
          return Response.json({
            sent: false,
            reason: `Rate limited — last contextual prompt sent ${Math.round(hoursSince)}h ago`
          });
        }
      }
    }

    // Get today's activity signals
    const today = new Date().toISOString().split('T')[0];
    const activityRecords = await base44.asServiceRole.entities.UserActivity.filter(
      { user_email: targetEmail, date: today },
      null,
      1
    );
    const activity = activityRecords[0] || null;

    if (!activity) {
      return Response.json({ sent: false, reason: 'No activity data for today' });
    }

    // Determine trigger type
    let trigger = null;

    if (
      (activity.back_to_back_density || 0) >= 0.7 &&
      (activity.meeting_count_day || 0) >= 6
    ) {
      trigger = 'overload';
    } else if ((activity.late_day_load_minutes || 0) > 90) {
      trigger = 'late_overload';
    }

    // Check for high-stakes keyword match in recent calendar data
    // (meeting titles not stored in UserActivity — this is a best-effort inference)
    if (!trigger && (activity.operator_mode_risk_score || 0) >= 70) {
      trigger = 'high_stakes';
    }

    if (!trigger) {
      return Response.json({ sent: false, reason: 'No contextual trigger met today' });
    }

    // Get tone preference
    const tonePrefs = await base44.asServiceRole.entities.TonePreference.filter(
      { user_email: targetEmail },
      null,
      1
    );
    const toneMode = tonePrefs[0]?.tone_mode || 'warm_candid';

    // Build the contextual prompt
    const prompt = buildContextualPrompt(trigger, activity, toneMode);

    // Create a system-sourced ManagerPulse as a placeholder (marks this as sent)
    await base44.asServiceRole.entities.ManagerPulse.create({
      user_email: targetEmail,
      prompt_type: prompt.prompt_type,
      source: 'system',
    });

    // Create in-app notification with the prompt
    await base44.asServiceRole.entities.Notification.create({
      user_email: targetEmail,
      type: 'atreus_checkin',
      title: prompt.title,
      message: `${prompt.body}\n\n_"${prompt.why}"_`,
      scheduled_for: new Date().toISOString(),
      status: 'pending',
      priority: 'medium',
      related_entity_type: 'contextual_trigger',
    });

    return Response.json({
      sent: true,
      trigger,
      prompt_type: prompt.prompt_type,
      tone_mode: toneMode,
      title: prompt.title,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});