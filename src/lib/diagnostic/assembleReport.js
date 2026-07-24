// Curiosity Led Leadership Reboot Diagnostic
// Report assembly: produces the 9-section report JSON from scores + intake + follow-ups

import {
  CONSTRUCT_LABELS,
  getBandKey,
  getOverallLabel,
  getMERLabel,
  getLSCLabel,
  PRESSURE_POINT_HEADLINES,
} from "./scoring";
import {
  HOW_TO_READ,
  CRITERION_NOTE,
  BAND_RANGES,
  OVERALL_ANCHOR,
  CONSTRUCT_ANCHORS,
  DERIVED_ANCHORS,
} from "./scoreAnchors";
import {
  OVERALL_RESULT_BLOCKS,
  CONSTRUCT_INTERPRETATION_BLOCKS,
  MER_BLOCKS,
  LSC_BLOCKS,
  BLUEPRINT_MODULES,
  POPULATION_MODIFIERS,
  OBSTACLE_MODIFIERS,
  TOOL_MODIFIERS,
  LEADERSHIP_TALKING_POINTS,
  LEADERSHIP_FRAMING_SENTENCE,
  IMPLEMENTATION_HARD_PARTS,
  CURIOSITY_LED_BRIDGE,
} from "./copyBlocks";

export function assembleReport(scores, intakeAnswers, followUpAnswers) {
  const {
    constructScores,
    overallScore,
    overallLabel,
    merScore,
    merLabel,
    lscScore,
    lscLabel,
    top2PressurePoints,
    blueprintPriorities,
  } = scores;

  // Get urgent population from follow-up if triggered
  const urgentPopulation =
    followUpAnswers?.multiple_populations || null;

  // Get population modifier
  const populations = intakeAnswers.leader_populations || [];
  let populationModifier = "";
  for (const pop of populations) {
    if (POPULATION_MODIFIERS[pop]) {
      populationModifier = POPULATION_MODIFIERS[pop];
      break;
    }
  }

  // Get obstacle modifier
  const obstacles = Array.isArray(intakeAnswers.biggest_obstacle)
    ? intakeAnswers.biggest_obstacle
    : intakeAnswers.biggest_obstacle
      ? [intakeAnswers.biggest_obstacle]
      : [];
  let obstacleModifier = "";
  for (const obs of obstacles) {
    if (OBSTACLE_MODIFIERS[obs]) {
      obstacleModifier = OBSTACLE_MODIFIERS[obs];
      break;
    }
  }

  // Get tool modifier
  const managerTools = (intakeAnswers.additional_tools_text || "").toLowerCase();
  let toolModifier = "";
  for (const tool of Object.keys(TOOL_MODIFIERS)) {
    if (managerTools.includes(tool)) {
      toolModifier = TOOL_MODIFIERS[tool];
      break;
    }
  }

  // ── Section 1: Title and respondent context ──
  const section1 = {
    title: "Curiosity Led Leadership Reboot Diagnostic",
    subtitle: "90-Day Leadership Support Reboot Plan",
    respondent: {
      area_of_focus: intakeAnswers.area_of_focus || "",
      populations_in_scope: populations,
      organization_size: intakeAnswers.organization_size || "",
      urgent_population: urgentPopulation,
    },
  };

  // ── Section 2: Overall result ──
  const contextInsert = buildContextInsert(intakeAnswers);
  const overallBlock = OVERALL_RESULT_BLOCKS[overallLabel] || "";
  const section2 = {
    score: overallScore,
    label: overallLabel,
    interpretation: overallBlock,
    context_insert: contextInsert,
    area_of_focus: intakeAnswers.area_of_focus || "",
    what_it_measures: OVERALL_ANCHOR.measures,
    what_100_looks_like: OVERALL_ANCHOR.high,
    what_low_means: OVERALL_ANCHOR.low,
  };

  // ── Section 3: Manager Engagement Risk ──
  const merInterpretation = MER_BLOCKS[merLabel] || "";
  const supportFrictionFollowUp = followUpAnswers?.support_friction || "";
  const section3 = {
    score: merScore,
    label: merLabel,
    interpretation: merInterpretation,
    friction_source: supportFrictionFollowUp || null,
  };

  // ── Section 4: Top 2 pressure points ──
  const section4 = top2PressurePoints.map((constructKey, ppIndex) => {
    const bandKey = getBandKey(constructScores[constructKey]);
    const bandLabel =
      bandKey === "strong" ? "Strong" : bandKey === "mixed" ? "Mixed" : "Weak";
    const headline = PRESSURE_POINT_HEADLINES[constructKey];
    const interpretation =
      CONSTRUCT_INTERPRETATION_BLOCKS[constructKey]?.[bandLabel] || "";

    // Specificity sentence from follow-up or intake
    let specificity = "";
    if (followUpAnswers?.[constructKey]) {
      specificity = followUpAnswers[constructKey];
    } else if (populationModifier) {
      specificity = populationModifier;
    }

    // Tie to urgent population
    let urgentTie = "";
    if (urgentPopulation) {
      urgentTie = `This is especially pressing for ${urgentPopulation.toLowerCase()}.`;
    }

    return {
      construct: constructKey,
      construct_label: CONSTRUCT_LABELS[constructKey],
      score: constructScores[constructKey],
      band: bandLabel,
      headline,
      interpretation,
      specificity,
      urgent_tie: urgentTie,
      why_for_you: buildWhyForYou(constructKey, ppIndex, scores, intakeAnswers, followUpAnswers, false),
    };
  });

  // ── Section 5: What this likely means right now ──
  const concernText = Array.isArray(intakeAnswers.concern_if_no_change)
    ? intakeAnswers.concern_if_no_change.join(", ")
    : intakeAnswers.concern_if_no_change || "";
  const section5 = {
    synthesis: buildSynthesis(overallLabel, top2PressurePoints, concernText, obstacleModifier),
  };

  // ── Section 6: 90-Day Leadership Support Reboot Plan ──
  const section6 = blueprintPriorities.map((priorityKey, index) => {
    const module = BLUEPRINT_MODULES[priorityKey];
    if (!module) return null;
    return {
      priority: index + 1,
      key: priorityKey,
      title: module.title,
      why_it_matters: module.whyItMatters,
      why_for_you: buildWhyForYou(priorityKey, index, scores, intakeAnswers, followUpAnswers, index === 2),
      days_1_30: module.days["1-30"],
      days_31_60: module.days["31-60"],
      days_61_90: module.days["61-90"],
    };
  }).filter(Boolean);

  // ── Section 7: What to bring to leadership ──
  const talkingPoints = blueprintPriorities.slice(0, 3).map((key) => {
    return LEADERSHIP_TALKING_POINTS[key] || LEADERSHIP_TALKING_POINTS[top2PressurePoints[0]];
  }).filter(Boolean);
  // Deduplicate talking points (derived-index fallbacks can repeat P1)
  const uniqueTalkingPoints = [...new Set(talkingPoints)];
  const section7 = {
    talking_points: uniqueTalkingPoints,
    framing_sentence: LEADERSHIP_FRAMING_SENTENCE,
    story_coherence_context: lscLabel,
  };

  // ── Section 8: Where implementation usually gets hard ──
  const section8 = {
    bullets: IMPLEMENTATION_HARD_PARTS,
  };

  // ── Section 9: Curiosity Led bridge ──
  const section9 = {
    sentence1: CURIOSITY_LED_BRIDGE.sentence1,
    sentence2: CURIOSITY_LED_BRIDGE.sentence2,
    sentence3: CURIOSITY_LED_BRIDGE.sentence3,
  };

  // Also include LSC block
  const lscInterpretation = LSC_BLOCKS[lscLabel] || "";

  return {
    section1_title_context: section1,
    section2_overall_result: section2,
    section3_manager_engagement_risk: section3,
    section4_top_2_pressure_points: section4,
    section5_what_this_means: section5,
    section6_90_day_plan: section6,
    section7_what_to_bring_to_leadership: section7,
    section8_where_it_gets_hard: section8,
    section9_curiosity_led_bridge: section9,
    leadership_story_coherence: {
      score: lscScore,
      label: lscLabel,
      interpretation: lscInterpretation,
    },
    modifiers: {
      population: populationModifier,
      obstacle: obstacleModifier,
      tool: toolModifier,
    },
    scores_summary: {
      construct_scores: constructScores,
      overall_score: overallScore,
      overall_label: overallLabel,
      mer_score: merScore,
      mer_label: merLabel,
      lsc_score: lscScore,
      lsc_label: lscLabel,
    },
    how_to_read: HOW_TO_READ,
    criterion_note: CRITERION_NOTE,
    band_ranges: BAND_RANGES,
    score_definitions: {
      overall: OVERALL_ANCHOR,
      constructs: CONSTRUCT_ANCHORS,
      derived: DERIVED_ANCHORS,
    },
  };
}

