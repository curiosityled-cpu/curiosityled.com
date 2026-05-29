/**
 * SituationalIntelligenceWeaver
 * 
 * Weaves SI context into pattern narratives instead of treating it as separate metric
 * Used by generateEnhancedPatternNarrative to add contextual depth
 */

/**
 * Enrich narrative with SI context
 * Transforms: "You're overloading" 
 * Into: "When decisions come fast (like this week), you tend to grab more yourself"
 */
export function weaveSIContext(baseNarrative, siScore, contextualEvents) {
  if (!contextualEvents || contextualEvents.length === 0) {
    return baseNarrative;
  }

  // Map SI score to contextual language
  const siPhrases = {
    high: "when ambiguity is high and decisions come fast",
    medium: "when you're navigating uncertainty",
    low: "even when things are fairly clear",
  };

  const siLevel = siScore > 75 ? 'high' : siScore > 50 ? 'medium' : 'low';
  const contextPhrase = siPhrases[siLevel];

  // Example: "You're overloading" becomes "You're overloading, especially when decisions come fast"
  if (baseNarrative && contextPhrase) {
    return `${baseNarrative}, ${contextPhrase}.`;
  }

  return baseNarrative;
}

/**
 * Build SI-aware intervention suggestion
 * Instead of "Delegate more" → "When decisions stack up (like this week), you tend to grab more. That's when you need to delegate hardest."
 */
export function buildSIAwareIntervention(interventionType, siScore, pastBehavior) {
  const baseInterventions = {
    delegation: "Hand off more work",
    strategic_focus: "Protect time for strategic thinking",
    recovery: "Build in recovery time",
  };

  const base = baseInterventions[interventionType];
  if (!base || siScore < 50) {
    return base;
  }

  const siContext = {
    delegation: ", especially when decisions are coming fast — that's when you revert to control.",
    strategic_focus: ", especially when new information keeps arriving. That's when clarity matters most.",
    recovery: ", especially after high-ambiguity periods. That's when you need to reset.",
  };

  return base + (siContext[interventionType] || "");
}

/**
 * SI-aware pattern summary
 * Provides SI-contextualized interpretation of trends
 */
export function generateSIContextualSummary(trends, siMetrics) {
  if (!siMetrics || siMetrics.situational_intelligence_score < 50) {
    return null;
  }

  const summaries = {
    high: {
      overload: "You handle complex decisions well, but when ambiguity is high, you tend to take on more yourself.",
      recovery: "High SI means you can read situations well, but recovery is harder after ambiguous periods.",
      confidence: "You're good at reading situations, but that also means you notice problems others miss — which affects confidence.",
    },
  };

  if (siMetrics.situational_intelligence_score > 75 && trends.overload_pattern_strength > 60) {
    return summaries.high.overload;
  }

  return null;
}