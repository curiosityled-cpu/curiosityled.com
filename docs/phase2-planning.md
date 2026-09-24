# Phase 2 — Succession Module Planning

## Overview

Phase 1 established the organizational and blueprint foundation: cycles, roles, positions, critical roles, blueprints, requirements, and effective snapshots — all with strict multi-tenant isolation, RLS, SoD enforcement, and immutable audit trails.

Phase 2 builds the **candidate and readiness** layer on top of this foundation: identifying successors, collecting evidence, calibrating assessments, and producing ratified readiness conclusions.

## Nine-Stage Methodology Recap

The succession cycle's `process_stage` field defines the nine stages:

| Stage | Phase | Purpose | Status |
|---|---|---|---|
| `frame` | Phase 1 | Define cycle scope, governance, participants | ✅ Complete |
| `focus` | Phase 1 | Designate critical roles, define role success blueprints | ✅ Complete |
| `blueprint` | Phase 1 | Approve blueprints, generate effective snapshots | ✅ Complete |
| `discover` | **Phase 2** | Identify candidates, assess aspiration and availability | 🔲 Next |
| `evidence` | **Phase 2** | Collect evidence against effective snapshot requirements | 🔲 Planned |
| `deliberate` | **Phase 2** | Calibrate readiness, resolve conflicts, ratify conclusions | 🔲 Planned |
| `accelerate` | Phase 3 | Development plans, gap closure, growth experiences | Future |
| `transition` | Phase 3 | Execute role transitions, handoffs, onboarding | Future |
| `monitor` | Phase 3 | Post-transition monitoring, re-assessment triggers | Future |

## Phase 2 Scope

### Stage 4: Discover — Candidate Identification

**Purpose**: Identify and enroll candidates for critical roles, assess their aspiration and availability for transition.

**New Entities**:
- `Candidate` — A person identified as a potential successor for a critical role
  - `client_id` (partition key, derived server-side)
  - `cycle_id` — SuccessionCycle ID
  - `critical_role_id` — CriticalRole ID this candidate is being considered for
  - `user_profile_id` — UserProfile ID of the candidate
  - `user_email` — Candidate email (for audit readability)
  - `aspiration_status` — enum: `not_asked`, `interested`, `open`, `not_interested`, `unknown`
  - `availability_status` — enum: `available_now`, `available_1yr`, `available_2yr_plus`, `not_available`, `unknown`
  - `nomination_source` — enum: `manager_nomination`, `self_nomination`, `hr_nomination`, `automated_identification`
  - `nominated_by_profile_id` — Profile ID of nominator (derived server-side)
  - `nominated_at` — timestamp
  - `status` — enum: `identified`, `screening`, `active`, `withdrawn`, `rejected`
  - `confidentiality_level` — standard/confidential/highly_confidential/legally_restricted
  - `integrity_status` — pending_validation/active/quarantined/resolved
  - Standard integrity envelope fields (quarantine_reason, etc.)

- `CandidateAspirationAssessment` — Records aspiration/availability conversation outcomes
  - `client_id`, `candidate_id`, `assessed_by_profile_id`, `assessed_at`
  - `aspiration_status`, `availability_status`, `notes`
  - `conversation_date`, `conversation_method` (1on1, survey, hr_interview)

**New Backend Functions**:
- `successionIdentifyCandidate` — Nominate a candidate for a critical role
- `successionAssessAspiration` — Record aspiration/availability assessment
- `successionWithdrawCandidate` — Withdraw a candidate from consideration
- `successionListCandidates` — List candidates for a cycle/critical role

**RLS**: Tenant-scoped (client_id match), create/update via dedicated functions only, delete: false (immutable audit).

**SoD**: The nominator cannot be the same person as the candidate. Manager nominations require the candidate's manager to differ from the candidate.

### Stage 5: Evidence — Evidence Collection

**Purpose**: Collect evidence demonstrating whether a candidate meets the effective snapshot requirements.

**New Entities**:
- `Evidence` — A piece of evidence linking a candidate to a snapshot requirement
  - `client_id` (partition key)
  - `candidate_id` — Candidate ID
  - `effective_snapshot_id` — EffectiveBlueprintSnapshot ID
  - `requirement_key` — The requirement_key from EffectiveRequirementSnapshot
  - `evidence_type` — enum: `performance_review`, `project_outcome`, `assessment_result`, `credential`, `observation`, `peer_feedback`, `other`
  - `evidence_description` — text description
  - `evidence_source` — enum: `internal`, `external`, `self_reported`
  - `collected_by_profile_id` — who collected it (derived server-side)
  - `collected_at` — timestamp
  - `status` — enum: `collected`, `verified`, `challenged`, `dismissed`
  - `confidence_level` — enum: `high`, `medium`, `low`
  - `confidentiality_level`, `integrity_status`, standard envelope