function buildSynthesis(overallLabel, pressurePoints, concernText, obstacleModifier) {
  const pp1 = CONSTRUCT_LABELS[pressurePoints[0]] || "";
  const pp2 = CONSTRUCT_LABELS[pressurePoints[1]] || "";

  let problem = "";
  if (overallLabel === "Reactive & Fragmented") {
    problem = `Your leadership support system is currently operating in a reactive, fragmented state. The two most pressing gaps are in ${pp1.toLowerCase()} and ${pp2.toLowerCase()}.`;
  } else if (overallLabel === "In Transition") {
    problem = `Your leadership support is functioning in pieces but not yet as one timely system. The areas needing the most attention are ${pp1.toLowerCase()} and ${pp2.toLowerCase()}.`;
  } else {
    problem = `Your foundations are stronger than most, but the areas with the most room to improve are ${pp1.toLowerCase()} and ${pp2.toLowerCase()}.`;
  }

  const consequence = `If nothing changes in the next 6\u201312 months, these gaps will likely widen and compete with other priorities for attention.`;
  const concern = concernText
    ? `Because you said your biggest concerns are ${concernText.toLowerCase()}, those risks are directly tied to this pattern.`
    : "";

  let synthesis = `${problem} ${consequence}`;
  if (concern) synthesis += ` ${concern}`;
  if (obstacleModifier) synthesis += ` ${obstacleModifier}`;
  return synthesis;
}

