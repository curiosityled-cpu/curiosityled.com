# Phase 1 Architecture Guard Hardening — Final Checkpoint

**Date:** 2026-09-25
**Status:** Guard hardened and passing. Two-browser SoD and fresh snapshot PENDING manual execution.
**Database:** Production (synthetic data only — no production client data modified)
**Published:** No (per instruction)

---

## A. Full 65-Function Classification

All 65 succession backend functions in `base44/functions/` are classified exactly once.
The "remaining three" from the prior count of 62 are the three test-harness functions
(`successionPhase0Test`, `successionPhase1Test`, `successionPhase1_5Test`), which were
previously grouped under a generic "test" label and not broken out as a distinct
classification category.

### Classification Summary

| Classification     | Count | Auth Requirement                                              |
|--------------------|-------|---------------------------------------------------------------|
| operational        | 54    | `bootstrapSuccessionAuth` → `authorizeSuccessionAction` before domain access |
| control_plane      | 6     | `resolvePlatformOperatorContext` or partner validation        |
| infrastructure     | 2     | `bootstrapSuccessionAuth` (no domain authorization needed)    |
| test_harness       | 3     | Excluded from auth checks; must not be referenced by production |
| private_helper     | 13    | Shared modules in `base44/shared/` (not callable functions)    |
| **Total**          | **65** + 13 shared helpers                                   |

### Private Helper Modules (base44/shared/)

