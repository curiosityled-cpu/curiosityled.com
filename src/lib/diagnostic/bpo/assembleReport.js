// Curiosity Led BPO Leadership Diagnostic
// Report assembly: produces the BPO report JSON from scores + intake + pattern mapping

import { CONSTRUCT_LABELS, getOverallLabel, getBandLabel } from "./scoring";
import {
  HOW_TO_READ,
  CRITERION_NOTE,
  BAND_RANGES,
  OVERALL_ANCHOR,
  CONSTRUCT_ANCHORS,
} from "./scoreAnchors";
import {
  OVERALL_RESULT_BLOCKS,
  PATTERN_BLOCKS,
  BLUEPRINT_MODULES,
  PATTERN_BLUEPRINT_MODULES,
  LEADERSHIP_TALKING_POINTS,
  LEADERSHIP_FRAMING_SENTENCE,
  CURIOSITY_LED_BRIDGE,
} from "./copyBlocks";
import { determinePatterns, getPatternStatus } from "./patternLogic";

function asArray(v) {
  if (Array.isArray(v)) return v;
  if (v) return [v];
  return [];
}

export function assembleReport(scores, intakeAnswers, followUpAnswers) {
  const { constructScores, overallScore, overallLabel, top2PressurePoints, blueprintPriorities } =
    scores;

  const populations = asArray(intakeAnswers.leader_populations);
  const outcomes = asArray(intakeAnswers.outcomes_under_pressure);
  const mostTrue = asArray(intakeAnswers.most_true_today);

  // Determine patterns
  const { primary, watch } = determinePatterns(scores, intakeAnswers);

  // ── Section 1: Title and respondent context ──
  const section1 = {
    title: "Curiosity Led BPO Leadership Diagnostic",
    subtitle: "90-Day BPO Leadership Action Plan",
    respondent: {
      role: intakeAnswers.role || "",
      operation_type: asArray(intakeAnswers.operation_type),
      populations_in_scope: populations,
      operation_size: intakeAnswers.operation_size || "",
      outcomes_under_pressure: outcomes,
    },
  };

  // ── Section 2: Overall result ──
  const overallBlock = OVERALL_RESULT_BLOCKS[overallLabel] || "";
  const section2 = {
    score: overallScore,
    label: overallLabel,
    interpretation: overallBlock,
    context_insert: buildContextInsert(intakeAnswers),
    what_it_measures: OVERALL_ANCHOR.measures,
    what_100_looks_like: OVERALL_ANCHOR.high,
    what_low_means: OVERALL_ANCHOR.low,
  };

  // ── Section 3: Five construct scores ──
  const section3 = {
    constructs: CONSTRUCT_KEYS_LIST.map((key) => {
      const def = CONSTRUCT_ANCHORS[key] || {};
      return {
        construct: key,
        construct_label: CONSTRUCT_LABELS[key],
        score: constructScores[key],
        band: getBandLabel(constructScores[key]),
        measures: def.measures,
        stronger: def.stronger,
      };
    }),
  };

  // ── Section 4: Primary risk pattern ──
  const primaryBlock = PATTERN_BLOCKS[primary.key] || {};
  const primaryStatus = getPatternStatus(constructScores[primary.drivingConstruct]);
  const section4 = {
    key: primary.key,
    label: primaryBlock.label,
    status: primaryStatus,
    driving_construct: primary.drivingConstruct,
    driving_construct_label: CONSTRUCT_LABELS[primary.drivingConstruct],
    driving_score: constructScores[primary.drivingConstruct],
    what_it_means: primaryBlock.what_it_means,
    what_may_drive_it: primaryBlock.what_may_drive_it,
    what_is_at_stake: primaryBlock.what_is_at_stake,
    why_for_you: buildPatternWhyForYou(primary, intakeAnswers),
  };

  // ── Section 5: Secondary watch patterns ──
  const section5 = watch.map((w) => {
    const block = PATTERN_BLOCKS[w.key] || {};
    const status = getPatternStatus(constructScores[w.drivingConstruct]);
    return {
      key: w.key,
      label: block.label,
      status,
      driving_construct: w.drivingConstruct,
      driving_construct_label: CONSTRUCT_LABELS[w.drivingConstruct],
      explanation: block.what_it_means,
      watch_because: buildWatchBecause(w.key, outcomes, mostTrue),
    };
  });

  // ── Section 6: What this likely means right now ──
  const section6 = {
    synthesis: buildSynthesis(overallLabel, primary, watch, intakeAnswers),
  };

  // ── Section 7: 90-Day action plan ──
  // P1 = hero pattern, P2 = most important supporting weakness (lowest construct not driving primary),
  // P3 = execution habit (follow-through or coaching module)
  const section7 = build90DayPlan(primary, watch, scores, intakeAnswers);

  // ── Section 8: What to bring to leadership ──
  const section8 = {
    talking_points: [
      LEADERSHIP_TALKING_POINTS[primary.key] || "",
      watch[0] ? LEADERSHIP_TALKING_POINTS[watch[0].key] || "" : "",
      `The next 90 days should focus on ${primaryBlock.label?.toLowerCase() || "the primary pattern"} first.`,
    ].filter(Boolean),
    framing_sentence: LEADERSHIP_FRAMING_SENTENCE,
  };

  // ── Section 9: Curiosity Led bridge ──
  const section9 = {
    sentence1: CURIOSITY_LED_BRIDGE.sentence1,
    sentence2: CURIOSITY_LED_BRIDGE.sentence2,
    sentence3: CURIOSITY_LED_BRIDGE.sentence3,
  };

  return {
    section1_title_context: section1,
    section2_overall_result: section2,
    section3_construct_scores: section3,
    section4_primary_pattern: section4,
    section5_watch_patterns: section5,
    section6_what_this_means: section6,
    section7_90_day_plan: section7,
    section8_what_to_bring_to_leadership: section8,
    section9_curiosity_led_bridge: section9,
    how_to_read: HOW_TO_READ,
    criterion_note: CRITERION_NOTE,
    band_ranges: BAND_RANGES,
    score_definitions: {
      overall: OVERALL_ANCHOR,
      constructs: CONSTRUCT_ANCHORS,
    },
    scores_summary: {
      construct_scores: constructScores,
      overall_score: overallScore,
      overall_label: overallLabel,
    },
  };
}