- `EvidenceRequirementMapping` — Links evidence to specific requirements
  - `client_id`, `evidence_id`, `requirement_key`, `alignment_strength`
  - `alignment_strength` — enum: `strong`, `partial`, `weak`, `not_aligned`

**New Backend Functions**:
- `successionCollectEvidence` — Submit evidence for a candidate
- `successionVerifyEvidence` — Verify evidence (by a different person than the collector — SoD)
- `successionChallengeEvidence` — Challenge evidence validity
- `successionListEvidence` — List evidence for a candidate/snapshot

**Key Design Principle**: Evidence is collected against the **effective snapshot** (the immutable merged requirement set), not against raw blueprint requirements. This ensures evidence is always evaluated against the exact requirements that were approved at snapshot generation time.

**SoD**: Evidence collector ≠ evidence verifier. The person who submits evidence cannot be the same person who verifies it.

### Stage 6: Deliberate — Calibration and Readiness Ratification

**Purpose**: Calibrate evidence assessments, resolve conflicts, and produce ratified readiness conclusions.

**New Entities**:
- `ReadinessAssessment` — A calibrated assessment of a candidate's readiness for a critical role
  - `client_id` (partition key)
  - `candidate_id` — Candidate ID
  - `critical_role_id` — CriticalRole ID
  - `effective_snapshot_id` — Snapshot against which readiness is assessed
  - `overall_readiness_level` — enum: `ready_now`, `ready_1yr`, `ready_2yr`, `not_ready`, `unknown`
  - `requirement_gap_summary` — object: count of met/partial/unmet requirements
  - `assessed_by_profile_id` — calibrator (derived server-side)
  - `assessed_at` — timestamp
  - `calibration_session_id` — optional: if assessed in a calibration session
  - `status` — enum: `draft`, `submitted`, `ratified`, `challenged`, `superseded`
  - `ratified_by_profile_id` — approver (must differ from assessed_by — SoD)
  - `ratified_at` — timestamp
  - `confidentiality_level`, `integrity_status`, standard envelope

- `ReadinessRequirementDetail` — Per-requirement readiness breakdown
  - `client_id`, `readiness_assessment_id`, `requirement_key`
  - `readiness_level` — enum: `meets`, `partially_meets`, `does_not_meet`, `not_assessed`
  - `evidence_ids` — array of Evidence IDs supporting this assessment
  - `assessor_notes` — text
  - `confidence_level` — high/medium/low

- `CalibrationSession` — A session where multiple candidates are calibrated together
  - `client_id`, `cycle_id`, `session_date`, `facilitator_profile_id`
  - `participant_profile_ids` — array of calibrator profile IDs
  - `candidate_ids` — array of candidates calibrated in this session
  - `status` — enum: `scheduled`, `in_progress`, `completed`, `cancelled`
  - `confidentiality_level`, `integrity_status`, standard envelope

**New Backend Functions**:
- `successionCreateReadinessAssessment` — Create a draft readiness assessment
- `successionSubmitReadinessAssessment` — Submit for ratification
- `successionRatifyReadinessAssessment` — Ratify (approve) a readiness assessment (SoD: ratifier ≠ assessor)
- `successionChallengeReadinessAssessment` — Challenge a ratified assessment
- `successionCreateCalibrationSession` — Schedule a calibration session
- `successionListReadinessAssessments` — List assessments for a cycle/candidate

**Key Design Principle**: Readiness conclusions are **ratified** (not just assessed). Ratification is a separate step by a different person (SoD), making the conclusion auditable and tamper-resistant. Once ratified, the conclusion is immutable — changes require a new assessment that supersedes the prior one.

**SoD**: Assessor ≠ Ratifier. The person who assesses readiness cannot be the same person who ratifies it.

## Phase 2 Architecture Principles (Carried from Phase 1)

1. **Tenant Isolation**: Every entity has `client_id` as the sole partition key, derived server-side. Never accepted from frontend input.

2. **Immutable Audit Records**: All Phase 2 entities will have `delete: false` and `update: false` in RLS. Only dedicated lifecycle backend functions can transition status.

3. **Separation of Duties**: Every approval/ratification step enforces submitter ≠ approver server-side. UI disables buttons for submitters.

4. **Integrity Envelope**: Every entity has `integrity_status`, `quarantine_reason`, `quarantined_at`, `quarantined_by_operation_id`, `resolution_status`, `resolved_at`, `resolved_by_profile_id`, `resolution_rationale`.

5. **Operation Tracking**: Every write operation creates a `SuccessionOperation` with `operation_id`, `payload_hash`, `actor_profile_id`, `lease_token` for idempotency and recovery.

6. **Audit Trail**: Every action emits a `SuccessionAuditEvent` with `operation_id`, `event_key`, `event_type` for deduplication and traceability.