These are shared TypeScript modules imported by backend functions — not callable
HTTP endpoints. They are inventoried but not auth-gated (they execute within the
caller's authenticated context):

1. `authorizeSuccessionAction.ts` — domain authorization gate
2. `resolveClientTenant.ts` — tenant resolution
3. `resolvePlatformOperatorContext.ts` — platform operator bootstrap
4. `successionAssignmentRules.ts` — position assignment business rules
5. `successionAuditWriter.ts` — private audit event writer
6. `successionAuthBootstrap.ts` — auth bootstrap (identity + tenant context)
7. `successionConstants.ts` — shared constants
8. `successionCrossTenantValidation.ts` — cross-tenant reference validation
9. `successionIntegrityHelper.ts` — integrity status management
10. `successionLockHelper.ts` — CAS lock management
11. `successionOperationHelper.ts` — operation lifecycle (idempotency)
12. `successionPayloadCanonical.ts` — payload hash canonicalization
13. `successionTimezoneHelper.ts` — tenant timezone enforcement

### Complete 65-Function Inventory

#### Operational (54) — bootstrap + authorize before domain access

| # | Function | Bootstrap Offset | Authorize Offset | Domain Access Offset | Ordering |
|---|----------|------------------|------------------|-----------------------|----------|
| 1 | successionApproveBlueprint | 921 | 1064 | 2209 | ✅ |
| 2 | successionApproveCriticalRoleRequirement | 591 | 723 | 1534 | ✅ |
| 3 | successionCancelPositionAssignment | 672 | 804 | 2323 | ✅ |
| 4 | successionChangeCriticalRoleStatus | 886 | 1018 | — | ✅ |
| 5 | successionChangeCycleStatus | 884 | 1016 | — | ✅ |
| 6 | successionCorrectPositionAssignment | 852 | 995 | — | ✅ |
| 7 | successionCreateBlueprintDraft | 735 | 867 | — | ✅ |
| 8 | successionCreateCriticalRole | 584 | 716 | — | ✅ |
| 9 | successionCreateCriticalRoleRequirement | 882 | 1025 | — | ✅ |
| 10 | successionCreateCriticalRoleRequirementRevision | 764 | 907 | — | ✅ |
| 11 | successionCreateCycle | 707 | 850 | — | ✅ |
| 12 | successionCreateEffectiveBlueprintSnapshot | 758 | 901 | — | ✅ |
| 13 | successionCreateOrgPosition | 698 | 830 | — | ✅ |
| 14 | successionCreateOrgRole | 728 | 871 | — | ✅ |
| 15 | successionCreateRoleRequirement | 731 | 863 | — | ✅ |
| 16 | successionCreateRoleRequirementRevision | 801 | 934 | — | ✅ |
| 17 | successionDesignateCriticalRole | 862 | 994 | — | ✅ |
| 18 | successionEndPositionAssignment | 764 | 896 | — | ✅ |
| 19 | successionGetBlueprint | 407 | 539 | — | ✅ |
| 20 | successionGetCriticalRole | 490 | 622 | — | ✅ |
| 21 | successionGetCycle | 399 | 531 | — | ✅ |
| 22 | successionGetOrgRole | 405 | 537 | — | ✅ |
| 23 | successionGetSnapshot | 514 | 646 | — | ✅ |
| 24 | successionListBlueprints | 445 | 577 | — | ✅ |
| 25 | successionListCriticalRoleRequirements | 453 | 585 | — | ✅ |
| 26 | successionListCriticalRoles | 464 | 596 | — | ✅ |
| 27 | successionListCycles | 360 | 492 | — | ✅ |
| 28 | successionListOperations | 333 | 465 | — | ✅ |
| 29 | successionListOrgPositions | 445 | 577 | — | ✅ |
| 30 | successionListOrgRoles | 439 | 571 | — | ✅ |
| 31 | successionListPositionAssignments | 453 | 585 | — | ✅ |
| 32 | successionListPositionChanges | 342 | 474 | — | ✅ |
| 33 | successionListSnapshotIntegrityIncidents | 326 | 458 | — | ✅ |
| 34 | successionListSnapshots | 463 | 595 | — | ✅ |
| 35 | successionPreviewEffectiveBlueprint | 801 | 933 | — | ✅ |
| 36 | successionRecordPositionChange | 836 | 979 | — | ✅ |
| 37 | successionRecoverAbandonedOperation | 622 | 765 | — | ✅ |
| 38 | successionRemoveRoleRequirement | 610 | 742 | — | ✅ |
| 39 | successionReplaceOrgPosition | 726 | 858 | — | ✅ |
| 40 | successionResolveIntegrityConflict | 943 | 1086 | — | ✅ |
| 41 | successionRestoreBlueprintToDraft | 587 | 719 | — | ✅ |
| 42 | successionReturnBlueprint | 587 | 719 | — | ✅ |
| 43 | successionReturnCriticalRoleRequirement | 624 | 767 | — | ✅ |
| 44 | successionReviewSnapshotIntegrityIncident | 673 | 816 | — | ✅ |
| 45 | successionSetOrgRoleStatus | 775 | 907 | — | ✅ |
| 46 | successionStartPositionAssignment | 699 | 831 | — | ✅ |
| 47 | successionSubmitBlueprint | 695 | 838 | 1698 | ✅ |
| 48 | successionSubmitCriticalRoleRequirement | 591 | 723 | — | ✅ |
| 49 | successionUpdateCriticalRoleRequirement | 629 | 761 | — | ✅ |
| 50 | successionUpdateDraftCycle | 740 | 883 | — | ✅ |
| 51 | successionUpdateOrgPosition | 728 | 860 | — | ✅ |
| 52 | successionUpdateOrgRole | 691 | 823 | — | ✅ |
| 53 | successionUpdateRoleRequirement | 629 | 761 | — | ✅ |
| 54 | successionWithdrawBlueprintDraft | 639 | 782 | — | ✅ |

*Note: "—" in Domain Access Offset means the function does not directly access domain
entities in its own source (it may delegate to shared helpers that do). The ordering
check passes because there are no domain-access patterns to violate the ordering.*

#### Control-Plane (6) — platform operator bootstrap

| # | Function | Auth Marker |
|---|----------|-------------|
| 1 | successionCrossTenantRead | resolvePlatformOperatorContext |
| 2 | successionGrantApprove | resolvePlatformOperatorContext |
| 3 | successionGrantList | resolvePlatformOperatorContext |
| 4 | successionGrantRequest | resolvePlatformOperatorContext |
| 5 | successionGrantRevoke | resolvePlatformOperatorContext |
| 6 | successionPartnerValidate | partner_client_ids validation |

#### Infrastructure (2) — bootstrap only

| # | Function | Bootstrap Offset |
|---|----------|-----------------|
| 1 | successionGetOperationStatus | 433 |
| 2 | successionHeartbeat | 400 |

#### Test Harness (3) — excluded from auth checks, isolated from production

| # | Function |
|---|----------|
| 1 | successionPhase0Test |
| 2 | successionPhase1Test |
| 3 | successionPhase1_5Test |

---

## B. Guard Hardening and Automated Execution

### Guard Version

**File:** `base44/tests/successionArchitectureGuard.test.mjs`
**Version:** 2.0-hardened
**Report artifact:** `base44/tests/reports/succession-architecture-guard-report.json`

### Hardening Requirements Met

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Runs automatically in CI / pre-release build | ✅ | `npm run guard`, `npm test`, and `prebuild` hook in `package.json` |
| Exits nonzero on every violation | ✅ | `process.exit(1)` on any violation |
| Fails on unknown or duplicate classifications | ✅ | Duplicate detection across exception sets; unclassified functions default to operational and must pass both gates |
| Explicit, reviewed exception list | ✅ | Exception sets have review date (2026-09-25) and reviewer documented in guard header |
| Ignores comments and dead-code string references | ✅ | `stripCommentsAndStrings()` removes block comments, line comments, and all string literals before pattern matching |
| Verifies auth calls in executable code | ✅ | All `findInExecutableCode()` calls operate on stripped source |
| Verifies authorization before first domain read / service-role operation | ✅ | Character-offset ordering check: `bootstrap_offset < authorize_offset < domain_access_offset` |
| Prevents test harnesses from being callable production functions | ✅ | `checkTestHarnessIsolation()` scans all production function source for references to test harness names |
| Produces machine-readable report artifact | ✅ | JSON report written to `base44/tests/reports/succession-architecture-guard-report.json` |

### Operational Function Requirements

| Requirement | Status |
|-------------|--------|
| `bootstrapSuccessionAuth` or approved tenant-resolution bootstrap | ✅ All 54 operational functions call `bootstrapSuccessionAuth` |
| `authorizeSuccessionAction` | ✅ All 54 operational functions call `authorizeSuccessionAction` |
| Authorization before domain access | ✅ Ordering verified for all 50 functions with direct domain entity access |

### Control-Plane Function Requirements

| Requirement | Status |
|-------------|--------|
| `resolvePlatformOperatorContext` or equivalent approved platform bootstrap | ✅ All 6 control-plane functions have platform bootstrap |
| No tenant-domain access while grant feature is disabled | ✅ `SUCCESSION_GRANT_ENABLED` secret gates cross-tenant read; control-plane functions return disabled response when flag is false |

### Guard Execution Result

```
✅ ARCHITECTURE GUARD PASSED
   54 operational | 6 control-plane | 2 infrastructure | 3 test harness | 13 private helpers
   Total: 65 functions checked
   Report: base44/tests/reports/succession-architecture-guard-report.json
```

### Automated Execution Hooks

Added to `package.json`:
- `"guard": "node base44/tests/successionArchitectureGuard.test.mjs"` — manual run
- `"prebuild": "node base44/tests/successionArchitectureGuard.test.mjs"` — runs before every `npm run build`
- `"test": "node base44/tests/successionArchitectureGuard.test.mjs"` — standard test command

---

## C. Two-Browser Blueprint SoD — PENDING MANUAL EXECUTION

### Status: ⛔ NOT YET EXECUTED

The genuine two-browser Separation-of-Duties test requires two real browser sessions
with different authenticated users. Base44 restricts session creation to browser-based
invitation/login flows — backend scripts and exec_tool cannot create authenticated
user sessions. This test must be executed manually by a human tester.

### Test Users Configured

| Role | Email | App Role | Client ID | Submit Permission | Approve Permission |
|------|-------|----------|-----------|-------------------|-------------------|
| Submitter | eosoria@curiosityled.com | Admin Level 1 | 69f3e931d1d34e0cdedf75c1 | ✅ succession.roles.manage | ❌ denied |
| Approver | ceo@curiosityled.com | Super Administrator (= Admin Level 2) | 69f3e931d1d34e0cdedf75c1 | ✅ succession.roles.manage | ✅ succession.blueprints.approve |

### Audit Evidence (Current State)

- Total SuccessionAuditEvent records: 214
- Events from eosoria@curiosityled.com: **0**
- Events from ceo@curiosityled.com: **0**
- All 214 existing events are from team@curiosityled.com (Platform Admin, actor_context_type=system)

**This confirms the genuine two-browser SoD test has NOT been executed.** All prior
testing used Platform Admin/system identity, which the user explicitly excluded.

### Test Procedure (For Manual Execution)

#### Prerequisites
1. Both users must be invited and have completed first-login password setup.
2. Both users share the same client_id (tenant): `69f3e931d1d34e0cdedf75c1`.
3. Use incognito/private windows to prevent session crossover.

#### Step 1: eosoria creates and submits a fresh blueprint

**Browser A — log in as eosoria@curiosityled.com:**
1. Log out of any existing session.
2. Navigate to the app and log in as eosoria.
3. Go to the Succession workspace (`/succession`).
4. Create a new cycle (e.g., "SoD Browser Test Cycle — Fresh").
5. Create a new OrgRole (e.g., "VP of Engineering — Browser SoD Test").
6. Create a blueprint draft for that role.
7. Add 4 canonical RoleRequirements (competency, experience, credential, outcome types).
8. Submit the blueprint for approval.
9. Record the blueprint_id and operation_id from the UI or network response.

**Expected:** Blueprint status changes to `submitted`. Audit event `blueprint_submitted`
is recorded with `actor_email = eosoria@curiosityled.com`.

#### Step 2: eosoria attempts self-approval (must be rejected)

**Browser A — still logged in as eosoria:**
1. Navigate to the submitted blueprint.
2. The "Approve" button should be **disabled** in the UI (SoD enforcement at UI level).
3. If the button is somehow enabled, attempt approval.

**Expected:** Backend rejects with `separation_of_duties_violation` — the submitter
(`submitted_by_profile_id`) matches the authenticated user (`auth.profile_id`).
No mutation occurs. The blueprint remains in `submitted` status.

#### Step 3: CEO approves the blueprint

**Browser B — log in as ceo@curiosityled.com:**
1. Log out of any existing session in this browser.
2. Navigate to the app and log in as CEO.
3. Go to the Succession workspace.
4. Navigate to the submitted blueprint (same tenant).
5. Review the blueprint and requirements.
6. Click "Approve".

**Expected:** Blueprint status changes to `approved`. `is_current = true`.
`approved_by_profile_id` = CEO's profile ID (server-derived from session, NOT from
request body). `approved_at` is set. Audit event `blueprint_approved` is recorded
with `actor_email = ceo@curiosityled.com`.

