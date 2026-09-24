# Phase 1 V4 Revision & Snapshot 4 Validation Checkpoint

**Date:** 2026-09-24
**Status:** ✅ Complete
**Scope:** V4 blueprint versioning, requirement revision tracing, CriticalRoleRequirement revision support, Snapshot 4 generation, SoD UI wiring

---

## Summary

This checkpoint validates the full V4 revision lifecycle: creating revised canonical requirements and CriticalRoleRequirements under a new blueprint version, binding them to the exact V4 blueprint via `source_blueprint_id` / `base_blueprint_id` + `base_blueprint_version_number`, generating Snapshot 4 from the merged effective blueprint, and wiring separation-of-duties into the UI.

---

## Bugs Fixed During V4 Work

### 1. `successionCreateRoleRequirementRevision` — org_role_id mismatch
- **Symptom:** Canonical requirement revisions were created with `org_role_id` set to the prior requirement's `blueprint_id`, breaking the OrgRole link.
- **Root cause:** The function passed `prior.blueprint_id` into the `org_role_id` field instead of resolving the actual OrgRole from the destination blueprint.
- **Fix:** Resolve `org_role_id` from the destination draft blueprint's `org_role_id` field before creating the revision. Also set `source_blueprint_id` and `source_blueprint_version` from the prior requirement's blueprint.

### 2. `successionCreateCriticalRoleRequirementRevision` — missing carry-forward of modification_type and base binding
- **Symptom:** V4 CRR revisions lost their `modification_type`, `base_requirement_id`, `base_blueprint_id`, and `base_blueprint_version_number`, breaking source tracing.
- **Root cause:** The function only created the revision with `requirement_text`, `revises_requirement_id`, and `revision_number` — it did not carry forward the modification type or base binding fields.
- **Fix:** Carry forward `modification_type` from the prior CRR. Carry forward `base_requirement_id`, `base_blueprint_id`, and `base_blueprint_version_number` from the prior CRR, allowing caller override (for V4, the base bindings are updated to point to V4 canonical requirements).

### 3. `successionApproveCriticalRoleRequirement` — missing separation-of-duties enforcement
- **Symptom:** A user could approve a CRR they themselves submitted, violating separation of duties.
- **Root cause:** The function did not compare `submitted_by_profile_id` with the approver's `profile_id`.
- **Fix:** Added a SoD check: if `req.submitted_by_profile_id === auth.profile_id`, the function fails the operation with `separation_of_duties_violation` and returns a 409 error.

---

## V4 Workflow Execution

### V4 Blueprint Draft
- **Blueprint ID:** `6ab56909e47a6d17c4b98784`
- **OrgRole:** `6ab561e704e889417a107b10` (VP of Engineering)
- **Version label:** v4-revised

### V4 Canonical Requirements (6 total)
| # | Type | Text (abbreviated) | Source |
|---|------|--------------------|--------|
| 1 | competency | Strong stakeholder communication... | V4 new (6ab56947ed4e1276e1798af9) |
| 2 | experience | Minimum 10 years engineering leadership... | V4 revision of V3 req (6ab569455978d17cc3ec4d57) |
| 3 | credential | Bachelor's degree in CS or equivalent... | V4 revision of V3 req (6ab5691f72c2006b154adb92) |
| 4 | outcome | Track record of enterprise-scale delivery... | V4 revision of V3 req (6ab5691f793762f26778ab52) |
| 5 | competency | Demonstrated ability to lead cross-functional teams... | V4 revision of V3 req (6ab5691f88ce81dd7b52c8f2) |
| 6 | credential | Master's degree in Business Administration preferred... | V4 new (6ab5691f6c3565e496f45429) |

### V4 Blueprint Approval
- **Submitted by:** submitter profile (separation of duties enforced — submitter ≠ approver)
- **Approved by:** approver profile
- **OrgRole.blueprint_approval_revision:** incremented to **4**
- **V3 blueprint:** superseded (status=superseded, is_current=false)
- **V3 canonical requirements:** superseded (status=superseded) — immutable, preserved for audit
- **V3 CriticalRoleRequirements:** marked `stale_for_future_snapshots` (stale_since_blueprint_id=V4, stale_marked_at set) — preserved unchanged, excluded from future snapshots

### V4 CriticalRoleRequirements (4 revisions, all approved)
| # | Modification Type | Base Binding | Revises |
|---|-------------------|-------------|---------|
| 1 | new_requirement | none | V3 CRR (tech stack) |
| 2 | modification | V4 canonical cross-functional (6ab5691f88ce81dd7b52c8f2), bp=V4, ver=4 | V3 CRR |
| 3 | approved_exception | V4 canonical BSCS (6ab5691f72c2006b154adb92), bp=V4, ver=4 | V3 CRR |
| 4 | not_applicable | V4 canonical enterprise (6ab5691f793762f26778ab52), bp=V4, ver=4 | V3 CRR |

---

## Snapshot 4 — Effective Blueprint

- **Snapshot ID:** `6ab569becbc77426e196c8c0`
- **Status:** `generated`
- **Blueprint:** V4 (`6ab56909e47a6d17c4b98784`), revision 4
- **Expected requirement count:** 7
- **Generated requirement count:** 7 ✅ (match)
- **Requirements content hash:** `c0d4838df759af6c902a28a069150baa7a64ebacfc3db4e6cd8d9f1ff50a5d35`

