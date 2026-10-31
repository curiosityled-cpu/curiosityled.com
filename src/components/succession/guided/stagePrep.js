/**
 * Per-stage preparation guidance for the succession workspace.
 *
 * Every stage asks for something that has to exist before it can be worked
 * properly — the sponsor, the role data, the panel, the evidence. Stating that
 * up front lets a cycle be prepared stage by stage instead of discovered one
 * empty screen at a time.
 *
 * `haveReady` is what the stage consumes. `note` is the one consequence worth
 * knowing before starting (what locks, what is recorded, what cannot be undone).
 * `step` is the concrete piece of work that lets the cycle move past this stage
 * — named as the step, never as the stage — and `view` is where it is done.
 */
export const STAGE_PREP = {
  frame: {
    haveReady: [
      "The business driver behind this cycle — a retirement, a strategic shift, a thin bench",
      "The timeframe it covers and which parts of the organisation are in scope",
      "Who sponsors it and who signs off on the decisions it produces",
    ],
    note: "A cycle is the container for every role decision underneath it. Name it for the period it covers, not the roles in it, so later cycles stay distinguishable.",
    step: { label: "Create succession cycle", view: "cycles" },
  },
  focus: {
    haveReady: [
      "The organisational roles with their titles and reporting lines",
      "Vacancy risk and difficulty to replace for each role",
      "Which roles a departure would genuinely hurt, not simply which are most senior",
    ],
    note: "A role becomes critical because of its impact and replaceability. Seniority alone does not make a role critical, and designating too many dilutes the exercise.",
    step: { label: "Designate critical roles", view: "critical-roles" },
  },
  blueprint: {
    haveReady: [
      "The competency library and critical experiences the organisation already uses",
      "What observable outcomes distinguish a strong performer in the role",
      "Who is accountable for approving the blueprint for each role",
    ],
    note: "Approval freezes the requirements into a snapshot. Later changes are a new revision, and every readiness conclusion keeps the version it was judged against.",
    step: { label: "Submit a blueprint for approval", view: "blueprints" },
  },
  discover: {
    haveReady: [
      "Talent pool membership and the candidates already known for each role",
      "Current role, level and manager for everyone being considered",
      "Who is allowed to see that a person is being considered at all",
    ],
    note: "Being added as a candidate is a hypothesis to test against the role, never a promise of promotion, and the person can be told that they are being considered.",
    step: { label: "Add a successor candidate", view: "candidates" },
  },
  evidence: {
    haveReady: [
      "Which evidence counts for this role — performance reviews, assessments, critical experiences",
      "Where that evidence lives and who can submit it",
      "Who reviews and accepts evidence before it is relied upon",
    ],
    note: "Evidence is read against the frozen requirements of the role, so a judgement can always be traced back to the standard that was in force at the time.",
    step: { label: "Review candidate evidence", view: "evidence-queue" },
  },
  deliberate: {
    haveReady: [
      "Who sits on the panel, and which seat each person holds",
      "Who records the decision and who ratifies it — never the same person",
      "The rating scale in use, with a definition for each level",
    ],
    note: "The decision record is the ratifiable artefact: candidates considered, the reason for every outcome, the panel, and the blueprint version. It is written once and corrected by a new version, never edited in place.",
    step: { label: "Open calibration", view: "calibration" },
  },
  accelerate: {
    haveReady: [
      "The readiness gaps recorded when readiness was concluded",
      "Who owns each piece of development and what time or budget is available",
      "Target dates that real work can be held to",
    ],
    note: "Development is recorded against the gap it closes, so a later readiness review can see what actually changed rather than only that time passed.",
    step: { label: "Create a development plan", view: "development-plans" },
  },
  transition: {
    haveReady: [
      "The knowledge areas the incumbent holds, and how each will be transferred",
      "System access and stakeholder handoffs that must move with the role",
      "Where documentation lives, plus start and target completion dates",
    ],
    note: "A transition cannot complete without its knowledge-transfer plan being completed or explicitly waived, and high-risk items acknowledged with a reason.",
    step: { label: "Initiate a transition", view: "transitions" },
  },
  monitor: {
    haveReady: [
      "Who triages operational alerts and how quickly",
      "How often the pipeline is reviewed and by whom",
      "When a readiness conclusion is due to be reassessed",
    ],
    note: "Alerts flag drift in the process — a stale conclusion, an empty bench, an unfinished transition — not the performance of any individual.",
    step: { label: "Review open alerts", view: "operational-monitor" },
  },
};