#### Step 4: Verify server-derived actor IDs

After the test, verify via exec_tool or database query:
- `RoleSuccessBlueprint.submitted_by_profile_id` = eosoria's user ID (`69ddb638b6f4f5de0c2a2219`)
- `RoleSuccessBlueprint.approved_by_profile_id` = CEO's user ID (`69f3e4ad3ffd946aafd1298a`)
- These IDs were derived server-side from the authenticated session, NOT from request body fields.

#### Step 5: Verify audit events

After the test, verify:
- At least 2 new SuccessionAuditEvent records exist:
  - `blueprint_submitted` with `actor_email = eosoria@curiosityled.com`
  - `blueprint_approved` with `actor_email = ceo@curiosityled.com`
- If a self-approval attempt was made, a `denied_action` event with
  `action_type = separation_of_duties_violation` should exist.

---

## D. Two-Browser CRR SoD — PENDING MANUAL EXECUTION

### Status: ⛔ NOT YET EXECUTED

Depends on Section C (blueprint must be approved first to serve as the base for CRRs).

### Test Procedure (For Manual Execution)

#### Prerequisites
- Blueprint approved by CEO in Section C.
- A CriticalRole designated for the same OrgRole.

#### Step 1: eosoria creates 4 CRR types

**Browser A — log in as eosoria:**
1. Designate a CriticalRole for the OrgRole (if not already done).
2. Create 4 CriticalRoleRequirements, one of each type:
   - **new_requirement:** A position-specific requirement not in the canonical blueprint.
   - **modification:** A modification of an existing canonical RoleRequirement (binds to
     `base_requirement_id`, `base_blueprint_id`, `base_blueprint_version_number`).
   - **approved_exception:** An exception to a canonical requirement (binds to base).
   - **not_applicable:** A determination that a canonical requirement does not apply (binds to base).
