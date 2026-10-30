# Succession Planning Methodology

This document describes the succession method as Curiosity Led enforces it, for HR
leaders, procurement, legal, and audit audiences. It is a description of the running
system, not an aspiration: every gate described here is enforced on the server, and
every record described here exists as a tenant-scoped entity.

---

## 1. What problem the method solves

Organisations are usually able to produce a list of "high potentials". They are much
less able to answer, six months later, why a particular person was judged ready for a
particular role, who agreed, what evidence was weighed, and what happened next.

The method is built to answer those four questions for every role in every cycle:

1. What was the role's standard, and when was it fixed?
2. What evidence was weighed against that standard?
3. Who concluded what, and who countersigned it?
4. What did the organisation do about the gaps the conclusion named?

## 2. Principles

**Assess the role before the person.** A cycle fixes what a role requires (a role
success blueprint) and publishes an effective snapshot. Candidates are assessed
against that snapshot, never against each other. This removes the ranking dynamic
that makes succession politically expensive.

**Evidence before opinion.** A readiness conclusion must point at evidence attached
to a requirement. A conclusion with insufficient coverage cannot reach deliberation;
the pre-deliberation data-quality gate blocks it.

**Two people, not one.** The person who records a decision can never ratify it.
Separation of duties is checked server-side, not requested in a policy.

**The record is the artefact.** Decisions, conclusions, notices, holds, and cycle
events are append-only. A correction is a new version that supersedes the prior one
and leaves it readable.

**No automated judgement.** Nothing scores, ranks, or selects a person automatically.
Where AI assists, it drafts language for a human to accept, edit, or discard, and it
never writes to an immutable record.

## 3. The nine stages

Each cycle advances through nine stages. A stage's exit condition is the definition
of done for that stage; the workspace reports the current stage from the cycle record
rather than from navigation state, so two administrators see the same position.

| Stage | Purpose | Exits when |
| --- | --- | --- |
| Frame | Establish cycle scope, timeframe, and business drivers | The cycle exists with name, key, timeframe, and scope, and owners are identified |
| Focus | Define organizational roles and positions | Roles carrying strategic or vacancy risk are designated critical |
| Blueprint | Define what "ready" looks like | Each critical role has approved requirements and a published effective snapshot |
| Discover | Identify candidates | Talent pools exist and candidacies are recorded against in-scope roles |
| Evidence | Collect and review evidence | Evidence is reviewed against frozen requirements and the data-quality gate reports enough coverage |
| Deliberate | Calibrate, ratify readiness, record decisions | Readiness conclusions are ratified by a second authority and a decision record is ratified per role |
| Accelerate | Close the gaps the decision named | Development plans and actions exist for each named gap, with owner and date |
| Transition | Execute the move | Transition approved, knowledge transfer complete, high-severity risks acknowledged |
| Monitor | Keep the pipeline current | Alerts triaged, cycle report generated, cycle closed or carried forward |

## 4. Gates enforced by the system

| Gate | Blocks | Behaviour |
| --- | --- | --- |
| Pre-deliberation data-quality gate | Opening calibration | Refuses to open calibration while evidence coverage is insufficient; names what is missing |
| Frozen requirements | Assessing against a moving standard | Conclusions attach to a blueprint snapshot; later blueprint edits do not rewrite history |
| Separation of duties | Self-approval | Ratification by the recorder is rejected by the server |
| Knowledge-transfer completion | Closing a transition | Refused while a knowledge area is untouched; areas may be waived only with a recorded reason |
| High-risk acknowledgement | Closing a transition with open high-severity risk | Refused until the risk is acknowledged in writing, so it is carried forward knowingly |
| Legal hold | Purging, archiving, withdrawing, or superseding | Held records are frozen regardless of retention window; placing and releasing require a reason |

## 5. Evidence rules

- Evidence attaches to a requirement, not to a general impression of a person.
- Every piece records who submitted it, when, and what it is evidence of.
- Conflict-of-interest disclosures are recorded where a contributor is close to the candidate.
- Withdrawal and supersession are themselves recorded, so what was relied on at the time stays reconstructable.
- Imported and external evidence is labelled with its source.

Sealed demographic attributes are held in a separate, legally restricted record set.
They are never displayed beside a name, never used to reach a readiness conclusion,
and are joined to outcomes only in aggregate, to test for adverse impact. Attribute
values can be purged on request; the purge is recorded even though the values are
gone.

## 6. Decision rules

- One decision record per role per cycle states which candidates were considered and
  the reason for each outcome, including the selected candidate.
- The panel is on the record, so human accountability is attributable.
- A decision is `awaiting_ratification` until countersigned, and can be returned with
  what must change.
- A correction is a new version that supersedes the prior record; the earlier decision
  remains readable exactly as taken.

## 7. What the method deliberately does not do

- No forced distribution, nine-box, or ranking of people.
- No automatic selection, scoring, or "best candidate" recommendation.
- No demographic attribute joined to a name on screen or used in a conclusion.
- No record deleted at the end of its retention window (records are archived and stay readable).
- No decision final on one person's authority.

## 8. Records and retention

| Record | Contents |
| --- | --- |
| Cycle events | Append-only history of configuration, launch, submission, calibration, release, hold, and export |
| Decision records | Candidates considered, reasons, panel, blueprint snapshot, recorder, and ratifier |
| Candidate notices | What each candidate was told, in which version, when delivered and acknowledged |
| Legal holds | Scope, matter reference, reason, who placed and released it, and when |
| Sealed demographics | Consent basis, collection source, attributes, and purge date |

Records past their retention window are archived with the rule that applied. A legal
hold overrides retention entirely. Nothing is hard-deleted by scheduled process.

## 9. Roles

| Role | Responsibility |
| --- | --- |
| Programme administrator | Configures the cycle, roles, blueprints, and gates |
| Calibrator | Reaches and defends readiness conclusions in calibration |
| Ratifying authority | Countersigns conclusions and decisions; never the recorder |
| Line manager | Contributes evidence, owns development actions, hosts knowledge transfer |
| Candidate | Can be shown what is held and what conclusion it supported |
| Compliance administrator | Places and releases legal holds; runs adverse-impact analysis |

The manager enablement kit, available in the succession workspace, covers what is asked
of line managers at each stage and how to hold the five conversations that carry the
method: evidence, readiness, development, hand-over, and "not yet".