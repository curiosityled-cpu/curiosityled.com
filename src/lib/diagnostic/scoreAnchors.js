// Curiosity Led Leadership Reboot Diagnostic
// Score interpretation anchors: plain-language definitions, 0/100 anchors,
// "what stronger looks like", band ranges, and the how-to-read explainer.
// Single source of truth consumed by both the results page and the PDF.

export const HOW_TO_READ = [
  "Scores are shown on a 0\u2013100 scale for ease of interpretation.",
  "They are based on how your answers map to five dimensions of leadership support effectiveness.",
  "Lower scores do not mean failure; they point to where your current system is most likely creating friction or delay.",
  "These are criterion-based scores, not industry benchmarks. They describe your current operating pattern against a defined leadership support maturity model.",
];

export const CRITERION_NOTE =
  "This score is criterion-based, not benchmark-based. It reflects how your answers map to a defined leadership support maturity model \u2014 not a comparison to industry peers.";

// Band ranges align with the existing scoring thresholds (>=75 strong, >=50 mixed).
export const BAND_RANGES = [
  { min: 0, max: 49, label: "Reactive / weak foundation", key: "weak" },
  { min: 50, max: 74, label: "In transition / uneven", key: "mixed" },
  { min: 75, max: 100, label: "More established / usable foundation", key: "strong" },
];

export const OVERALL_ANCHOR = {
  measures:
    "How well your current leadership support system identifies needs early, delivers support in a usable way, reduces manual burden, and explains progress clearly.",
  high:
    "Support is timely, connected to daily work, manageable to run, and easier to explain and defend.",
  low:
    "Support is highly reactive, fragmented, heavily manual, and hard to connect to outcomes.",
};

export const CONSTRUCT_ANCHORS = {
  signal_delay: {
    measures:
      "How early leadership needs are spotted before they become visible problems.",
    high:
      "Leadership needs are spotted earlier \u2014 especially for newly promoted or newly hired managers \u2014 before team impact becomes obvious.",
    low:
      "Concerns become visible only after performance, engagement, or retention is already affected.",
    stronger:
      "Leadership needs are spotted earlier, especially for newly promoted or newly hired managers, before team impact becomes obvious.",
  },
  support_friction: {
    measures:
      "Whether managers can use support in the flow of work without it feeling like an extra program.",
    high:
      "Managers access relevant support inside their work without feeling like they are taking on another program.",
    low:
      "Support arrives late, generically, or outside the flow of work and feels like added load.",
    stronger:
      "Managers can access relevant support in the flow of work without feeling like they are taking on an extra program.",
  },
  proof_defensibility: {
    measures:
      "Whether leadership can clearly explain what support is delivered, why, and what is improving.",
    high:
      "Leadership can explain what support is being delivered, why, and what appears to be improving.",
    low:
      "Activity is hard to connect to outcomes, making investment harder to justify.",
    stronger:
      "Leadership can explain what support is being delivered, why, and what appears to be improving.",
  },
  fragmentation_admin: {
    measures:
      "How much manual coordination, stitching, and follow-up the system requires to keep moving.",
    high:
      "HR / Talent spends less time stitching updates and more time improving support quality.",
    low:
      "Information is spread across tools, updates are chased, and reporting requires heavy manual stitching.",
    stronger:
      "HR / Talent spends less time stitching updates and more time improving support quality.",
  },
  cost_of_inaction: {
    measures:
      "How clearly the cost of delayed or fragmented support is understood and acted on.",
    high:
      "The organization can see clearly where delay is driving avoidable readiness, performance, or retention risk.",
    low:
      "The cost of the current approach stays hidden and keeps losing to more visible priorities.",
    stronger:
      "The organization can see clearly where delay is driving avoidable readiness, performance, or retention risk.",
  },
};

export const DERIVED_ANCHORS = {
  manager_engagement_risk: {
    measures:
      "Whether managers experience support as relief or as an additional burden.",
    high:
      "Managers experience support as relevant and usable, not as another requirement.",
    low:
      "Support adds load, arrives outside work, or requires too much self-navigation.",
    stronger:
      "Managers experience support as relevant and usable, not as another requirement.",
  },
  leadership_story_coherence: {
    measures:
      "Whether your leadership support efforts add up to one explainable story.",
    high:
      "Support efforts can be explained as one connected story across need, action, and progress.",
    low:
      "The story feels fragmented; leaders cannot see how the parts fit together.",
    stronger:
      "Support efforts can be explained as one connected story across need, action, and progress.",
  },
};