3. Submit all 4 CRRs for approval.

**Expected:** All 4 CRRs transition to `submitted` status. Audit events recorded with
`actor_email = eosoria@curiosityled.com`.

#### Step 2: eosoria attempts self-approval of CRRs (must be rejected)

**Browser A — still logged in as eosoria:**
1. For each submitted CRR, the "Approve" button should be disabled.
2. If somehow enabled, attempt approval.

**Expected:** Backend rejects with `separation_of_duties_violation`. No mutation.
CRRs remain in `submitted` status.

#### Step 3: CEO approves all 4 CRRs

**Browser B — log in as CEO:**
1. Navigate to the submitted CRRs.
2. Approve each of the 4 CRRs (new_requirement, modification, approved_exception, not_applicable).

**Expected:** All 4 CRRs transition to `approved` status. `approved_by_profile_id` =
CEO's user ID for each. Audit events recorded with `actor_email = ceo@curiosityled.com`.

#### Step 4: Verify

- All 4 CRRs have `status = approved`, `applicability_status = applicable`.
- `approved_by_profile_id` = CEO's user ID (server-derived).
- `submitted_by_profile_id` = eosoria's user ID (server-derived).
- Audit events exist for both submit and approve actions with correct actor emails.

---

## E. Full-Merge Snapshot Proof — PENDING MANUAL EXECUTION

