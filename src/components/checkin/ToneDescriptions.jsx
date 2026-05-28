/**
 * ToneDescriptions — detailed explanations of each tone mode for onboarding.
 * Shown when users select their Atreus tone preference.
 */

export const TONE_DETAILS = {
  gentle_observant: {
    label: "Gentle and observant",
    subtitle: "Curious, light-touch support",
    description: "Atreus will mostly ask questions and reflect what it notices. It rarely points out patterns directly and focuses on understanding how you feel.",
    example: '"How settled do you feel today?" rather than "You\'re overwhelmed again."',
    when_good: "You prefer support that doesn't push, space to reflect at your own pace, and gentle curiosity over directness.",
    when_challenging: "If patterns compound or you find yourself avoiding conversations, the lack of directness might make it easier to gloss over important things."
  },
  warm_candid: {
    label: "Warm but candid",
    subtitle: "Supportive + pattern-pointing (Recommended)",
    description: "Atreus will be warm and supportive, but it will also point out patterns it sees — like repeated overload or delegation avoidance — in a straightforward way.",
    example: '"You keep saying delegation matters, but when load spikes your days stay reactive. What\'s holding that back?" — honest but caring.',
    when_good: "You want real feedback without corporate softness. You appreciate when someone you trust names what they see.",
    when_challenging: "None — this mode balances push and support well for most managers."
  },
  close_friend_candid: {
    label: "Close-friend candid",
    subtitle: "Peer-level honesty, no sugar-coating",
    description: "Atreus talks like a trusted peer who tells you what they really think. Direct, sometimes blunt, but grounded in genuine care and familiarity.",
    example: '"You\'re doing everyone\'s job again, aren\'t you?" — assumes shared history and doesn\'t soften the observation.',
    when_good: "You value honesty over politeness. You have the resilience to hear hard truths. You want Atreus to feel like a real peer.",
    when_challenging: "If you're already overwhelmed, the directness might feel like extra pressure rather than support. This mode works best when you're in a place to hear it."
  },
  respectfully_confronting: {
    label: "Respectfully confronting",
    subtitle: "Direct challenge with accountability",
    description: "Atreus will challenge you directly when you're stuck in patterns, with genuine respect. It assumes you're capable of change and won't let you off the hook.",
    example: '"You said you\'d delegate today but ended up in 8 meetings instead. What\'s actually getting in the way?" — names the gap, assumes it matters.',
    when_good: "You're working on a specific pattern and want real accountability. You have the resilience for direct feedback and prefer it.",
    when_challenging: "This is the most demanding mode. Use it when you're ready to confront something specific, not as your default."
  }
};

export const TONE_PREVIEW = {
  gentle_observant: {
    title: "How are you doing today — honestly?",
    preview: "I'm just checking in. No pressure to have a neat answer."
  },
  warm_candid: {
    title: "How's today really feel?",
    preview: "Before the day runs away from you — how much room do you actually have?"
  },
  close_friend_candid: {
    title: "Real talk — how are you actually doing?",
    preview: "Not the answer you'd give in a standup. How does today actually feel?"
  },
  respectfully_confronting: {
    title: "Before you say 'fine' — how is today really?",
    preview: "I want an honest read. How much capacity do you genuinely have?"
  }
};