/**
 * Content for the in-app methodology documentation.
 *
 * Kept beside the stage configuration rather than duplicating it: the stage list
 * is read from stageConfig, and the exit criteria below are keyed by stage so a
 * renamed stage shows up as a missing criterion instead of a silent mismatch.
 */

export const METHOD_PRINCIPLES = [
  {
    title: "Assess the role before the person",
    body: "Every cycle starts by fixing what a role requires. Candidates are then assessed against that, not against each other, so the standard is visible and can be argued with.",
  },
  {
    title: "Evidence before opinion",
    body: "A readiness conclusion has to point at evidence: performance, observed competency behaviour, or a critical experience. A conclusion with no evidence behind it cannot pass the pre-deliberation data-quality gate.",
  },
  {
    title: "Two people, not one",
    body: "The person who records a decision can never ratify it. Separation of duties is enforced on the server, not asked for in a policy document.",
  },
  {
    title: "The record is the artefact",
    body: "Decisions, readiness conclusions, notices, holds, and cycle events are written once and never edited. A correction is a new version that supersedes the old one and leaves it readable.",
  },
  {
    title: "No automated judgement",
    body: "Nothing in the method scores, ranks, or selects a person automatically. Where AI assists, it drafts language for a human to accept, edit, or discard, and it never writes to an immutable record.",
  },
];

export const STAGE_EXIT_CRITERIA = {
  frame:
    "A cycle exists with a name, a key, a timeframe, and a scope. Owners are identified and the cycle is moved out of draft.",
  focus:
    "Organizational roles and positions are defined, and the roles that carry strategic or vacancy risk are designated critical.",
  blueprint:
    "Each critical role has requirements, an approved blueprint, and a published effective snapshot that later conclusions are measured against.",
  discover:
    "Talent pools exist and candidacies are recorded for the roles in scope. Every candidacy names a profile that belongs to the tenant.",
  evidence:
    "Evidence is submitted against the frozen requirements and reviewed. The pre-deliberation data-quality gate reports enough coverage to open calibration.",
  deliberate:
    "A readiness conclusion is proposed, calibrated, and ratified by a second authority, then a decision record is ratified for each role in scope.",
  accelerate:
    "Development plans and development actions exist for every gap the decision named, each with an owner and a date.",
  transition:
    "The transition is initiated and approved, a knowledge transfer plan is complete with every area closed or waived with a reason, and high-severity risks are acknowledged before closing.",
  monitor:
    "Alerts are triaged, the cycle report is generated, and the cycle is closed or carried into the next period with its history intact.",
};

export const GATES = [
  {
    name: "Pre-deliberation data-quality gate",
    blocks: "Calibration opening",
    detail:
      "Calibration cannot open on insufficient evidence. The gate reports coverage per candidate and per requirement, and names what is missing.",
  },
  {
    name: "Frozen requirements",
    blocks: "Assessing against a moving standard",
    detail:
      "Conclusions are recorded against an effective blueprint snapshot. Editing a blueprint afterwards does not change what a past conclusion meant.",
  },
  {
    name: "Separation of duties",
    blocks: "Self-approval",
    detail:
      "Recording and ratifying are different seats. The server rejects a ratification by the person who recorded the decision or proposed the conclusion.",
  },
  {
    name: "Knowledge-transfer completion",
    blocks: "Closing a transition",
    detail:
      "A transition will not close while a knowledge area is untouched. Areas may be waived, but only with a recorded reason.",
  },
  {
    name: "High-risk acknowledgement",
    blocks: "Closing a transition with open high-severity risk",
    detail:
      "Any high-severity risk still open must be acknowledged in writing before the transition closes, so it is carried forward knowingly rather than forgotten.",
  },
  {
    name: "Legal hold",
    blocks: "Purging, archiving, withdrawing, or superseding held records",
    detail:
      "A hold freezes the records it covers regardless of retention windows. Holding and releasing both require a reason and are written to the audit history.",
  },
];

export const EVIDENCE_RULES = [
  "Evidence is attached to a requirement, never to a general impression of the person.",
  "Each piece of evidence records who submitted it, when, and what it is evidence of.",
  "Conflict-of-interest disclosures are recorded alongside evidence where the contributor is close to the candidate.",
  "Evidence can be withdrawn or superseded, but the withdrawal is kept: what was used at the time remains reconstructable.",
  "Imported and external evidence is labelled with its source, so a panel knows what it is weighing.",
];

export const DECISION_RULES = [
  "One decision record per role per cycle states which candidates were considered and why each outcome applied to them.",
  "Every considered candidate carries a recorded reason, including the one selected.",
  "The panel is on the record, so human accountability for the decision is attributable.",
  "A decision is awaiting ratification until a second authority countersigns it, and can be returned with what must change.",
  "A correction is a new version that supersedes the prior record; the earlier decision stays readable exactly as taken.",
];

export const NOT_DONE = [
  "No forced distribution, nine-box, or ranking of people.",
  "No automatic selection, scoring, or 'best candidate' recommendation.",
  "No protected demographic attribute is ever joined to a name on screen or used to reach a conclusion.",
  "No record is deleted at the end of its retention window; it is archived and stays readable.",
  "No decision is final on one person's authority.",
];

export const RECORD_KEPT = [
  {
    title: "Cycle events",
    body: "An append-only history of every consequential step: configuration, launch, submission, calibration, release, hold, export.",
  },
  {
    title: "Decision records",
    body: "The ratifiable artefact for each role: candidates considered, reasons, panel, blueprint snapshot, recorder, and ratifier.",
  },
  {
    title: "Candidate notices",
    body: "What each candidate was told, in which version, and when it was delivered and acknowledged.",
  },
  {
    title: "Legal holds and sealed data",
    body: "Holds with their reasons, and sealed demographic sets with their consent basis and purge date.",
  },
];