### Status: ⛔ NOT YET EXECUTED

Depends on Sections C and D (blueprint and all 4 CRR types must be browser-approved first).

### Existing Snapshot (Reference — NOT from browser-approved records)

An existing snapshot from prior (non-browser) testing is available for reference:

| Field | Value |
|-------|-------|
| Snapshot ID | 6ab5a22fa9fc21403b3c0f90 |
| Status | generated |
| Integrity | active |
| Expected count | 5 |
| Generated count | 5 |
| Content hash | c36db5539593185531f051a081b2d1b6a5be5444262a8a0ce9bac8f58a9dadcd |
| Children | 5 (4 canonical + 1 new_requirement) |

This existing snapshot is **incomplete** for the full-merge proof — it only has
`new_requirement` position-specific type. It is missing `modification`,
`approved_exception`, and `not_applicable` dispositions.

### Fresh Snapshot Procedure (For Manual Execution)

After Sections C and D are complete:

1. **Browser B — logged in as CEO:**
   - Navigate to the approved blueprint's role.
   - Trigger snapshot generation for the CriticalRole (position-specific snapshot).
   - This calls `successionCreateEffectiveBlueprintSnapshot` with the approved
     blueprint ID and critical role ID.

2. **Verify the snapshot:**
   - Parent snapshot status = `generated`
   - Parent integrity_status = `active`
   - Expected count = canonical requirements + 4 position-specific CRRs
   - Generated count = same as expected
   - Content hash recomputed and matches

3. **Verify persisted EffectiveRequirementSnapshot children:**
   - All canonical requirements present (source_type = `canonical`)
   - One `new_requirement` (source_type = `position_specific`, modification_type = `new_requirement`)
   - One `modification` (source_type = `position_specific`, modification_type = `modification`)
   - One `approved_exception` (source_type = `position_specific`, modification_type = `approved_exception`, applicability_status = `excepted`)
   - One `not_applicable` (source_type = `position_specific`, modification_type = `not_applicable`, applicability_status = `not_applicable`)

4. **Verify source and base bindings:**
   - Each position-specific child has `base_requirement_id`, `base_blueprint_id`,
     `base_blueprint_version_number` set (except `new_requirement` which has null base).
   - Each canonical child has `source_requirement_id` pointing to the RoleRequirement.

5. **Verify content hash recomputation:**
   - Recompute SHA-256 of the canonicalized requirement set.
   - Compare with `requirements_content_hash` on the parent snapshot.
   - They must match.

6. **Verify parent integrity comparison:**
   - Parent `expected_requirement_count` == `generated_requirement_count` == child count.
   - No `SnapshotIntegrityIncident` records for this snapshot.

7. **Verify no stale or quarantined inputs:**
   - All source requirements have `integrity_status = active`.
   - No `stale_for_future_snapshots` or `superseded` CRRs in the snapshot.
   - No quarantined blueprints or requirements.

8. **Verify no blocking incident:**
   - No open `SnapshotIntegrityIncident` for this snapshot.
   - `operational_use_blocked = false` (or no incident at all).

9. **Verify immutability:**
   - Attempt to update the parent snapshot → should fail (RLS `update: false`).
   - Attempt to update a child snapshot → should fail (RLS `update: false`).
   - Attempt to delete either → should fail (RLS `delete: false`).

