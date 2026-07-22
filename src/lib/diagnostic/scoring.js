// Curiosity Led Leadership Reboot Diagnostic
// Scoring logic: construct weights, reverse scoring, score bands, derived indexes

export const CONSTRUCT_WEIGHTS = {
  signal_delay: 0.25,
  support_friction: 0.25,
  proof_defensibility: 0.20,
  fragmentation_admin: 0.15,
  cost_of_inaction: 0.15,
};

export const CONSTRUCT_LABELS = {
  signal_delay: "Signal Delay",
  support_friction: "Support Friction",
  proof_defensibility: "Proof & Defensibility",
  fragmentation_admin: "Fragmentation & Admin Burden",
  cost_of_inaction: "Cost of Inaction",
};

export const CONSTRUCT_KEYS = Object.keys(CONSTRUCT_WEIGHTS);

// Derived index item mappings
export const DERIVED_INDEXES = {
  manager_engagement_risk: {
    items: [1, 2, 6, 7, 8, 9, 17, 18, 24],
    bands: {
      "75-100": "Low risk",
      "50-74": "Emerging risk",
      "0-49": "High risk",
    },
  },
  leadership_story_coherence: {
    items: [10, 11, 13, 14],
    bands: {
      "75-100": "Clear story",
      "50-74": "Partial story",
      "0-49": "Fragmented story",
    },
  },
};

export const SCORE_BANDS = [
  { min: 75, max: 100, label: "Strong", key: "strong" },
  { min: 50, max: 74, label: "Mixed", key: "mixed" },
  { min: 0, max: 49, label: "Weak", key: "weak" },
];

export const OVERALL_LABELS = {
  "75-100": "Earlier-Intervention Ready",
  "50-74": "In Transition",
  "0-49": "Reactive & Fragmented",
};

// Pressure point headlines
export const PRESSURE_POINT_HEADLINES = {
  signal_delay: "You are seeing leadership risk too late.",
  support_friction: "Support is not translating easily into real help.",
  proof_defensibility: "Your leadership story is hard to defend.",
  fragmentation_admin: "The system depends too much on manual effort.",
  cost_of_inaction: "The current cost is likely higher than it looks.",
};

// Map a 0-100 score to a band key
export function getBandKey(score) {
  if (score >= 75) return "strong";
  if (score >= 50) return "mixed";
  return "weak";
}

export function getBandLabel(score) {
  if (score >= 75) return "Strong";
  if (score >= 50) return "Mixed";
  return "Weak";
}

export function getOverallLabel(score) {
  if (score >= 75) return OVERALL_LABELS["75-100"];
  if (score >= 50) return OVERALL_LABELS["50-74"];
  return OVERALL_LABELS["0-49"];
}

export function getMERLabel(score) {
  if (score >= 75) return "Low risk";
  if (score >= 50) return "Emerging risk";
  return "High risk";
}

export function getLSCLabel(score) {
  if (score >= 75) return "Clear story";
  if (score >= 50) return "Partial story";
  return "Fragmented story";
}

// Convert a 1-5 agreement response to a score value
// For normal items: Strongly disagree=1 ... Strongly agree=5
// For reverse items: Strongly disagree=5 ... Strongly agree=1
export function getItemScore(responseIndex, reverse) {
  // responseIndex is 0-based: 0=Strongly disagree, 4=Strongly agree
  const normalScore = responseIndex + 1; // 1-5
  if (reverse) {
    return 6 - normalScore; // 5,4,3,2,1
  }
  return normalScore;
}

// Compute a construct score from item responses
// items: array of { id, reverse }
// responses: map of itemId -> responseIndex (0-4)
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

  const avg = sum / answeredCount; // 1-5
  // Convert to 0-100: (avg - 1) / 4 * 100
  return Math.round(((avg - 1) / 4) * 100);
}

// Compute derived index score from item responses
export function computeDerivedIndexScore(indexKey, items, responses) {
  const indexDef = DERIVED_INDEXES[indexKey];
  if (!indexDef) return 0;

  const indexItems = indexDef.items.map((id) => items.find((i) => i.id === id)).filter(Boolean);
  if (indexItems.length === 0) return 0;

  const sum = indexItems.reduce((acc, item) => {
    const responseIndex = responses[item.id];
    if (responseIndex === undefined || responseIndex === null) return acc;
    return acc + getItemScore(responseIndex, item.reverse);
  }, 0);

  const answeredCount = indexItems.filter(
    (i) => responses[i.id] !== undefined && responses[i.id] !== null
  ).length;

  if (answeredCount === 0) return 0;

  const avg = sum / answeredCount;
  return Math.round(((avg - 1) / 4) * 100);
}

// Compute all scores from responses
export function computeAllScores(items, responses) {
  const constructScores = {};
  for (const key of CONSTRUCT_KEYS) {
    constructScores[key] = computeConstructScore(key, items, responses);
  }

  // Overall weighted score
  let overallScore = 0;
  for (const key of CONSTRUCT_KEYS) {
    overallScore += constructScores[key] * CONSTRUCT_WEIGHTS[key];
  }
  overallScore = Math.round(overallScore);

  // Derived indexes
  const merScore = computeDerivedIndexScore("manager_engagement_risk", items, responses);
  const lscScore = computeDerivedIndexScore("leadership_story_coherence", items, responses);

  // Top 2 pressure points (two lowest construct scores)
  const sortedConstructs = [...CONSTRUCT_KEYS].sort(
    (a, b) => constructScores[a] - constructScores[b]
  );
  const top2PressurePoints = sortedConstructs.slice(0, 2);

  // 3 blueprint priorities
  // P1 = lowest construct, P2 = second-lowest construct
  // P3 = weaker of MER or LSC, or cross-cutting
  const p3 = merScore <= lscScore ? "manager_engagement_risk" : "leadership_story_coherence";

  const blueprintPriorities = [sortedConstructs[0], sortedConstructs[1], p3];

  return {
    constructScores,
    overallScore,
    overallLabel: getOverallLabel(overallScore),
    merScore,
    merLabel: getMERLabel(merScore),
    lscScore,
    lscLabel: getLSCLabel(lscScore),
    top2PressurePoints,
    blueprintPriorities,
  };
}