const CONSTRUCT_KEYS_LIST = [
  "performance_response",
  "coaching_cadence",
  "operational_control",
  "follow_through",
  "team_stability",
];

function buildContextInsert(intake) {
  const whyNow = asArray(intake.why_now).filter((r) => r !== "Just checking this out" && r !== "Other");
  const mostTrue = asArray(intake.most_true_today);
  if (whyNow.length > 0) return whyNow.join(", ");
  if (mostTrue.length > 0) return mostTrue.join(", ");
  return "";
}

function buildPatternWhyForYou(primary, intake) {
  const outcomes = asArray(intake.outcomes_under_pressure).map((s) => s.toLowerCase());
  const mostTrue = asArray(intake.most_true_today).map((s) => s.toLowerCase());
  const clauses = [];

  switch (primary.key) {
    case "performance_avoidance":
      if (outcomes.length) clauses.push(`your most pressured outcomes are ${outcomes.join(", ").toUpperCase()}`);
      break;
    case "reactive_leadership":
      if (mostTrue.some((s) => s.includes("firefighting"))) clauses.push("you said managers are firefighting too often");
      break;
    case "coaching_deficit":
      if (mostTrue.some((s) => s.includes("coaching"))) clauses.push("you said coaching is inconsistent");
      break;
    case "attrition_risk_behavior":
      if (outcomes.some((o) => o.includes("attrition"))) clauses.push("you flagged attrition as a pressured outcome");
      break;
    case "overload_to_overcontrol":
      if (mostTrue.some((s) => s.includes("overloaded"))) clauses.push("you said leaders are overloaded");
      break;
  }
  return clauses.length ? `Because ${clauses.join("; ")}, this pattern is the most worth fixing first.` : "This pattern is the most worth fixing first based on your construct scores and intake answers.";
}