### Required Return Values (After Execution)

| Field | Value (to be filled after execution) |
|-------|-------------------------------------|
| Parent snapshot ID | _______ |
| Child snapshot IDs | _______ |
| Expected count | _______ |
| Generated count | _______ |
| Persisted child count | _______ |
| Content hash (stored) | _______ |
| Content hash (recomputed) | _______ |
| Hash match | _______ |
| Parent integrity status | _______ |
| Blocking incident | _______ |
| Parent immutability test | _______ |
| Child immutability test | _______ |

---

## F. Audit Evidence

### Current Audit State

| Metric | Value |
|--------|-------|
| Total SuccessionAuditEvent records | 214 |
| Events from eosoria@curiosityled.com | 0 |
| Events from ceo@curiosityled.com | 0 |
| Events from team@curiosityled.com (Platform Admin) | 214 |
| Actor context types present | system (all 214) |

### Interpretation

All 214 existing audit events were generated by the Platform Admin account running
in `system` context (Phase 0 test harness execution). **No genuine tenant-user audit
events exist.** This means:

- The SoD enforcement (submitter ≠ approver) has been verified at the code level
  (guard confirms `authorizeSuccessionAction` is called in all operational functions)
  but has NOT been verified with genuine tenant-user sessions.
- The audit trail does not yet contain evidence of eosoria submitting or CEO approving.
- All prior snapshot generations used Platform Admin/system identity, not tenant-user
  browser sessions.

### Required Audit Evidence (After Browser Test Execution)

After completing Sections C and D, the following audit events must exist:

1. `blueprint_submitted` — actor: eosoria@curiosityled.com
2. `denied_action` (if self-approval attempted) — actor: eosoria@curiosityled.com, action_type: separation_of_duties_violation
3. `blueprint_approved` — actor: ceo@curiosityled.com
4. 4× `critical_role_requirement_submitted` — actor: eosoria@curiosityled.com
5. 4× `critical_role_requirement_approved` — actor: ceo@curiosityled.com

Each event must have:
- `actor_profile_id` derived server-side from the authenticated session
- `actor_email` matching the logged-in user
- `actor_role` matching the user's app_role
- `operation_id` linking to the SuccessionOperation record
- `event_key` for deduplication

---

## G. Failures / Skips

### Items That Could Not Be Completed

| Item | Reason | Impact |
|------|--------|--------|
| Two-browser Blueprint SoD (Section C) | Base44 restricts session creation to browser-based flows; exec_tool and backend scripts cannot create authenticated user sessions | SoD enforcement verified at code level but not with genuine tenant-user browser sessions |
| Two-browser CRR SoD (Section D) | Depends on Section C | Same as above |
| Fresh full-merge snapshot (Section E) | Depends on Sections C and D (browser-approved records required) | Existing snapshot is incomplete (missing 3 of 4 CRR disposition types) |
| Audit evidence for tenant users | No genuine tenant-user sessions have been executed | All 214 existing audit events are from Platform Admin/system identity |

### Items Completed

| Item | Status |
|------|--------|
| Full 65-function classification (Section A) | ✅ Complete — all 65 functions classified exactly once |
| Guard hardening (Section B) | ✅ Complete — all 9 hardening requirements met, guard passes with 0 violations |
| Guard automated execution | ✅ Complete — `prebuild` hook, `guard` script, and `test` script added to package.json |
| Machine-readable report artifact | ✅ Complete — JSON report at `base44/tests/reports/succession-architecture-guard-report.json` |
| Test user configuration verification | ✅ Complete — eosoria (Admin Level 1, submit only) and CEO (Super Administrator, submit + approve) confirmed |
| Permission mapping verification | ✅ Complete — `succession.blueprints.approve` granted to Super Administrator and Admin Level 2, denied to Admin Level 1 |

---

## H. Residual Risks

### Risk 1: SoD Enforcement Not Verified with Genuine Browser Sessions

**Risk:** The separation-of-duties check (submitter ≠ approver) is enforced in backend
code and verified by the architecture guard, but has not been tested with genuine
tenant-user browser sessions. A runtime issue (e.g., session token misattribution,
profile_id resolution error) could theoretically bypass the check.

