/**
 * Preparation guidance for each succession stage — what the stage asks of the
 * people working it, what has to be in hand before they start, and the one
 * thing worth knowing before they rely on it. Written against the methodology:
 * evidence before opinion, and every judgement attached to a version.
 */
export const STAGE_PREP = {
  frame: {
    what: "The cycle itself: the window it covers, the business drivers behind it, and who sponsors each later stage.",
    prepare: [
      "The period this cycle covers, and when the slate is reviewed",
      "The business drivers the slate has to answer (growth, retirements, expansion, risk)",
      "Who sponsors the cycle, and who is accountable for each later stage",
    ],
    note: "A cycle is the container every later record hangs from. Its scope stays editable while it is open, and each change is kept in the cycle history.",
  },
  focus: {
    what: "Which roles are load-bearing enough to need a named bench, and the positions those roles sit in.",
    prepare: [
      "The organizational roles and positions from your structure, imported or entered",
      "Vacancy risk and strategic impact for each role being considered",
      "Who signs off that a role is critical — this is a recorded decision, not a toggle",
    ],
    note: "Only designated critical roles carry blueprints, candidates and decisions. De-designating a role keeps everything already recorded about it.",
  },
  blueprint: {
    what: "What 'ready' means for each critical role, written as requirements before any person is considered.",
    prepare: [
      "The outcomes, competencies and critical experiences the role genuinely requires",
      "Which requirements are essential and which are desirable",
      "Who approves a blueprint, kept separate from whoever drafts it",
    ],
    note: "Candidates are assessed against the published snapshot, never a draft. A later edit creates a new version and never rewrites a past judgement.",
  },
  discover: {
    what: "Which people are in scope for each critical role, and how they came to be in scope.",
    prepare: [
      "The talent pools in use, and the criteria for membership",
      "Who may add a person, and whether that person can see which pool they are in",
      "How a proposed candidate is distinguished from a self-nominated one",
    ],
    note: "Being in a pool is not a nomination and is not a promise. A candidate is told they are being considered, and can ask what is held about them.",
  },
  evidence: {
    what: "The evidence each candidate is judged on: performance, assessments, critical experiences and the candidate's own account.",
    prepare: [
      "Which evidence sources count — performance, Leadership Index, external results, manager input",
      "Who submits evidence for a person, and by when",
      "How a candidate's self-disclosure sits alongside evidence submitted about them",
    ],
    note: "Evidence is citable or it is not evidence. Every claim attached to a candidate keeps its source, so a judgement can be shown to rest on something.",
  },
  deliberate: {
    what: "Readiness is proposed, tested against the evidence, calibrated, and ratified before any decision is recorded.",
    prepare: [
      "Who calibrates, and who chairs each session",
      "How much evidence is enough to open a calibration — the pre-flight gate blocks weaker cases",
      "Who ratifies, kept separate from whoever records the decision",
    ],
    note: "The decision record is the ratifiable artefact: candidates considered, the reason for each outcome, the panel, and the blueprint version applied.",
  },
  accelerate: {
    what: "The gap between each candidate and the role, and the development that closes it.",
    prepare: [
      "The gaps each readiness conclusion identified, tied back to requirements",
      "Which development actions are realistic inside the cycle window",
      "What evidence will show a gap has closed when the candidate is reassessed",
    ],
    note: "Development is attached to a role requirement, not to a person in general. A closed gap is shown by new evidence, not by opinion.",
  },
  transition: {
    what: "The move itself: the knowledge transfer plan, the handovers, and the gate a transition clears before it completes.",
    prepare: [
      "The transition date, and who covers the role in the interim",
      "The knowledge areas being handed over, and who owns each one",
      "How high-severity risks are acknowledged before completion",
    ],
    note: "A transition cannot complete with an unfinished knowledge transfer or an unacknowledged high-severity risk. The completed plan is kept as evidence.",
  },
  monitor: {
    what: "The health of the pipeline after a cycle: alerts, reassessments, and whether the bench still holds.",
    prepare: [
      "Who works operational alerts, and how often",
      "When reassessments fall due, and what reopens a readiness conclusion",
      "The retention and legal-hold position for this cycle's records",
    ],
    note: "Alerts are raised from the data, never from opinion. A legal hold freezes records against purging or supersession, whatever the retention window says.",
  },
};

export default STAGE_PREP;