### Snapshot 4 Merge Table
| # | Source | Modification | Applicability | Base Requirement | Base Blueprint | Base Ver |
|---|--------|-------------|--------------|------------------|----------------|----------|
| 1 | canonical | canonical | applicable | 6ab56947ed4e1276e1798af9 | V4 | 4 |
| 2 | canonical | canonical | applicable | 6ab569455978d17cc3ec4d57 | V4 | 4 |
| 3 | canonical | canonical | **excepted** | 6ab5691f72c2006b154adb92 | V4 | 4 |
| 4 | canonical | canonical | **not_applicable** | 6ab5691f793762f26778ab52 | V4 | 4 |
| 5 | position_specific | modification | applicable | 6ab5691f88ce81dd7b52c8f2 | V4 | 4 |
| 6 | canonical | canonical | applicable | 6ab5691f6c3565e496f45429 | V4 | 4 |
| 7 | position_specific | new_requirement | applicable | null | V4 | 4 |

**Key observations:**
- All 6 canonical requirements present in the snapshot (4 from V4 revisions, 2 new V4)
- All base bindings point to V4 blueprint at version 4 ✅
- Position-specific modification (cross-functional) correctly replaces canonical #5's language while preserving the base binding
- Approved exception (BSC) correctly marks canonical #3 as `excepted`
- Not-applicable determination correctly marks canonical #4 as `not_applicable`
- New position-specific requirement (tech stack) added with no base binding (null) ✅

---

## Snapshot 3 Immutability Verification

- **Snapshot ID:** `6ab563645e99e8f6b1a3352d`
- **Status:** `generated` (unchanged)
- **Blueprint:** V3 (`6ab562394535569d357a91cd`), revision 1
- **Expected/Genderated count:** 1/1 ✅ (correct — only 1 CRR was applicable at V3 generation time)
- **Requirements content hash:** `13d51481d348cd37b2511cd298ef1db0935049f84c22be187471c79dfd9df588` (unchanged)
- **Result:** Snapshot 3 remains immutable after V4 approval ✅

---

## Quarantined Snapshots (S1, S2)

- **Snapshot 1:** quarantined via SnapshotIntegrityIncident (anomaly_type=missing_requirements)
- **Snapshot 2:** quarantined via SnapshotIntegrityIncident (anomaly_type=missing_requirements)
- **operational_use_blocked:** true for both
- **Reason:** Incomplete canonical requirement lifecycle and lack of separation of duties in earlier iterations

---

## Separation of Duties — UI Wiring

### Backend Enforcement
- **Blueprint approval** (`successionApproveBlueprint`): Already enforces SoD — rejects if `submitted_by_profile_id === auth.profile_id`.
- **CRR approval** (`successionApproveCriticalRoleRequirement`): **NEW** — now enforces SoD with the same check.

### UI Wiring
- **BlueprintsView:** The `BlueprintRow` component receives `userId` from `useAuth()`. If `blueprint.submitted_by_profile_id === userId`, the Approve button is disabled and "You submitted this" is displayed.
- **CriticalRolesView:** The `RequirementRow` component receives `userId` from `useAuth()`. If `requirement.submitted_by_profile_id === userId`, the Approve button is disabled and "You submitted this" is displayed.

---

## Validation Summary

| Check | Result |
|-------|--------|
| V4 blueprint created and approved | ✅ |
| Separation of duties enforced — blueprint (backend) | ✅ |
| Separation of duties enforced — CRR (backend) | ✅ NEW |
| Separation of duties wired — blueprint (UI) | ✅ NEW |
| Separation of duties wired — CRR (UI) | ✅ NEW |
| V3 blueprint superseded, V4 current | ✅ |
| V3 canonical requirements superseded (immutable) | ✅ |
| V3 CRRs marked stale_for_future_snapshots | ✅ |
| V4 canonical requirements bind to V4 blueprint | ✅ |
| V4 CRR revisions carry forward modification_type + base binding | ✅ |
| V4 CRR base bindings updated to V4 canonical requirements | ✅ |
| Snapshot 4 generated with correct merge (7 requirements) | ✅ |
| Snapshot 4 expected == generated count | ✅ |
| Snapshot 4 all base bindings point to V4 / version 4 | ✅ |
| Snapshot 3 immutability verified (hash unchanged) | ✅ |
| Quarantined snapshots (S1, S2) remain blocked | ✅ |

---

## Open Items

1. ~~**UI wiring for separation of duties**~~ — ✅ **DONE.** Both backend functions enforce SoD, and both UI views disable the Approve button for the submitter.
2. **UI controls for Critical Roles** — The CriticalRolesView designation UI is still a placeholder. Needs controls for designating (criticality_level, governance_tier, continuity_urgency), pausing, removing, and managing CriticalRoleRequirements (create/submit/approve/revise with modification_type and base binding).
3. ~~**Snapshot 3 count discrepancy**~~ — ✅ **RESOLVED.** Snapshot 3 legitimately has 1 requirement (only the tech-stack CRR was applicable at V3 generation time). Counts match (1=1), hash is correct, snapshot is immutable. The earlier "discrepancy" was a verification-code mapping bug.

---

## Conclusion

The V4 revision lifecycle is fully functional: canonical requirements and CriticalRoleRequirements can be revised under a new blueprint version with full source tracing, the effective blueprint snapshot correctly merges V4 canonical requirements with V4 position-specific requirements, prior snapshots remain immutable, and separation of duties is now enforced both in the backend and wired into the UI for both blueprint and CRR approval workflows.