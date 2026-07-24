// Curiosity Led Leadership Reboot Diagnostic
// Determines which follow-up questions to trigger based on scores + intake

import { CONSTRUCT_KEYS } from "./scoring";

export function determineFollowUps(scores, intakeAnswers) {
  const triggered = [];

  // ── Score-triggered: up to 2 for the two lowest weak constructs (score < 50) ──
  const sortedConstructs = [...CONSTRUCT_KEYS].sort(
    (a, b) => scores.constructScores[a] - scores.constructScores[b]
  );
  const weakConstructs = sortedConstructs.filter(
    (k) => scores.constructScores[k] < 50
  );
  for (const construct of weakConstructs.slice(0, 2)) {
    if (!triggered.includes(construct)) {
      triggered.push(construct);
    }
  }

  // ── Context-triggered: up to 1 ──
  const populations = intakeAnswers.leader_populations || [];
  if (populations.length >= 2) {
    triggered.push("multiple_populations");
  } else if (
    intakeAnswers.already_in_place?.includes("Additional tools") &&
    intakeAnswers.additional_tools_text
  ) {
    triggered.push("additional_tools");
  } else if (intakeAnswers.area_of_focus === "Executive Leadership") {
    triggered.push("executive_leadership");
  }

  // ── Conflict-triggered: up to 1 ──
  if (
    intakeAnswers.already_in_place?.length >= 4 &&
    scores.constructScores.support_friction < 50
  ) {
    triggered.push("many_systems_low_friction");
  }

  // ── Cap at 4 ──
  return triggered.slice(0, 4);
}