7. **Effective Snapshot as Source of Truth**: All Phase 2 evidence and readiness assessments reference the `EffectiveBlueprintSnapshot` (immutable), not the raw blueprint. This ensures assessments are always against the exact approved requirement set.

8. **Confidentiality Levels**: All Phase 2 entities carry `confidentiality_level` (standard/confidential/highly_confidential/legally_restricted) with clearance enforcement in `authorizeSuccessionAction`.

## Phase 2 Implementation Order

### Step 1: Candidate (Discover Stage)
1. Create `Candidate` entity schema
2. Create `CandidateAspirationAssessment` entity schema
3. Implement `successionIdentifyCandidate` backend function
4. Implement `successionAssessAspiration` backend function
5. Implement `successionWithdrawCandidate` backend function
6. Implement `successionListCandidates` backend function
7. Build Candidates UI view in SuccessionWorkspace
8. Test: tenant isolation, SoD (nominator ≠ candidate), lifecycle transitions

### Step 2: Evidence (Evidence Stage)
1. Create `Evidence` entity schema
2. Create `EvidenceRequirementMapping` entity schema
3. Implement `successionCollectEvidence` backend function
4. Implement `successionVerifyEvidence` backend function (SoD: collector ≠ verifier)
5. Implement `successionChallengeEvidence` backend function
6. Implement `successionListEvidence` backend function
7. Build Evidence UI view in SuccessionWorkspace
8. Test: evidence links to effective snapshot requirements, SoD, integrity

### Step 3: Readiness (Deliberate Stage)
1. Create `ReadinessAssessment` entity schema
2. Create `ReadinessRequirementDetail` entity schema
3. Create `CalibrationSession` entity schema
4. Implement `successionCreateReadinessAssessment` backend function
5. Implement `successionSubmitReadinessAssessment` backend function
6. Implement `successionRatifyReadinessAssessment` backend function (SoD: assessor ≠ ratifier)
7. Implement `successionChallengeReadinessAssessment` backend function
8. Implement `successionCreateCalibrationSession` backend function
9. Implement `successionListReadinessAssessments` backend function
10. Build Readiness UI view in SuccessionWorkspace
11. Build Calibration Session UI
12. Test: full lifecycle from assessment → submission → ratification, SoD, immutability

### Step 4: Integration & Process Stage Advancement
1. Wire process stage advancement: `blueprint` → `discover` → `evidence` → `deliberate`
2. Add monitoring events (review-due alerts, aspiration changes, availability changes)
3. Add cross-stage validation (cannot assess readiness without evidence)
4. End-to-end integration test: cycle → role → blueprint → snapshot → candidate → evidence → readiness

## Phase 2 Success Criteria

| Criterion | Verification |
|---|---|
| Candidates can be nominated for critical roles | Tenant-scoped, SoD enforced |
| Aspiration/availability can be assessed | Immutable audit trail |
| Evidence can be collected against snapshot requirements | Links to effective snapshot, not raw blueprint |
| Evidence verification enforces SoD | Collector ≠ verifier |
| Readiness assessments can be created and submitted | Full lifecycle |
| Readiness ratification enforces SoD | Assessor ≠ ratifier |
| Ratified conclusions are immutable | Supersession requires new assessment |
| Calibration sessions can be scheduled and completed | Multi-candidate calibration |
| All Phase 2 entities have integrity envelope | Quarantine + resolution |
| All Phase 2 operations are idempotent | Operation tracking + deduplication |
| All Phase 2 actions are audited | SuccessionAuditEvent with operation_id |
| Process stage advancement works | blueprint → discover → evidence → deliberate |

## Dependencies on Phase 1

Phase 2 depends entirely on Phase 1 being complete:
- **EffectiveBlueprintSnapshot** — the immutable requirement set that evidence and readiness are assessed against
- **CriticalRole** — the position that candidates are nominated for
- **SuccessionCycle** — the cycle that contains all Phase 2 activity
- **SuccessionOperation** — the operation tracking infrastructure
- **SuccessionAuditEvent** — the audit trail infrastructure
- **authorizeSuccessionAction** — the authorization gate
- **successionAuthBootstrap** — the identity/tenant bootstrap

All of these are verified and operational from Phase 1.

## Estimated Scope

- **New entities**: 6 (Candidate, CandidateAspirationAssessment, Evidence, EvidenceRequirementMapping, ReadinessAssessment, ReadinessRequirementDetail, CalibrationSession) — actually 7
- **New backend functions**: ~14
- **New UI views**: 3 (Candidates, Evidence, Readiness/Calibration)
- **New shared modules**: Evidence-to-snapshot mapping, readiness calculation, calibration aggregation

Phase 2 is a larger scope than Phase 1 and should be implemented in stages (Discover → Evidence → Deliberate) with testing at each stage before proceeding to the next.