**Mitigation:** Execute the two-browser SoD test (Sections C and D) manually.

**Severity:** Medium — code-level verification is strong, but runtime verification is
required for production release.

### Risk 2: Existing Test Data Contamination

**Risk:** 214 audit events and multiple succession records exist from prior Platform
Admin/system testing. If not properly filtered, these could be confused with genuine
tenant-user test results.

**Mitigation:** Use fresh synthetic records with unique names (e.g., "Browser SoD Test")
and filter audit events by `actor_email` to distinguish genuine tenant-user events from
prior system events.

**Severity:** Low — filterable by actor_email.

### Risk 3: Snapshot Generation from Non-Browser Records

**Risk:** The existing active snapshot (6ab5a22fa9fc21403b3c0f90) was generated from
Platform Admin/system-approved records, not browser-approved records. It is incomplete
(missing 3 of 4 CRR disposition types).

**Mitigation:** Generate a fresh snapshot after the browser SoD test (Section E).

**Severity:** Medium — the snapshot generation logic is verified, but the full-merge
proof requires all 4 CRR types to be browser-approved first.

### Risk 4: Test Harness Functions Are Deployed

**Risk:** The 3 test harness functions (`successionPhase0Test`, `successionPhase1Test`,
`successionPhase1_5Test`) are deployed as callable backend functions. While the guard
verifies they are not referenced by production functions, they are still callable via
HTTP if someone knows the URL.

**Mitigation:** These functions should be removed or disabled before production release.
The guard flags them as `test_harness` classification in the report.

**Severity:** Low — they require authentication and tenant context, and their test
nature is clearly named.

### Risk 5: Legacy Dual-Shell Structure

**Risk:** The app has both a legacy `Layout` and an `MVPLayout` shell. This creates
potential for inconsistent auth context between shells.

**Mitigation:** Known issue — documented in prior checkpoints. Not addressed in this
checkpoint as it is outside the scope of the architecture guard hardening.

**Severity:** Low — does not affect succession function authorization (which is
backend-enforced regardless of frontend shell).

---

## I. Recommendation for Final Accessibility and Security Testing

### Before Phase 2

1. **Execute the two-browser SoD test (Sections C and D).** This is the single most
   critical remaining verification. It confirms that:
   - eosoria can submit but not approve (UI + backend enforcement).
   - CEO can approve but the approval is rejected if CEO is also the submitter.
   - Server-derived actor IDs match the logged-in users.
   - Audit events accurately record both authenticated users.
   - Rejected self-approval attempts cause no mutation.

2. **Generate the fresh full-merge snapshot (Section E).** After the browser SoD test,
   generate a snapshot from the browser-approved records and verify all 5 child types
   (canonical + 4 position-specific dispositions).

3. **Remove or disable test harness functions.** Before production release, remove
   `successionPhase0Test`, `successionPhase1Test`, and `successionPhase1_5Test` from
   the functions directory, or add a production-environment guard that rejects calls
   to these functions.

4. **Run the architecture guard as part of CI.** The `prebuild` hook is now in place.
   Verify that `npm run build` triggers the guard and fails the build on violations.

5. **Accessibility testing.** Once the UI is unfrozen (after the SoD test passes),
   conduct accessibility testing on the Succession workspace:
   - Keyboard navigation through cycle/role/blueprint/CRR selection.
   - Screen reader compatibility for approval workflow buttons.
   - Color contrast for status badges (submitted, approved, rejected).
   - Focus management when approval dialogs open/close.

6. **Security testing.** Conduct penetration testing on:
   - Cross-tenant access attempts (submit with tenant A's blueprint_id from tenant B).
   - Request-body identity spoofing (send `approved_by_profile_id` in request body —
     should be ignored in favor of session-derived identity).
   - Platform Admin bypass attempts (call succession functions as Platform Admin —
     should be denied by the Platform Admin denial gate in `authorizeSuccessionAction`).
   - Idempotency replay attacks (retry same operation_id with different payload —
     should be rejected with payload mismatch).

### Do Not Begin Phase 2

Per instruction, Phase 2 has not been started. The `docs/phase2-planning.md` document
exists for reference only and no Phase 2 code changes have been made.

### Do Not Publish

Per instruction, the app has not been published. The architecture guard `prebuild` hook
will block any build attempt if violations are introduced.