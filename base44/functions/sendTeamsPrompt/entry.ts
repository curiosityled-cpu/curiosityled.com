/**
 * sendTeamsPrompt — the single orchestrator for all manager check-in prompts.
 *
 * All triggers (scheduled, contextual, entity-based) must route through here.
 * Handles: anti-spam, cadence preferences, meeting suppression, prompt selection,
 * Teams card delivery, and memory updates.
 *
 * Phase 1: Baseline energy/overload prompts (web notification fallback for POC)
 * Phase 2+: Real Teams Adaptive Card delivery via Graph API
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Prompt templates ─────────────────────────────────────────────────────────

const PROMPTS = {
  baseline_energy: {
    title: "How's today really feel?",
    body: "Before the day runs away from you — how much room do you actually have right now?",
    why: "I'm trying to understand how loaded your days feel over time, not just what's on your calendar. That helps me spot when you're at risk of carrying too much yourself.",
    options: [
      { label: "No room at all", value: "none" },
      { label: "Pretty tight", value: "tight" },
      { label: "Enough to breathe", value: "some" },
      { label: "Lots of space", value: "plenty" }
    ],
    optional_text: "What's weighing on you most, if anything?",
    prompt_type: "baseline_energy",
    field: "room_today"
  },
  clarity_check: {
    title: "Clear, stretched, or already behind?",
    body: "When you look at today, which of these feels closest to where you actually are?",
    why: "I'm watching for stretches where you keep feeling 'behind' before the day even starts. Those are often the weeks where leadership takes the biggest hit.",
    options: [
      { label: "I feel clear", value: "steady" },
      { label: "I feel stretched", value: "stretched" },
      { label: "Already behind", value: "drained" }
    ],
    optional_text: "What's making it feel that way?",
    prompt_type: "baseline_energy",
    field: "energy_level"
  },
  confidence_check: {
    title: "How steady are you feeling today?",
    body: "Not 'are you doing your job' — just, how settled do you feel in yourself as a leader right now?",
    why: "Confidence ebbs and flows, and I've noticed yours tends to dip when things pile up. Checking in helps me support you at the right moments.",
    options: [
      { label: "Solid", value: "high" },
      { label: "Okay, mostly", value: "steady" },
      { label: "A bit shaky", value: "uncertain" },
      { label: "Not great", value: "low" }
    ],
    optional_text: "What's shaking it, if anything?",
    prompt_type: "baseline_energy",
    field: "confidence_today"
  },
  overload_overcontrol: {
    title: "Are you in 'I'll just do it' mode again?",
    body: "This week looks heavy. When your days stack up like this, it's easy to start grabbing more work yourself instead of letting your team carry it.",
    why: "I can see your calendar is packed and some longer-term goals haven't moved much. In the past, that mix is exactly when you end up carrying more than you planned.",
    options: [
      { label: "Very much", value: "very_much" },
      { label: "Somewhat", value: "somewhat" },
      { label: "Not really", value: "not_really" },
      { label: "Skip for now", value: "skipped" }
    ],
    optional_text: "What are you holding that probably shouldn't all sit with you?",
    prompt_type: "overload_check",
    field: "operator_mode_response"
  },
  weekly_reflection: {
    title: "How did this week actually go?",
    body: "Not the output — the experience of it. Did you lead the way you wanted to this week?",
    why: "Weekly reflection is one of the most reliable ways to build self-awareness over time. Even a quick honest answer here is useful.",
    options: [
      { label: "Mostly yes", value: "strong" },
      { label: "Mixed", value: "steady" },
      { label: "Mostly in survival mode", value: "stretched" },
      { label: "Not at all", value: "drained" }
    ],
    optional_text: "What one thing would you do differently?",
    prompt_type: "weekly_reflection",
    field: "energy_level"
  }
};

// Follow-up messages based on overload response
const OVERLOAD_FOLLOWUPS = {
  very_much: "Okay — let's take some weight off. Want help picking one thing to hand off or say no to before tomorrow?",
  somewhat: "You're catching it early. We could turn one task into a small delegation experiment this week if you want.",
  not_really: "Good. If that changes, just say 'I'm sliding into doing it all again' and we'll sort it out.",
  skipped: null
};

// ─── Tone-aware phrasing ──────────────────────────────────────────────────────

function applyTone(text, toneMode) {
  // In v1, tone is primarily used in follow-up and pattern language.
  // The base prompt language stays consistent to avoid confusion.
  // Full tone-aware generation is handled by Atreus/LLM in Phase 3.
  return text;
}

// ─── Operator mode risk scoring ───────────────────────────────────────────────

function computeOperatorModeRisk(recentPulses, recentActivity) {
  let score = 0;

  // Self-report signals (max 40pts)
  if (recentPulses.length > 0) {
    const latest = recentPulses[0];
    if (latest.energy_level === 'drained') score += 20;
    else if (latest.energy_level === 'stretched') score += 10;
    if (latest.perceived_load === 'unsustainable') score += 20;
    else if (latest.perceived_load === 'heavy') score += 10;
  }

  // Calendar signals (max 35pts)
  if (recentActivity.length > 0) {
    const today = recentActivity[0];
    if (today.meeting_minutes_day > 300) score += 15; // 5+ hours
    else if (today.meeting_minutes_day > 210) score += 8;
    if (today.back_to_back_density > 0.6) score += 10;
    else if (today.back_to_back_density > 0.4) score += 5;
    if (today.late_day_load_minutes > 60) score += 10;
  }

  // Goal stagnation signals (max 25pts)
  if (recentActivity.length > 0) {
    const act = recentActivity[0];
    if (act.stalled_strategic_goals > 1) score += 15;
    else if (act.stalled_strategic_goals === 1) score += 8;
    if (act.learning_inertia_days > 7) score += 10;
    else if (act.learning_inertia_days > 3) score += 5;
  }

  return Math.min(score, 100);
}

// ─── Anti-spam check ─────────────────────────────────────────────────────────

function canSendPrompt(tonePref, now) {
  if (!tonePref) return true;
  if (tonePref.cadence_preference === 'paused') return false;
  if (!tonePref.last_prompt_sent_at) return true;

  const lastSent = new Date(tonePref.last_prompt_sent_at);
  const hoursSinceLast = (now - lastSent) / 3600000;

  // Never send more than once in 12 hours
  return hoursSinceLast >= 12;
}

// ─── Select which prompt to send ─────────────────────────────────────────────

function selectPrompt(riskScore, tonePref, pulseHistory) {
  // High risk → overload prompt
  if (riskScore >= 60) return PROMPTS.overload_overcontrol;

  // Friday → weekly reflection
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 5) return PROMPTS.weekly_reflection;

  // Rotate baseline prompts based on day of week / pulse history
  const recentFields = pulseHistory.slice(0, 3).map(p => p.prompt_type);
  const hasConfidenceRecent = recentFields.includes('confidence_today');

  if (!hasConfidenceRecent && Math.random() > 0.6) return PROMPTS.confidence_check;
  if (dayOfWeek % 2 === 0) return PROMPTS.clarity_check;
  return PROMPTS.baseline_energy;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const targetEmail = body.user_email || user.email;
    const forcePromptType = body.prompt_type || null; // allow explicit override
    const now = new Date();

    // 1. Load tone preference and anti-spam state
    const [tonePrefRows, recentPulses, recentActivity] = await Promise.all([
      base44.asServiceRole.entities.TonePreference.filter({ user_email: targetEmail }, '-updated_date', 1),
      base44.asServiceRole.entities.ManagerPulse.filter({ user_email: targetEmail }, '-created_date', 7),
      base44.asServiceRole.entities.UserActivity.filter({ user_email: targetEmail }, '-date', 3)
    ]);

    const tonePref = tonePrefRows[0] || null;

    // 2. Anti-spam gate (skip for explicit force calls from admin)
    const isForced = body.force === true;
    if (!isForced && !canSendPrompt(tonePref, now)) {
      return Response.json({
        sent: false,
        reason: 'Too soon since last prompt',
        next_eligible: tonePref?.last_prompt_sent_at
          ? new Date(new Date(tonePref.last_prompt_sent_at).getTime() + 12 * 3600000).toISOString()
          : null
      });
    }

    // 3. Compute risk score
    const riskScore = computeOperatorModeRisk(recentPulses, recentActivity);

    // 4. Select prompt
    const promptTemplate = forcePromptType && PROMPTS[forcePromptType]
      ? PROMPTS[forcePromptType]
      : selectPrompt(riskScore, tonePref, recentPulses);

    // 5. Upsert TonePreference and stamp last_prompt_sent_at
    if (tonePref?.id) {
      await base44.asServiceRole.entities.TonePreference.update(tonePref.id, {
        last_prompt_sent_at: now.toISOString()
      });
    } else {
      await base44.asServiceRole.entities.TonePreference.create({
        user_email: targetEmail,
        tone_mode: 'warm_candid',
        cadence_preference: 'every_other_day',
        last_prompt_sent_at: now.toISOString()
      });
    }

    // 6. Create an in-platform notification as the v1 delivery mechanism
    // (Teams Adaptive Card delivery replaces this in Phase 2)
    await base44.asServiceRole.entities.Notification.create({
      user_email: targetEmail,
      type: 'atreus_checkin',
      title: promptTemplate.title,
      message: promptTemplate.body,
      is_read: false,
      scheduled_for: now.toISOString(),
      metadata: {
        prompt_type: promptTemplate.prompt_type,
        options: promptTemplate.options,
        optional_text_placeholder: promptTemplate.optional_text,
        why_explanation: promptTemplate.why,
        operator_mode_risk_score: riskScore,
        field: promptTemplate.field
      }
    });

    return Response.json({
      sent: true,
      prompt_type: promptTemplate.prompt_type,
      title: promptTemplate.title,
      body: promptTemplate.body,
      options: promptTemplate.options,
      why: promptTemplate.why,
      optional_text: promptTemplate.optional_text,
      operator_mode_risk_score: riskScore,
      tone_mode: tonePref?.tone_mode || 'warm_candid'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});