function asArray(v) {
  if (Array.isArray(v)) return v;
  if (v) return [v];
  return [];
}

// Build a "Because you said..." clause tied to the respondent's intake answers
// for a given construct or derived index. Returns "" when no relevant signal exists.
function intakeClause(key, intake, followUps) {
  const mostTrue = asArray(intake.most_true_today).map((s) => s.toLowerCase());
  const whyNow = asArray(intake.why_now).map((s) => s.toLowerCase());
  const concern = asArray(intake.concern_if_no_change);
  const clauses = [];

  switch (key) {
    case "signal_delay":
      if (mostTrue.some((s) => s.includes("too late")))
        clauses.push("you said support often arrives too late");
      else if (whyNow.some((s) => s.includes("readiness")))
        clauses.push("you said leadership readiness feels unclear");
      break;
    case "support_friction":
      if (mostTrue.some((s) => s.includes("disconnected")))
        clauses.push("you said support feels disconnected from daily work");
      else if (mostTrue.some((s) => s.includes("overloaded")))
        clauses.push("you said managers are overloaded");
      if (followUps?.support_friction)
        clauses.push(`managers most often struggle because support ${followUps.support_friction.toLowerCase()}`);
      break;
    case "proof_defensibility":
      if (mostTrue.some((s) => s.includes("prove impact")))
        clauses.push("you said you cannot clearly prove impact");
      else if (whyNow.some((s) => s.includes("prove impact")))
        clauses.push("you said you are struggling to prove impact or justify investment");
      break;
    case "fragmentation_admin":
      if (mostTrue.some((s) => s.includes("manual")))
        clauses.push("you said reporting and follow-through feel too manual");
      else if (mostTrue.some((s) => s.includes("fragmented")))
        clauses.push("you said information is fragmented across tools");
      if (followUps?.fragmentation_admin)
        clauses.push(`the most manual effort is in ${followUps.fragmentation_admin.toLowerCase()}`);
      break;
    case "cost_of_inaction":
      if (concern.length)
        clauses.push(`you said your biggest concerns are ${concern.join(", ").toLowerCase()}`);
      break;
    case "manager_engagement_risk":
      if (mostTrue.some((s) => s.includes("overloaded")))
        clauses.push("you said managers are overloaded");
      break;
    case "leadership_story_coherence":
      if (mostTrue.some((s) => s.includes("prove impact")))
        clauses.push("you said you cannot clearly prove impact");
      break;
  }

  return clauses.length ? `Because ${clauses.join("; ")}, ` : "";
}

// Produce the "Why this is priority N for you" sentence for a pressure point or
// blueprint priority, combining the score anchor with the respondent's intake signal.
function buildWhyForYou(key, index, scores, intake, followUps, isDerived) {
  const label =
    key === "manager_engagement_risk"
      ? "Manager Engagement Risk"
      : key === "leadership_story_coherence"
        ? "Story Coherence"
        : CONSTRUCT_LABELS[key];
  const score = isDerived
    ? key === "manager_engagement_risk"
      ? scores.merScore
      : scores.lscScore
    : scores.constructScores[key];
  const clause = intakeClause(key, intake, followUps);

  if (isDerived) {
    return `${clause}your ${label} score was ${score}/100, making it the third priority for your 90-day plan.`;
  }
  const ordinal = index === 0 ? "lowest" : "second-lowest";
  return `${clause}${label} was your ${ordinal} area at ${score}/100.`;
}

// Interpret the "why now" / context signal rather than echoing raw intake labels.
// Rephrases weak answers like "Just checking this out" so the report never reads
// as a casual test run, while still honoring genuine stated reasons.
function buildContextInsert(intake) {
  const whyNow = asArray(intake.why_now);
  const mostTrue = asArray(intake.most_true_today);
  const realReasons = whyNow.filter(
    (r) => r !== "Just checking this out" && r !== "Other"
  );
  const justChecking = whyNow.includes("Just checking this out");

  if (justChecking && realReasons.length === 0) {
    return "Even if you were initially just pressure-testing the diagnostic, your responses point to a meaningful operating gap in how leadership support is delivered and coordinated.";
  }
  if (justChecking) {
    return `You came in partly pressure-testing this diagnostic, but your answers also reflect ${realReasons.join(", ").toLowerCase()} \u2014 your responses point to a real operating gap, not a hypothetical one.`;
  }
  const whyNowRaw = whyNow.join(", ");
  if (whyNowRaw) return whyNowRaw;
  return mostTrue.length ? mostTrue.join(", ") : "";
}