/**
 * sendTeamsPrompt — the single orchestrator for all manager check-in prompts.
 *
 * All triggers (scheduled, contextual, entity-based) must route through here.
 * Handles: anti-spam, cadence preferences, prompt selection, tone application,
 * Teams card delivery, and memory updates.
 *
 * Sprint 3: applyTone() is now LIVE across all 5 prompt templates.
 * Tone is read from TonePreference and applied to all prompt copy.
 * High-risk override: if risk >= 75 and tone is gentle_observant,
 * system applies warm_candid floor with explicit explanation.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Tone-aware prompt templates ──────────────────────────────────────────────

const PROMPTS = {

  baseline_energy: {
    prompt_type: 'baseline_energy',
    field: 'room_today',
    options: [
      { label: "No room at all", value: "none" },
      { label: "Pretty tight", value: "tight" },
      { label: "Enough to breathe", value: "some" },
      { label: "Lots of space", value: "plenty" }
    ],
    optional_text: "What's weighing on you most, if anything?",
    by_tone: {
      gentle_observant: {
        title: "How are you doing today?",
        body: "Just a quick check — no pressure at all. How much room do you have right now?",
        why: "I check in regularly to get a sense of how your days feel over time.",
      },
      warm_candid: {
        title: "How's today really feel?",
        body: "Before the day runs away from you — how much room do you actually have right now?",
        why: "I'm trying to understand how loaded your days feel over time, not just what's on your calendar. That helps me spot when you're at risk of carrying too much yourself.",
      },
      close_friend_candid: {
        title: "Honestly — how loaded are you right now?",
        body: "Before the day kicks off — real talk, how much space do you actually have?",
        why: "I want to get a feel for what your days actually feel like, not just what's on paper.",
      },
      respectfully_confronting: {
        title: "Let's be honest before the day gets going.",
        body: "How much space do you actually have right now — and is that level sustainable over time?",
        why: "I think it's worth naming when capacity is being stretched, before it compounds.",
      },
    }
  },

  clarity_check: {
    prompt_type: 'baseline_energy',
    field: 'energy_level',
    options: [
      { label: "I feel clear", value: "steady" },
      { label: "I feel stretched", value: "stretched" },
      { label: "Already behind", value: "drained" }
    ],
    optional_text: "What's making it feel that way?",
    by_tone: {
      gentle_observant: {
        title: "How's today feeling so far?",
        body: "When you look at your day ahead, which of these feels closest to where you are?",
        why: "I'm just checking in — understanding how days feel over time helps me support you better.",
      },
      warm_candid: {
        title: "Clear, stretched, or already behind?",
        body: "When you look at today, which of these feels closest to where you actually are?",
        why: "I'm watching for stretches where you keep feeling 'behind' before the day even starts. Those are often the weeks where leadership takes the biggest hit.",
      },
      close_friend_candid: {
        title: "Okay, where are you actually at right now?",
        body: "Not the official answer — where does today feel like it's heading from where you're standing?",
        why: "I'd rather know the real picture than assume everything's fine.",
      },
      respectfully_confronting: {
        title: "Where are you actually starting from today?",
        body: "Clear, stretched, or already behind — be honest with yourself here.",
        why: "Naming where you're starting from is the first step to leading from choice instead of reaction.",
      },
    }
  },

  confidence_check: {
    prompt_type: 'contextual',
    field: 'confidence_today',
    options: [
      { label: "Solid", value: "high" },
      { label: "Okay, mostly", value: "steady" },
      { label: "A bit shaky", value: "uncertain" },
      { label: "Not great", value: "low" }
    ],
    optional_text: "What's shaking it, if anything?",
    by_tone: {
      gentle_observant: {
        title: "How steady are you feeling today?",
        body: "Not about performance — just, how settled do you feel in yourself right now?",
        why: "Checking in on confidence helps me understand what support might be useful.",
      },
      warm_candid: {
        title: "How steady are you feeling today?",
        body: "Not 'are you doing your job' — just, how settled do you feel in yourself as a leader right now?",
        why: "Confidence ebbs and flows, and I've noticed yours tends to dip when things pile up. Checking in helps me support you at the right moments.",
      },
      close_friend_candid: {
        title: "How are you actually feeling about yourself as a leader right now?",
        body: "Forget the surface stuff — are you feeling solid, or is something quietly wobbling?",
        why: "I care about how you're really doing, not just the public-facing version.",
      },
      respectfully_confronting: {
        title: "How solid is your confidence right now — really?",
        body: "Not what you'd tell your team. What's actually true for you as a leader today?",
        why: "Confidence in leadership is worth examining honestly, not just managing the appearance of it.",
      },
    }
  },

  overload_overcontrol: {
    prompt_type: 'overload_check',
    field: 'operator_mode_response',
    options: [
      { label: "Very much", value: "very_much" },
      { label: "Somewhat", value: "somewhat" },
      { label: "Not really", value: "not_really" },
      { label: "Skip for now", value: "skipped" }
    ],
    optional_text: "What are you holding that probably shouldn't all sit with you?",
    by_tone: {
      gentle_observant: {
        title: "It looks like things have been quite full this week.",
        body: "I just wanted to check in — are you finding ways to share the load, or has more been landing on you than planned?",
        why: "When weeks get dense, it can be easy to absorb more than necessary. I'm just checking in.",
      },
      warm_candid: {
        title: "Are you in 'I'll just do it' mode again?",
        body: "This week looks heavy. When your days stack up like this, it's easy to start grabbing more work yourself instead of letting your team carry it.",
        why: "I can see your calendar is packed and some longer-term goals haven't moved much. In the past, that mix is exactly when you end up carrying more than you planned.",
      },
      close_friend_candid: {
        title: "Okay — are you doing the thing again?",
        body: "Are you absorbing everything yourself because it feels faster? Because your week looks a lot like that from the outside.",
        why: "I'd rather ask this now than watch it compound for another week.",
      },
      respectfully_confronting: {
        title: "I want to name something directly.",
        body: "Your calendar is packed and your team's goals haven't moved. That pattern usually means you're doing too much yourself. Is that what's happening?",
        why: "I think this is worth naming clearly, because the cost of staying in operator mode compounds over time.",
      },
    }
  },

  weekly_reflection: {
    prompt_type: 'weekly_reflection',
    field: 'energy_level',
    options: [
      { label: "Mostly yes", value: "strong" },
      { label: "Mixed", value: "steady" },
      { label: "Mostly in survival mode", value: "stretched" },
      { label: "Not at all", value: "drained" }
    ],
    optional_text: "What one thing would you do differently?",
    by_tone: {
      gentle_observant: {
        title: "How did this week feel for you?",
        body: "Not what you got done — just how it felt to be in it.",
        why: "A quick reflection at the end of each week helps build self-awareness over time.",
      },
      warm_candid: {
        title: "How did this week actually go?",
        body: "Not the output — the experience of it. Did you lead the way you wanted to this week?",
        why: "Weekly reflection is one of the most reliable ways to build self-awareness over time. Even a quick honest answer here is useful.",
      },
      close_friend_candid: {
        title: "Okay, week's almost done.",
        body: "Forget the deliverables — did this week feel like you, or did you spend it just holding things together?",
        why: "I want to hear how it actually felt, not the polished version.",
      },
      respectfully_confronting: {
        title: "Before you close the week out:",
        body: "Did you lead this week, or did this week lead you? I want an honest answer.",
        why: "This question matters because the pattern of how you experience your weeks says more than any single metric.",
      },
    }
  },

  morning_intent: {
    prompt_type: 'morning_intent',
    field: 'focus_category',
    options: [
      { label: "Delegation — getting things off my plate", value: "delegation" },
      { label: "Strategic work — things that move longer-term goals", value: "strategic_work" },
      { label: "Team support — being present for my people", value: "team_support" },
      { label: "Personal development — learning or reflecting", value: "personal_development" },
      { label: "Other", value: "other" }
    ],
    optional_text: "What specifically? (e.g., 'hand off Q2 reporting to Sam')",
    by_tone: {
      gentle_observant: {
        title: "What would you like to focus on today?",
        body: "Not the biggest task — just, if you could choose one leadership behaviour to show up with today, what would it be?",
        why: "Starting the day with a clear intention often makes a real difference to how it unfolds.",
      },
      warm_candid: {
        title: "What's your main focus today?",
        body: "Not the biggest task — the leadership behaviour you most want to show up with today.",
        why: "Naming your intention in the morning makes it easier for me to check in meaningfully at the end of the day.",
      },
      close_friend_candid: {
        title: "What are you going for today?",
        body: "If today went well, what would that have looked like? What's the one thing you most want to actually do?",
        why: "I'll check back in later and we can see how it actually went.",
      },
      respectfully_confronting: {
        title: "What's your intention for today — and will you actually do it?",
        body: "Name the leadership behaviour you most want to show up with. I'll hold you to it.",
        why: "Declared intentions without follow-through is a pattern worth catching early.",
      },
    }
  },

  evening_followup_delegation: {
    prompt_type: 'follow_up',
    field: 'energy_level',
    options: [
      { label: "Something came up that I had to handle myself", value: "stretched" },
      { label: "I handed things off but ended up pulled back in", value: "steady" },
      { label: "The day just got away from me", value: "drained" },
      { label: "It was actually fine — goals moved, I just can't see it here", value: "strong" }
    ],
    optional_text: "What specifically derailed it?",
    by_tone: {
      gentle_observant: {
        title: "You said today was about delegation.",
        body: "It looks like today ended up being pretty full. Did things go the way you planned, or did it shift?",
        why: "No pressure — I'm just curious what actually happened.",
      },
      warm_candid: {
        title: "You said today was about delegation.",
        body: "Your day looked different — your calendar was packed and your longer-term goals haven't moved. That's not a criticism. It just happened. What got in the way?",
        why: "I check this so we can understand the pattern together, not to keep score.",
      },
      close_friend_candid: {
        title: "Okay — you said delegation was the focus.",
        body: "Your day looked like operator mode. What happened? I'm not judging — I just want to understand what got in the way.",
        why: "This is how we figure out what actually needs to change.",
      },
      respectfully_confronting: {
        title: "This morning you said today was about delegation.",
        body: "Your calendar and your goals are telling a different story. What specifically derailed it — and is this becoming a pattern worth addressing?",
        why: "The gap between stated intention and actual behaviour is exactly where the most useful coaching happens.",
      },
    }
  },

};

// ─── Follow-up messages ───────────────────────────────────────────────────────

const OVERLOAD_FOLLOWUPS = {
  very_much: "Okay — let's take some weight off. Want help picking one thing to hand off or say no to before tomorrow?",
  somewhat: "You're catching it early. We could turn one task into a small delegation experiment this week if you want.",
  not_really: "Good. If that changes, just say 'I'm sliding into doing it all again' and we'll sort it out.",
  skipped: null
};

// ─── Tone application ─────────────────────────────────────────────────────────

function applyTone(promptTemplate, toneMode, riskScore = 0) {
  const effectiveTone = (toneMode === 'gentle_observant' && riskScore >= 75)
    ? 'warm_candid'
    : toneMode;

  const toned = promptTemplate.by_tone?.[effectiveTone] || promptTemplate.by_tone?.warm_candid;
  const overridePrefix = (toneMode === 'gentle_observant' && riskScore >= 75)
    ? "I'm going to be a little more direct than usual right now — not to alarm you, but because I think this moment deserves it.\n\n"
    : '';

  return {
    ...promptTemplate,
    title: toned.title,
    body: overridePrefix + toned.body,
    why: toned.why,
    effective_tone: effectiveTone,
    tone_override_applied: toneMode === 'gentle_observant' && riskScore >= 75,
  };
}

// ─── Risk scoring ─────────────────────────────────────────────────────────────

function computeOperatorModeRisk(recentPulses, recentActivity) {
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
    if (today.meeting_minutes_day > 300) score += 15;
    else if (today.meeting_minutes_day > 210) score += 8;
    if (today.back_to_back_density > 0.6) score += 10;
    else if (today.back_to_back_density > 0.4) score += 5;
    if (today.late_day_load_minutes > 60) score += 10;
    if (today.stalled_strategic_goals > 1) score += 15;
    else if (today.stalled_strategic_goals === 1) score += 8;
    if (today.learning_inertia_days > 7) score += 10;
    else if (today.learning_inertia_days > 3) score += 5;
    if (today.overdue_goals_count > 0) score += 8;
  }

  return Math.min(score, 100);
}

// ─── "Why this?" explanation map ─────────────────────────────────────────────

function buildWhyThisExplanation(riskScore, todayActivity) {
  if (!todayActivity) return null;

  const meetingHeavy = (todayActivity.meeting_minutes_day || 0) > 300;
  const meetingMedium = (todayActivity.meeting_minutes_day || 0) > 210;
  const stalledGoals = (todayActivity.stalled_strategic_goals || 0) >= 1;
  const overdueGoals = (todayActivity.overdue_goals_count || 0) > 0;
  const longSince1on1 = (todayActivity.days_since_last_1on1 || 0) > 10;

  if (meetingHeavy && stalledGoals) {
    return "I noticed your calendar has been heavy and some of your longer-term goals haven't had much movement lately. That combination is exactly when it gets easy to start doing everything yourself.";
  }
  if (overdueGoals) {
    return "One or more of your goals has passed its deadline. I wanted to check in rather than just let it slide.";
  }
  if (longSince1on1) {
    return "It's been a while since your last 1-on-1. I wanted to check in — sometimes that's intentional, and sometimes it's a sign things are getting compressed.";
  }
  if (riskScore >= 60) {
    return "A few things I've been watching — your calendar load, how your goals are moving, and what you've told me lately — are pointing in the same direction. I think this is worth a moment.";
  }
  if (meetingMedium) {
    return "Your calendar today has been particularly full. I wanted to check in on how you're actually holding up.";
  }
  return "I check in regularly to understand how your days feel over time — not just what's on your calendar, but what it's actually like to be in it.";
}

// ─── Prompt selection with priority stack ────────────────────────────────────

function selectPrompt(riskScore, pulseHistory, body) {
  const dayOfWeek = new Date().getDay();

  // Explicit override from caller (e.g. computeEveningActuals triggering follow_up)
  if (body?.prompt_type) {
    // Evening follow-up for delegation gap
    if (body.prompt_type === 'follow_up' && body.morning_intent === 'delegation') {
      return PROMPTS.evening_followup_delegation;
    }
    if (PROMPTS[body.prompt_type]) return PROMPTS[body.prompt_type];
  }

  // Morning intent — if it's before 10am and no intent sent today
  const hour = new Date().getHours();
  const todayStr = new Date().toISOString().split('T')[0];
  const hasTodayIntent = pulseHistory.some(p =>
    p.prompt_type === 'morning_intent' && p.created_date?.toString().startsWith(todayStr)
  );
  if (hour < 10 && !hasTodayIntent) return PROMPTS.morning_intent;

  // Priority 1: Safety/wellbeing (sustained high risk)
  if (riskScore >= 75) return PROMPTS.overload_overcontrol;

  // Priority 2: Contextual — high risk
  if (riskScore >= 60) return PROMPTS.overload_overcontrol;

  // Priority 3: Scheduled rhythm — Friday reflection
  if (dayOfWeek === 5) return PROMPTS.weekly_reflection;

  // Priority 4: Rotation with exclusion windows
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
    const now = new Date();

    // 1. Load recent data in parallel
    const [recentPulses, recentActivity, tonePrefs] = await Promise.all([
      base44.asServiceRole.entities.ManagerPulse.filter({ user_email: targetEmail }, '-created_date', 10),
      base44.asServiceRole.entities.UserActivity.filter({ user_email: targetEmail }, '-date', 3),
      base44.asServiceRole.entities.TonePreference.filter({ user_email: targetEmail }, '-created_date', 1),
    ]);

    const toneMode = tonePrefs[0]?.tone_mode || 'warm_candid';
    const cadence = tonePrefs[0]?.cadence_preference || 'every_other_day';

    // 2. Respect cadence pause
    if (cadence === 'paused' && !body.force) {
      return Response.json({ sent: false, reason: 'cadence_paused' });
    }

    // 3. Anti-spam gate
    const isForced = body.force === true;
    if (!isForced) {
      const lastSystemPulse = recentPulses.find(p => p.source === 'system');
      if (lastSystemPulse?.created_date) {
        const hoursSinceLast = (now - new Date(lastSystemPulse.created_date)) / 3600000;
        if (hoursSinceLast < 12) {
          return Response.json({
            sent: false,
            reason: 'Too soon since last prompt',
            next_eligible: new Date(new Date(lastSystemPulse.created_date).getTime() + 12 * 3600000).toISOString()
          });
        }
      }

      // Same-day idempotency
      const todayStr = now.toISOString().split('T')[0];
      const todaySystemPulses = recentPulses.filter(p =>
        p.source === 'system' && p.created_date?.toString().startsWith(todayStr)
      );
      // Allow morning intent + one other per day, but not two identical types
      const todayTypes = todaySystemPulses.map(p => p.prompt_type);
      const selectedType = body.prompt_type || 'auto';
      if (todayTypes.includes(selectedType) && selectedType !== 'auto' && selectedType !== 'morning_intent') {
        return Response.json({ sent: false, reason: 'Already sent this prompt type today' });
      }
    }

    // 4. Compute risk score
    const riskScore = computeOperatorModeRisk(recentPulses, recentActivity);

    // 5. Select and apply tone
    const promptTemplate = selectPrompt(riskScore, recentPulses, body);
    const tonedPrompt = applyTone(promptTemplate, toneMode, riskScore);

    // 6. Build "why this" explanation
    const whyThis = buildWhyThisExplanation(riskScore, recentActivity[0]);

    // 7. Write the sent marker
    await base44.asServiceRole.entities.ManagerPulse.create({
      user_email: targetEmail,
      source: 'system',
      prompt_type: tonedPrompt.prompt_type,
      biggest_weight_today: null,
    });

    return Response.json({
      sent: true,
      prompt_type: tonedPrompt.prompt_type,
      title: tonedPrompt.title,
      body: tonedPrompt.body,
      why: tonedPrompt.why,
      why_this: whyThis,
      options: tonedPrompt.options,
      optional_text: tonedPrompt.optional_text,
      operator_mode_risk_score: riskScore,
      tone_mode: toneMode,
      effective_tone: tonedPrompt.effective_tone,
      tone_override_applied: tonedPrompt.tone_override_applied || false,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});