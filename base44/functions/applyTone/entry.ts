/**
 * applyTone — tone transformation engine for all Curiosity Led prompt surfaces.
 *
 * Transforms prompt copy by tone mode across all v1 prompt families.
 * Called by sendTeamsPrompt and any in-platform prompt surface.
 *
 * Supported modes:
 *   gentle_observant    — soft, curious, non-pushing
 *   warm_candid         — direct but warm (DEFAULT)
 *   close_friend_candid — peer-level honesty
 *   respectfully_confronting — direct challenge, still caring
 *
 * High-risk override: if risk_score >= 75 and tone is gentle_observant,
 * apply warm_candid floor + prepend override sentence.
 *
 * Absolute constraints (all modes):
 *   - No diagnostic labels (burnout, struggling, overwhelmed, anxious)
 *   - No trait-based identity framing
 *   - No meeting title or attendee references
 *   - No speculation beyond signals + user input
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Tone variants per prompt family ─────────────────────────────────────────

const TONE_VARIANTS = {
  baseline_energy: {
    gentle_observant: {
      title: "How are you doing today — honestly?",
      body: "I'm just checking in. No pressure to have a neat answer. How much space do you feel like you have right now?",
      why: "I'm just curious how today feels from the inside — not what your calendar says.",
    },
    warm_candid: {
      title: "How's today really feel?",
      body: "Before the day runs away from you — how much room do you actually have right now?",
      why: "I'm trying to understand how loaded your days feel over time, not just what's on your calendar.",
    },
    close_friend_candid: {
      title: "Real talk — how are you actually doing?",
      body: "Not the answer you'd give in a standup. How does today actually feel from where you're sitting?",
      why: "You know I'm asking because I track these patterns, and it matters.",
    },
    respectfully_confronting: {
      title: "Before you say 'fine' — how is today really?",
      body: "I want an honest read, not a polished one. How much capacity do you genuinely have right now?",
      why: "You've said things were fine before when they weren't. I'd rather know now.",
    },
  },
  clarity_check: {
    gentle_observant: {
      title: "Just checking — how clear does today feel?",
      body: "Some days feel focused, some feel scattered. Where are you landing today?",
      why: "Understanding your clarity day to day helps me offer support at the right moments.",
    },
    warm_candid: {
      title: "Clear, stretched, or already behind?",
      body: "When you look at today, which of these feels closest to where you actually are?",
      why: "I'm watching for stretches where you keep feeling 'behind' before the day even starts.",
    },
    close_friend_candid: {
      title: "Where's your head at today?",
      body: "Clear, running to catch up, or already underwater? No judgment — just want to know.",
      why: "You know I track this — and those 'already behind' runs matter.",
    },
    respectfully_confronting: {
      title: "Behind again, or genuinely clear today?",
      body: "I want to know honestly — are you clear or are you in catch-up mode before you've even started?",
      why: "The pattern of starting days already behind is worth naming if it keeps happening.",
    },
  },
  confidence_check: {
    gentle_observant: {
      title: "How settled do you feel today?",
      body: "Not about performance — just your sense of steadiness as a leader right now.",
      why: "I'm curious about how you feel, not how you're performing.",
    },
    warm_candid: {
      title: "How steady are you feeling today?",
      body: "Not 'are you doing your job' — just, how settled do you feel in yourself as a leader right now?",
      why: "Confidence ebbs and flows. Checking in helps me support you at the right moments.",
    },
    close_friend_candid: {
      title: "Feeling solid or a bit wobbly today?",
      body: "Leader hat off — how are you actually feeling about yourself today? Confident, unsure, or somewhere in between?",
      why: "You don't have to perform 'fine' for me. I track this so I can be useful.",
    },
    respectfully_confronting: {
      title: "Are you feeling as confident as you're acting?",
      body: "Sometimes the two don't match. Where are you honestly landing today on your own sense of steadiness?",
      why: "I'm asking because the gap between projected and felt confidence matters for how you lead.",
    },
  },
  overload_overcontrol: {
    gentle_observant: {
      title: "Are you taking on more than you need to?",
      body: "Your week looks quite full. I'm curious — has anything drifted onto your plate that maybe doesn't need to be there?",
      why: "Heavy weeks sometimes pull us into doing more ourselves. I'm just noticing and checking in.",
    },
    warm_candid: {
      title: "Are you in 'I'll just do it' mode again?",
      body: "This week looks heavy. When your days stack up like this, it's easy to start grabbing more work yourself instead of letting your team carry it.",
      why: "I can see your calendar is packed and some longer-term goals haven't moved much. That mix is exactly when you end up carrying more than you planned.",
    },
    close_friend_candid: {
      title: "You're doing everyone's job again, aren't you?",
      body: "Heavy calendar, goals stalled. You know what that means. Are you in the doing-it-all mode or catching it before it spirals?",
      why: "You know this pattern. I'm just making sure you do too.",
    },
    respectfully_confronting: {
      title: "This is the load-and-overcontrol pattern — are you seeing it?",
      body: "Your week is packed, your goals have stalled, and I'd bet you've taken on more than you passed down. Am I wrong?",
      why: "I'm naming it directly because that's what you asked me to do when things build up.",
    },
  },
  weekly_reflection: {
    gentle_observant: {
      title: "How did this week sit with you?",
      body: "Not the outcomes — how did it feel to lead this week? Anything you're glad about or wish had gone differently?",
      why: "Even a small pause at the end of the week tends to make the next one a little cleaner.",
    },
    warm_candid: {
      title: "How did this week actually go?",
      body: "Not the output — the experience of it. Did you lead the way you wanted to this week?",
      why: "Weekly reflection is one of the most reliable ways to build self-awareness over time.",
    },
    close_friend_candid: {
      title: "Honest review — how was your week, really?",
      body: "Not the version you'd put in a status update. Did you actually lead the way you wanted to, or were you just surviving?",
      why: "You know I'll remember what you say here.",
    },
    respectfully_confronting: {
      title: "Did you lead this week or just get through it?",
      body: "Be honest. There's a difference between leading well and managing to the end of the week. Which was this?",
      why: "This question matters because the gap between the two tends to compound.",
    },
  },
  morning_intent: {
    gentle_observant: {
      title: "What kind of leader do you want to be today?",
      body: "No pressure — just a small intention. If today could go well in one way that actually matters to you, what would that be?",
      why: "Starting with an intention — even a tiny one — tends to shift how the day unfolds.",
    },
    warm_candid: {
      title: "What's your intent for today?",
      body: "Before the day takes over — what's the one thing you actually want to protect time for or lead well today?",
      why: "Declared intentions help me understand when days match up and when they don't.",
    },
    close_friend_candid: {
      title: "What are you trying to actually do today?",
      body: "Not the to-do list — what's the thing you want to be intentional about today as a leader?",
      why: "I track these so we can see what actually happens vs what you planned.",
    },
    respectfully_confronting: {
      title: "Name it: what's your actual intention today?",
      body: "What specifically are you going to lead well today — not just get done? One thing.",
      why: "Intentions only mean something if they're specific. I'm going to check how it went.",
    },
  },
  follow_up: {
    gentle_observant: {
      title: "How did your day end up going?",
      body: "You said you wanted to focus on {intent} today. How did that go — did it happen, or did things pull you elsewhere?",
      why: "I'm curious, not checking up. Understanding the gap helps me support you better.",
    },
    warm_candid: {
      title: "How did your intention for today land?",
      body: "You wanted to focus on {intent} today — but it looks like your day went differently. What got in the way?",
      why: "This isn't about falling short. It's about understanding what pulls you off course so we can work with it.",
    },
    close_friend_candid: {
      title: "So — did {intent} actually happen today?",
      body: "Looking at how your day unfolded, it doesn't quite match what you said you wanted. What happened?",
      why: "I'm not going to pretend I didn't notice. What got in the way?",
    },
    respectfully_confronting: {
      title: "Your intention was {intent}. Let's be honest about how it went.",
      body: "From what I can see, today looked quite different from what you planned. I'd rather name that than gloss over it. What happened?",
      why: "This pattern — setting an intention and then letting the day override it — is worth examining.",
    },
  },
};

// ─── Gap explanation templates ─────────────────────────────────────────────────

const GAP_EXPLANATIONS = {
  declared_delegation_operator_mode_detected: {
    intent_label: 'delegation',
    gap_description: 'your day looked quite reactive — heavy meetings and stalled strategic goals are often signs of an overloaded manager absorbing rather than delegating.',
  },
  declared_strategic_tactical_overload_detected: {
    intent_label: 'strategic work',
    gap_description: 'your calendar suggests the day was dominated by back-to-back meetings, leaving little room for the focused work you intended.',
  },
  declared_team_support_low_1on1_detected: {
    intent_label: 'team support',
    gap_description: 'it looks like it\'s been a while since your last 1:1 — the team connection you intended may not have had the space it needed.',
  },
};

// ─── Core apply function ────────────────────────────────────────────────────────

function applyToneToPrompt(promptFamily, toneMode, riskScore = 0, context = {}) {
  const validTones = ['gentle_observant', 'warm_candid', 'close_friend_candid', 'respectfully_confronting'];

  // High-risk override: gentle_observant → warm_candid floor at risk >= 75
  let effectiveTone = validTones.includes(toneMode) ? toneMode : 'warm_candid';
  const overrideApplied = effectiveTone === 'gentle_observant' && riskScore >= 75;
  if (overrideApplied) effectiveTone = 'warm_candid';

  const family = TONE_VARIANTS[promptFamily];
  if (!family) return null;

  const variant = family[effectiveTone] || family['warm_candid'];

  let result = { ...variant, tone_mode: effectiveTone, override_applied: overrideApplied };

  // Apply intent substitution for follow-up prompts
  if (context.intent_label) {
    result.title = result.title.replace('{intent}', context.intent_label);
    result.body = result.body.replace('{intent}', context.intent_label);
  }

  // For gap follow-ups, add gap context
  if (context.gap_code && GAP_EXPLANATIONS[context.gap_code]) {
    const gapInfo = GAP_EXPLANATIONS[context.gap_code];
    result.gap_description = gapInfo.gap_description;
    result.intent_label = gapInfo.intent_label;
    result.title = result.title.replace('{intent}', gapInfo.intent_label);
    result.body = result.body.replace('{intent}', gapInfo.intent_label);
  }

  // Override preamble
  if (overrideApplied) {
    result.override_preamble = "I'm going to be a little more direct than usual right now — not to alarm you, but because I think this moment deserves it.";
  }

  return result;
}

// ─── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      prompt_family,
      tone_mode = 'warm_candid',
      risk_score = 0,
      context: ctx = {}
    } = body;

    if (!prompt_family) {
      return Response.json({ error: 'prompt_family is required' }, { status: 400 });
    }

    const result = applyToneToPrompt(prompt_family, tone_mode, risk_score, ctx);

    if (!result) {
      return Response.json({ error: `Unknown prompt family: ${prompt_family}` }, { status: 400 });
    }

    return Response.json({ success: true, prompt: result });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});