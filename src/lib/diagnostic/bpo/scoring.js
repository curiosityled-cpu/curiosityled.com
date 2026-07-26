// Curiosity Led BPO Leadership Diagnostic
// Scoring logic: equal construct weights, BPO score bands, pattern mapping

export const CONSTRUCT_WEIGHTS = {
  performance_response: 0.20,
  coaching_cadence: 0.20,
  operational_control: 0.20,
  follow_through: 0.20,
  team_stability: 0.20,
};

export const CONSTRUCT_LABELS = {
  performance_response: "Performance Response",
  coaching_cadence: "Coaching Cadence & Quality",
  operational_control: "Operational Control Without Overcontrol",
  follow_through: "Follow-through & Accountability",
  team_stability: "Team Stability Risk",
};

export const CONSTRUCT_KEYS = Object.keys(CONSTRUCT_WEIGHTS);

// BPO uses 3-band system (0-39, 40-69, 70-100)
export const SCORE_BANDS = [
  { min: 70, max: 100, label: "Stronger / more established", key: "strong" },
  { min: 40, max: 69, label: "Mixed / uneven", key: "mixed" },
  { min: 0, max: 39, label: "High risk / weak foundation", key: "weak" },
];

export const OVERALL_LABELS = {
  "70-100": "Stronger Foundation",
  "40-69": "Mixed / Uneven",
  "0-39": "High Risk Foundation",
};

// Map a 0-100 score to a band key
export function getBandKey(score) {
  if (score >= 70) return "strong";
  if (score >= 40) return "mixed";
  return "weak";
}

export function getBandLabel(score) {
  if (score >= 70) return "Stronger";
  if (score >= 40) return "Mixed";
  return "High risk";
}

export function getOverallLabel(score) {
  if (score >= 70) return OVERALL_LABELS["70-100"];
  if (score >= 40) return OVERALL_LABELS["40-69"];
  return OVERALL_LABELS["0-39"];
}

// Convert a 1-5 agreement response to a score value
export function getItemScore(responseIndex, reverse) {
  const normalScore = responseIndex + 1;
  if (reverse) return 6 - normalScore;
  return normalScore;
}

// Compute a construct score from item responses
export function computeConstructScore(constructKey, items, responses) {
  const constructItems = items.filter((i) => i.construct === constructKey);
  if (constructItems.length === 0) return 0;

  const sum = constructItems.reduce((acc, item) => {
    const responseIndex = responses[item.id];
    if (responseIndex === undefined || responseIndex === null) return acc;
    return acc + getItemScore(responseIndex, item.reverse);
  }, 0);

  const answeredCount = constructItems.filter(
    (i) => responses[i.id] !== undefined && responses[i.id] !== null
  ).length;

  if (answeredCount === 0) return 0;

  const avg = sum / answeredCount;
  return Math.round(((avg - 1) / 4) * 100);
}

// Compute all scores from responses (BPO: overall = average of 5 constructs, no derived indexes)
export function computeAllScores(items, responses) {
  const constructScores = {};
  for (const key of CONSTRUCT_KEYS) {
    constructScores[key] = computeConstructScore(key, items, responses);
  }

  // Overall = average of 5 construct scores (equal weight)
  const overallScore = Math.round(
    CONSTRUCT_KEYS.reduce((acc, k) => acc + constructScores[k], 0) / CONSTRUCT_KEYS.length
  );

  // Top 2 pressure points (two lowest construct scores) — used for 90-day plan priority
  const sortedConstructs = [...CONSTRUCT_KEYS].sort(
    (a, b) => constructScores[a] - constructScores[b]
  );
  const top2PressurePoints = sortedConstructs.slice(0, 2);

  // Blueprint priorities = 3 lowest constructs
  const blueprintPriorities = sortedConstructs.slice(0, 3);

  return {
    constructScores,
    overallScore,
    overallLabel: getOverallLabel(overallScore),
    top2PressurePoints,
    blueprintPriorities,
  };
}