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
  const whyNowRaw = Array.isArray(intakeAnswers.why_now)
    ? intakeAnswers.why_now.join(", ")
    : intakeAnswers.why_now || "";
  const contextInsert =
    whyNowRaw ||
    (intakeAnswers.most_true_today && intakeAnswers.most_true_today.length > 0
      ? intakeAnswers.most_true_today.join(", ")
      : "");
  const overallBlock = OVERALL_RESULT_BLOCKS[overallLabel] || "";
  const section2 = {
    score: overallScore,
    label: overallLabel,
    interpretation: overallBlock,
    context_insert: contextInsert,
    area_of_focus: intakeAnswers.area_of_focus || "",
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
  const section4 = top2PressurePoints.map((constructKey) => {
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
    ? `Your stated concern\u2014${concernText}\u2014is directly connected to this pattern.`
    : "";

  let synthesis = `${problem} ${consequence}`;
  if (concern) synthesis += ` ${concern}`;
  if (obstacleModifier) synthesis += ` ${obstacleModifier}`;
  return synthesis;
}