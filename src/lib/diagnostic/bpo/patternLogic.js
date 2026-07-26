// Curiosity Led BPO Leadership Diagnostic
// Pattern mapping logic: identifies primary + watch patterns from construct scores + intake

import { CONSTRUCT_KEYS } from "./scoring";

function asArray(v) {
  if (Array.isArray(v)) return v;
  if (v) return [v];
  return [];
}

function lower(arr) {
  return arr.map((s) => String(s).toLowerCase());
}

// Determine pattern status tag from the driving construct score
function getPatternStatus(constructScore) {
  if (constructScore < 40) return "Active";
  if (constructScore < 70) return "Emerging";
  return "Persistent";
}

// Evaluate all 7 patterns and return ranked matches with strength + driving construct
export function determinePatterns(scores, intakeAnswers) {
  const cs = scores.constructScores;
  const outcomes = lower(asArray(intakeAnswers.outcomes_under_pressure));
  const mostTrue = lower(asArray(intakeAnswers.most_true_today));
  const whyNow = lower(asArray(intakeAnswers.why_now));
  const obstacles = lower(asArray(intakeAnswers.biggest_obstacle));

  const sortedConstructs = [...CONSTRUCT_KEYS].sort((a, b) => cs[a] - cs[b]);
  const lowest = sortedConstructs[0];
  const secondLowest = sortedConstructs[1];

  const matches = [];

  // 1. Performance Avoidance: performance_response weak AND outcomes include SLA/QA/FCR/AHT/escalations
  if (cs.performance_response < 50) {
    const hasOutcome = outcomes.some((o) =>
      ["sla", "qa", "fcr", "aht", "escalation"].some((k) => o.includes(k))
    );
    if (hasOutcome) {
      matches.push({
        key: "performance_avoidance",
        drivingConstruct: "performance_response",
        strength: 100 - cs.performance_response,
      });
    }
  }

  // 2. Reactive Leadership: performance_response weak AND intake indicates firefighting/late action/KPI pressure
  if (cs.performance_response < 50) {
    const hasSignal =
      mostTrue.some((s) => s.includes("firefighting")) ||
      mostTrue.some((s) => s.includes("linger")) ||
      whyNow.some((s) => s.includes("kpi pressure")) ||
      whyNow.some((s) => s.includes("too reactive")) ||
      obstacles.some((s) => s.includes("firefighting"));
    if (hasSignal) {
      matches.push({
        key: "reactive_leadership",
        drivingConstruct: "performance_response",
        strength: 95 - cs.performance_response,
      });
    }
  }

  // 3. Accountability Gap: follow_through is lowest or second-lowest
  if (lowest === "follow_through" || secondLowest === "follow_through") {
    matches.push({
      key: "accountability_gap",
      drivingConstruct: "follow_through",
      strength: 100 - cs.follow_through,
    });
  }

  // 4. Coaching Deficit: coaching_cadence weak AND intake indicates coaching inconsistency or QA pressure
  if (cs.coaching_cadence < 50) {
    const hasSignal =
      mostTrue.some((s) => s.includes("coaching")) ||
      whyNow.some((s) => s.includes("coaching")) ||
      obstacles.some((s) => s.includes("coaching")) ||
      outcomes.some((o) => o.includes("qa"));
    if (hasSignal) {
      matches.push({
        key: "coaching_deficit",
        drivingConstruct: "coaching_cadence",
        strength: 100 - cs.coaching_cadence,
      });
    }
  }

  // 5. Overload to Overcontrol: operational_control weak AND intake indicates leader overload/bottlenecks/excessive pressure
  if (cs.operational_control < 50) {
    const hasSignal =
      mostTrue.some((s) => s.includes("overloaded")) ||
      obstacles.some((s) => s.includes("bandwidth")) ||
      obstacles.some((s) => s.includes("capability")) ||
      whyNow.some((s) => s.includes("reactive"));
    if (hasSignal) {
      matches.push({
        key: "overload_to_overcontrol",
        drivingConstruct: "operational_control",
        strength: 100 - cs.operational_control,
      });
    }
  }

  // 6. Attrition Risk Behavior: team_stability weak AND intake indicates attrition/burnout/absenteeism/morale
  if (cs.team_stability < 50) {
    const hasSignal =
      outcomes.some((o) => o.includes("attrition") || o.includes("absenteeism")) ||
      mostTrue.some((s) => s.includes("attrition") || s.includes("burnout")) ||
      whyNow.some((s) => s.includes("attrition") || s.includes("burnout"));
    if (hasSignal) {
      matches.push({
        key: "attrition_risk_behavior",
        drivingConstruct: "team_stability",
        strength: 100 - cs.team_stability,
      });
    }
  }

  // 7. Metric Myopia: results pressure high, people risk present, response suggests chasing numbers
  const resultsPressure = outcomes.some((o) =>
    ["sla", "qa", "aht", "fcr", "csat", "adherence"].some((k) => o.includes(k))
  );
  const peopleRisk =
    cs.team_stability < 50 ||
    outcomes.some((o) => o.includes("attrition") || o.includes("absenteeism")) ||
    mostTrue.some((s) => s.includes("attrition") || s.includes("burnout"));
  const chasingNumbers =
    cs.coaching_cadence < 50 ||
    mostTrue.some((s) => s.includes("firefighting")) ||
    whyNow.some((s) => s.includes("kpi pressure"));
  if (resultsPressure && peopleRisk && chasingNumbers) {
    matches.push({
      key: "metric_myopia",
      drivingConstruct: peopleRisk ? "team_stability" : "coaching_cadence",
      strength: 90,
    });
  }

  // Sort by strength descending
  matches.sort((a, b) => b.strength - a.strength);

  // Fallback: if no patterns matched (all constructs strong), use the lowest construct as a watch signal
  if (matches.length === 0) {
    const fallbackKey = lowestToPattern(lowest);
    matches.push({
      key: fallbackKey,
      drivingConstruct: lowest,
      strength: 100 - cs[lowest],
    });
  }

  const primary = matches[0];
  const watch = matches.slice(1, 3);

  return { primary, watch, allMatches: matches };
}

// Map a construct key to its most likely associated pattern (fallback)
function lowestToPattern(constructKey) {
  const map = {
    performance_response: "performance_avoidance",
    coaching_cadence: "coaching_deficit",
    operational_control: "overload_to_overcontrol",
    follow_through: "accountability_gap",
    team_stability: "attrition_risk_behavior",
  };
  return map[constructKey] || "performance_avoidance";
}

export { getPatternStatus };