function buildWatchBecause(patternKey, outcomes, mostTrue) {
  const o = outcomes.map((s) => s.toLowerCase());
  const m = mostTrue.map((s) => s.toLowerCase());
  switch (patternKey) {
    case "performance_avoidance":
      return `Watch this because your pressured outcomes (${outcomes.join(", ") || "SLA/QA"}) can compound quickly when performance issues drift.`;
    case "reactive_leadership":
      return "Watch this because reactive management creates slower recovery and more disruption under KPI pressure.";
    case "accountability_gap":
      return "Watch this because weak follow-through makes team execution less dependable over time.";
    case "coaching_deficit":
      return "Watch this because without stronger coaching, the same issues repeat without capability building.";
    case "overload_to_overcontrol":
      return "Watch this because overcontrol weakens team ownership and speed even when it feels necessary short-term.";
    case "attrition_risk_behavior":
      return "Watch this because attrition destabilizes delivery, coaching continuity, and team trust.";
    case "metric_myopia":
      return "Watch this because short-term metric wins can hide a growing people and quality cost.";
    default:
      return "Watch this because it can quietly affect team performance and stability.";
  }
}

function buildSynthesis(overallLabel, primary, watch, intake) {
  const primaryLabel = primary?.label || "your primary risk pattern";
  const watchLabels = watch.map((w) => w.label).filter(Boolean);
  let problem = "";
  if (overallLabel === "High Risk Foundation") {
    problem = `Your current leadership patterns are creating real risk. The primary pattern most worth fixing first is ${primaryLabel.toLowerCase()}.`;
  } else if (overallLabel === "Mixed / Uneven") {
    problem = `Your leadership practices are happening in pieces but not consistently. The pattern most worth addressing is ${primaryLabel.toLowerCase()}.`;
  } else {
    problem = `Your foundations are stronger than most, but the pattern most worth watching is ${primaryLabel.toLowerCase()}.`;
  }
  let watchSentence = "";
  if (watchLabels.length > 0) {
    watchSentence = ` Secondary patterns worth watching: ${watchLabels.map((l) => l.toLowerCase()).join(", ")}.`;
  }
  return `${problem}${watchSentence} The 90-day plan below focuses on ${primaryLabel.toLowerCase()} first, then the supporting weaknesses most likely to compound it.`;
}

function build90DayPlan(primary, watch, scores, intake) {
  const cs = scores.constructScores;
  const plan = [];

  // P1: hero pattern module
  const p1Module = PATTERN_BLUEPRINT_MODULES[primary.key] || BLUEPRINT_MODULES[primary.drivingConstruct];
  if (p1Module) {
    plan.push({
      priority: 1,
      key: primary.key,
      title: p1Module.title,
      why_it_matters: p1Module.whyItMatters,
      days_1_30: p1Module.days["1-30"],
      days_31_60: p1Module.days["31-60"],
      days_61_90: p1Module.days["61-90"],
    });
  }

  // P2: most important supporting weakness (lowest construct not driving primary)
  const sorted = Object.entries(cs).sort((a, b) => a[1] - b[1]);
  const p2Construct = sorted.find(([k]) => k !== primary.drivingConstruct)?.[0];
  const p2Module = p2Construct ? BLUEPRINT_MODULES[p2Construct] : null;
  if (p2Module) {
    plan.push({
      priority: 2,
      key: p2Construct,
      title: p2Module.title,
      why_it_matters: p2Module.whyItMatters,
      days_1_30: p2Module.days["1-30"],
      days_31_60: p2Module.days["31-60"],
      days_61_90: p2Module.days["61-90"],
    });
  }

  // P3: execution habit (follow-through if not already P1/P2, else coaching)
  const p3Key = !plan.some((p) => p.key === "follow_through")
    ? "follow_through"
    : !plan.some((p) => p.key === "coaching_cadence")
      ? "coaching_cadence"
      : sorted.find(([k]) => !plan.some((p) => p.key === k))?.[0];
  const p3Module = p3Key ? BLUEPRINT_MODULES[p3Key] : null;
  if (p3Module) {
    plan.push({
      priority: 3,
      key: p3Key,
      title: p3Module.title,
      why_it_matters: p3Module.whyItMatters,
      days_1_30: p3Module.days["1-30"],
      days_31_60: p3Module.days["31-60"],
      days_61_90: p3Module.days["61-90"],
    });
  }

  return plan;
}