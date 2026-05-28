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
    prompt_type: "contextual",
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

// ─── Morning intent prompt ────────────────────────────────────────────────────

const MORNING_INTENT_PROMPT = {
  title: "What's your intent for today?",
  body: "Before the day takes over — what's the one thing you actually want to protect time for or lead well today?",
  why: "Declared intentions help me understand when days match up and when they don't.",
  options: [
    { label: "Delegate something meaningful", value: "delegation" },
    { label: "Protect time for strategic work", value: "strategic_work" },
    { label: "Prioritise my team", value: "team_support" },
    { label: "Something personal / learning", value: "personal_development" },
  ],
  optional_text: "What specifically do you want to protect or do?",
  prompt_type: "morning_intent",
  field: "focus_category"
};

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

// ─── Select which prompt to send ─────────────────────────────────────────────

function selectPrompt(riskScore, pulseHistory) {
  // High risk → overload prompt
  if (riskScore >= 60) return PROMPTS.overload_overcontrol;

  // Friday → weekly reflection
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 5) return PROMPTS.weekly_reflection;

  // Monday / Tuesday morning → morning intent
  const hour = new Date().getHours();
  if ((dayOfWeek === 1 || dayOfWeek === 2) && hour < 11) return MORNING_INTENT_PROMPT;

  // Only look at system-sent pulse markers (not user responses) for rotation
  const recentSentTypes = pulseHistory
    .filter(p => p.source === 'system')
    .slice(0, 5)
    .map(p => p.prompt_type);

  const hasConfidenceRecent = recentSentTypes.includes('contextual');

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

    // 1. Load recent pulses for anti-spam and risk scoring
    // NOTE: TonePreference writes are silently failing at platform level.
    // Instead, derive anti-spam state from recent ManagerPulse records.
    const [recentPulses, recentActivity] = await Promise.all([
      base44.asServiceRole.entities.ManagerPulse.filter({ user_email: targetEmail }, '-created_date', 7),
      base44.asServiceRole.entities.UserActivity.filter({ user_email: targetEmail }, '-date', 3)
    ]);

    // Derive last prompt sent time from system-sourced pulses only
    // (source: 'system' = prompt was sent; other sources = user responses, don't count for anti-spam)
    const lastSystemPulse = recentPulses.find(p => p.source === 'system') || null;
    const lastPromptSentAt = lastSystemPulse?.created_date ? new Date(lastSystemPulse.created_date) : null;

    // 2. Anti-spam gate (skip for explicit force calls from admin)
    const isForced = body.force === true;
    if (!isForced && lastPromptSentAt) {
      const hoursSinceLast = (now - lastPromptSentAt) / 3600000;
      if (hoursSinceLast < 12) {
        return Response.json({
          sent: false,
          reason: 'Too soon since last prompt',
          next_eligible: new Date(lastPromptSentAt.getTime() + 12 * 3600000).toISOString()
        });
      }
    }

    // 3. Compute risk score
    const riskScore = computeOperatorModeRisk(recentPulses, recentActivity);

    // 4. Load tone preference
    const tonePrefs = await base44.asServiceRole.entities.TonePreference.filter(
      { user_email: targetEmail }, '-created_date', 1
    );
    const toneMode = tonePrefs[0]?.tone_mode || 'warm_candid';

    // 5. Select prompt (with tone override for morning_intent)
    const promptKey = forcePromptType || null;
    let promptTemplate;
    if (promptKey === 'morning_intent') {
      promptTemplate = MORNING_INTENT_PROMPT;
    } else if (promptKey && PROMPTS[promptKey]) {
      promptTemplate = PROMPTS[promptKey];
    } else {
      promptTemplate = selectPrompt(riskScore, recentPulses);
    }

    // 6. Apply tone via applyTone function
    let toneAdjusted = null;
    try {
      const toneResult = await base44.asServiceRole.functions.invoke('applyTone', {
        prompt_family: promptTemplate.prompt_type === 'morning_intent'
          ? 'morning_intent'
          : Object.keys(PROMPTS).find(k => PROMPTS[k] === promptTemplate) || 'baseline_energy',
        tone_mode: toneMode,
        risk_score: riskScore,
      });
      toneAdjusted = toneResult?.prompt || null;
    } catch (e) {
      console.warn('applyTone call failed, using default copy:', e.message);
    }

    const finalTitle = toneAdjusted?.title || promptTemplate.title;
    const finalBody = toneAdjusted?.body || promptTemplate.body;
    const finalWhy = toneAdjusted?.why || promptTemplate.why;
    const overridePreamble = toneAdjusted?.override_preamble || null;

    // 7. Write the "sent prompt" marker BEFORE returning — this is our anti-spam anchor.
    // Write first so that parallel/rapid calls hitting the gate see this marker.
    // Use today's date as an idempotency boundary: if a system record for today already exists
    // and we're not forced, that's a double-send we want to prevent.
    if (!isForced) {
      const todayStr = now.toISOString().split('T')[0];
      const todaySystemPulses = recentPulses.filter(p =>
        p.source === 'system' &&
        p.created_date &&
        p.created_date.toString().startsWith(todayStr)
      );
      if (todaySystemPulses.length > 0) {
        return Response.json({
          sent: false,
          reason: 'Already sent a prompt today',
          next_eligible: new Date(new Date(todaySystemPulses[0].created_date).getTime() + 12 * 3600000).toISOString()
        });
      }
    }

    await base44.asServiceRole.entities.ManagerPulse.create({
      user_email: targetEmail,
      source: 'system',
      prompt_type: promptTemplate.prompt_type,
      biggest_weight_today: null
    });

    return Response.json({
      sent: true,
      prompt_type: promptTemplate.prompt_type,
      title: finalTitle,
      body: finalBody,
      options: promptTemplate.options,
      why: finalWhy,
      optional_text: promptTemplate.optional_text,
      operator_mode_risk_score: riskScore,
      tone_mode: toneMode,
      override_preamble: overridePreamble,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});