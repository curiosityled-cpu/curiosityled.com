// Curiosity Led BPO Leadership Diagnostic
// Score interpretation anchors: plain-language definitions, band ranges, how-to-read

export const HOW_TO_READ = [
  "Scores are shown on a 0\u2013100 scale to make the results easier to interpret.",
  "They reflect how your answers map to five dimensions of BPO leadership effectiveness.",
  "They are not industry benchmark scores. Lower scores do not mean failure \u2014 they point to where leadership patterns may be creating the most risk or drag right now.",
  "The report identifies a primary risk pattern and up to two secondary watch patterns based on your construct scores and intake answers.",
];

export const CRITERION_NOTE =
  "This score is criterion-based, not benchmark-based. It reflects how your answers map to a defined BPO leadership effectiveness model \u2014 not a comparison to industry peers.";

export const BAND_RANGES = [
  { min: 0, max: 39, label: "High risk / weak foundation", key: "weak" },
  { min: 40, max: 69, label: "Mixed / uneven", key: "mixed" },
  { min: 70, max: 100, label: "Stronger / more established", key: "strong" },
];

export const OVERALL_ANCHOR = {
  measures:
    "How well your current leadership patterns support team performance, coaching consistency, follow-through, operational control, and team stability under pressure.",
  high:
    "Leadership patterns are helping the team perform consistently, with strong coaching, reliable follow-through, and healthy team stability.",
  low:
    "Leadership patterns are creating performance, coaching, follow-through, or retention risk that is likely already affecting team outcomes.",
};

export const CONSTRUCT_ANCHORS = {
  performance_response: {
    measures:
      "How quickly and effectively managers respond to emerging performance issues before they become larger team or KPI problems.",
    high:
      "Performance issues are addressed early and directly, before they spread into SLA, QA, or delivery problems.",
    low:
      "Performance issues are allowed to drift, allowing small problems to compound into KPI misses or repeated coaching loops.",
    stronger:
      "Managers act on early signs of performance issues quickly and directly, before they spread.",
  },
  coaching_cadence: {
    measures:
      "How consistently coaching is happening, how specific it is, and whether it is connected to the real work.",
    high:
      "Coaching happens on a consistent cadence, is specific to the work, and is tied to real performance signals.",
    low:
      "Coaching is too infrequent, too generic, or too disconnected from the work to change behavior reliably.",
    stronger:
      "Coaching happens consistently and is tied to real performance signals, not treated as a side activity.",
  },
  operational_control: {
    measures:
      "How well leaders maintain standards and execution under pressure without becoming bottlenecks or over-controlling the team.",
    high:
      "Leaders maintain standards under pressure while keeping the team empowered and fast.",
    low:
      "Under pressure, leaders narrow decision-making, create bottlenecks, or over-control the team.",
    stronger:
      "Leaders maintain standards under pressure without becoming bottlenecks or micromanaging.",
  },
  follow_through: {
    measures:
      "How reliably managers and team leaders close loops, act on priorities, and carry commitments through.",
    high:
      "Priorities and commitments are consistently carried through, with loops reliably closed.",
    low:
      "Important actions stall after discussion or assignment, and commitments lose traction.",
    stronger:
      "Team leaders reliably close loops on what they say they will do, and commitments are carried through.",
  },
  team_stability: {
    measures:
      "How current leadership patterns may be affecting morale, burnout risk, disengagement, or attrition exposure.",
    high:
      "Current leadership behavior is helping protect morale and retention, keeping the team stable.",
    low:
      "Current leadership patterns may be increasing burnout, disengagement, or avoidable attrition risk.",
    stronger:
      "Current leadership behavior is helping protect morale and retention, keeping the team stable under pressure.",
  },
};