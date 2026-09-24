# Phase 1 Permission Correction & Acceptance Checkpoint

**Date:** 2026-09-24
**Status:** Permission model corrected; Platform Admin denial verified; genuine two-browser SoD pending user execution.

---

## A. Final Permission Definitions

### Replaced Permission
| Old Permission | Scope | Status |
|---|---|---|
| `succession.readiness.ratify` | Blueprint + CRR approval | **RESERVED** for future Deliberate/readiness phase. No longer used for Phase 1 approvals. |

### New Phase 1 Approval Permissions
| Permission | Grants Authority To | Granted To Roles |
|---|---|---|
| `succession.blueprints.approve` | Approve submitted `RoleSuccessBlueprint` records | Admin Level 2, Super Administrator |
| `succession.critical_role_requirements.approve` | Approve submitted `CriticalRoleRequirement` records | Admin Level 2, Super Administrator |

### Explicitly NOT Granted
| Role | Can Draft/Submit | Can Approve | Rationale |
|---|---|---|---|
| Admin Level 1 | ✅ (via `succession.roles.manage`) | ❌ | Separation of duties: program managers draft, tenant admins ratify |
| Platform Admin | ❌ | ❌ | Platform operator must not hold standing tenant approval authority |

### Backend Enforcement: `explicit_permission_only`
`authorizeSuccessionAction` now accepts `explicit_permission_only: boolean`. When `true`:
- The `auth.isPlatformAdmin` bypass is **disabled**.
- The `"*"` wildcard bypass is **disabled**.
- An **exact** match in `auth.permissions` is required.

Both approval functions pass `explicit_permission_only: true`. All other succession functions (list, create, submit) retain the standard permission resolution (Platform Admin bypass + wildcard).

---

## B. Permission-Provenance Matrix

### Authoritative Source
The **backend** is the authoritative source for effective permissions:

1. `bootstrapSuccessionAuth()` reads `user.permissions` (or `user.data.permissions`) from the authenticated session — this array is populated by the platform from the user's `app_role` mapping + custom role grants.
2. `authorizeSuccessionAction()` checks `auth.permissions` server-side. This is the enforcement point.
3. The frontend `BASE_ROLE_PERMISSIONS` in `src/components/constants/permissions.jsx` is a **mirror** for UI gating only — it does not enforce access. It must stay in sync with the backend's expectation, but the backend is authoritative.

### Effective Permission Matrix (Current Test Users)

| User | app_role | client_id | `roles.manage` | `blueprints.approve` | `crr.approve` | `readiness.ratify` | `*` wildcard |
|---|---|---|---|---|---|---|---|
| **eosoria** (`eosoria@curiosityled.com`) | Admin Level 1 | `69f3e931...` | ✅ | ❌ | ❌ | ❌ | ❌ |
| **CEO** (`ceo@curiosityled.com`) | Admin Level 2 | `69f3e931...` | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Platform Admin** (`team@curiosityled.com`) | Platform Admin | `69f3e931...` | ❌ | ❌ | ❌ | ❌ | ❌ |

**Key observation:** The Platform Admin user record has `permissions: []` (empty array). The `isPlatformAdmin` flag was the previous bypass mechanism. With `explicit_permission_only: true` on approval functions, the bypass is disabled — Platform Admin is correctly denied.

### Frontend ↔ Backend Sync
| Layer | Source | Purpose |
|---|---|---|
| Backend `bootstrapSuccessionAuth` | `user.permissions` from session | **Authoritative** — enforcement |
| Backend `authorizeSuccessionAction` | `auth.permissions` + `explicit_permission_only` | **Enforcement gate** |
| Frontend `BASE_ROLE_PERMISSIONS` | `permissions.jsx` constants | UI gating only — show/hide buttons |
| Frontend `useAuth.hasPermission()` | Merged base + custom role perms | UI gating only |

---

## C. Blueprint Browser SoD Evidence

### Platform Admin Denial (Verified via `test_backend_function`)
```
Function: successionApproveBlueprint
Payload: { operation_id: "perm-test-001", blueprint_id: "nonexistent", org_role_id: "nonexistent", expected_revision: 0 }
Actor: team@curiosityled.com (Platform Admin)
Result: 403 — "Missing permission: succession.blueprints.approve"
```

The Platform Admin (who has `isPlatformAdmin: true` but `permissions: []`) is **denied** because `explicit_permission_only: true` disables the Platform Admin bypass.

### Genuine Two-Browser SoD — PENDING USER EXECUTION

**Cannot be executed by the build agent.** Base44 restricts authenticated session creation to browser-based invitation flows. The `test_backend_function` tool runs as the Platform Admin, not as eosoria or CEO.

**Test setup completed:**
- eosoria (`69ddb638b6f4f5de0c2a2219`) → Admin Level 1, permissions: `[cycles.view, cycles.manage, roles.view, roles.manage]`
- CEO (`69f3e4ad3ffd946aafd1298a`) → Admin Level 2, permissions: `[cycles.view, cycles.manage, roles.view, roles.manage, blueprints.approve, critical_role_requirements.approve]`

**Browser test procedure (for user to execute):**

**Session A — eosoria (Admin Level 1, submitter):**
1. Log in as `eosoria@curiosityled.com` at https://curiosity-led.base44.app/login
2. Navigate to Succession → Blueprints
3. Select cycle "SoD Two-User Test Cycle (Clean)" and role "VP of Engineering (V7 SoD Test)"
4. Create a new blueprint draft (v9-sod-perm-test)
5. Submit the blueprint
6. **Attempt self-approval** — the Approve button should be hidden (eosoria lacks `succession.blueprints.approve`)
7. Verify no mutation occurred (blueprint remains `submitted`)

**Session B — CEO (Admin Level 2, approver):**
1. Log in as `ceo@curiosityled.com` in a separate browser/incognito window
2. Navigate to Succession → Blueprints
3. Select the same cycle and role
4. Verify the v9 blueprint appears as `submitted`
5. Click Approve
6. Verify the blueprint transitions to `approved`, `is_current: true`
7. Verify `approved_by_profile_id` = `69f3e4ad3ffd946aafd1298a` (CEO's server-derived profile ID)

---

## D. CRR Browser SoD Evidence

### Platform Admin Denial (Verified via `test_backend_function`)
```
Function: successionApproveCriticalRoleRequirement
Payload: { operation_id: "perm-test-002", requirement_id: "nonexistent" }
Actor: team@curiosityled.com (Platform Admin)
Result: 403 — "Missing permission: succession.critical_role_requirements.approve"
```

### Genuine Two-Browser CRR SoD — PENDING USER EXECUTION

**Browser test procedure (for user to execute):**

**Session A — eosoria:**
1. Log in as `eosoria@curiosityled.com`
2. Navigate to Succession → Critical Roles
3. Select the V7 SoD Test role
4. Create a new CRR (new_requirement type)
5. Submit the CRR
6. **Attempt self-approval** — the Approve button should be hidden (eosoria lacks `succession.critical_role_requirements.approve`)

**Session B — CEO:**
1. Log in as `ceo@curiosityled.com`
2. Navigate to Succession → Critical Roles → same role
3. Verify the CRR appears as `submitted`
4. Click Approve
5. Verify `approved_by_profile_id` = CEO's server-derived profile ID

---

## E. Four-Type CRR Test Results

### Existing Test Data
The database contains CRRs covering all four modification types on the "VP of Engineering" role (`6ab561e704e889417a107b10`):

| modification_type | Count | Status | Notes |
|---|---|---|---|
| `new_requirement` | 4 | approved | Various applicability states (applicable, stale, superseded) |
| `modification` | 5 | approved | Base-requirement bound, stale/superseded |
| `approved_exception` | 4 | approved | Base-requirement bound, stale/superseded |
| `not_applicable` | 3 | approved | Base-requirement bound, stale/superseded |

### Validation Status
- **Exact-version base selection:** `CriticalRoleRequirement` schema requires `base_requirement_id`, `base_blueprint_id`, and `base_blueprint_version_number` for modification/exception/not_applicable types. The `successionCreateCriticalRoleRequirement` function validates these fields.
- **Rationale requirements:** `requirement_text` is required for all types. The `CreateCRRForm` component enforces rationale input per type.
- **Stale-record exclusion:** The `successionCreateEffectiveBlueprintSnapshot` function excludes CRRs with `applicability_status: "stale_for_future_snapshots"` and `"superseded"` from new snapshots.
- **Cross-tenant rejection:** All functions filter by `client_id: auth.client_id` and emit `denied_cross_tenant_reference` audit events on mismatch.

### Fresh Four-Type Test — PENDING USER EXECUTION
Creating fresh CRRs of each type requires an authenticated eosoria session (to submit) and CEO session (to approve). The form (`CreateCRRForm`) supports all four types with base-requirement binding.

---

## F. CRR Revision Results

### Revision Infrastructure
- `successionCreateCriticalRoleRequirementRevision` backend function exists and is wired.
- `CreateCRRRevisionForm` component renders inline in `RequirementRow` when the Revise button is clicked.
- Revision creates a new `CriticalRoleRequirement` record with:
  - `revises_requirement_id` → prior requirement ID
  - `revision_number` → prior + 1
  - `base_blueprint_id` / `base_blueprint_version_number` → current approved blueprint
  - Prior record remains unchanged (immutable once approved)

### Fresh Revision Test — PENDING USER EXECUTION
Requires authenticated sessions: eosoria submits revision, CEO approves.

---

## G. Platform Admin Denial Results

| Operation | Function | Result | Evidence |
|---|---|---|---|
| Approve Blueprint | `successionApproveBlueprint` | ✅ DENIED (403) | `perm-test-001` — "Missing permission: succession.blueprints.approve" |
| Approve CRR | `successionApproveCriticalRoleRequirement` | ✅ DENIED (403) | `perm-test-002` — "Missing permission: succession.critical_role_requirements.approve" |
| List Blueprints | `successionListBlueprints` | ⚠️ ALLOWED (200) | Platform Admin has `client_id`; list uses standard permission resolution (bypass active) |
| List CRRs | `successionListCriticalRoleRequirements` | ⚠️ ALLOWED (200) | Same — standard resolution |

**Assessment:** The **approval** denial is correctly enforced via `explicit_permission_only`. The **list/read** access for same-tenant Platform Admin is a design decision (Platform Admin holds a `client_id` and needs read access for support/troubleshooting). Cross-tenant access for Platform Admin still requires an active `CrossTenantAccessGrant`.

---

## H. Failed/Skipped Tests

| Test | Status | Reason |
|---|---|---|
| Genuine two-browser blueprint SoD | SKIPPED | Cannot create authenticated sessions for eosoria/CEO via backend tooling |
| Genuine two-browser CRR SoD | SKIPPED | Same |
| Fresh four-type CRR creation + approval | SKIPPED | Requires authenticated submit + approve sessions |
| Fresh CRR revision creation + approval | SKIPPED | Requires authenticated sessions |
| Snapshot generation post-approval | SKIPPED | Depends on successful approval first |

### Historical Contamination (Pre-Correction)
- 16 of 17 legacy CRRs were self-approved by the Platform Admin (`team@curiosityled.com`) before SoD enforcement existed.
- The V8 blueprint (`6ab5a113efb46b9ee8ef72e8`) was approved by the Platform Admin — this would now be correctly denied.
- These records are retained for audit but should not be considered valid Phase 1 evidence.

---

## I. Remaining Risks

1. **Two-browser SoD not yet executed.** The permission model is corrected and the Platform Admin denial is verified, but the genuine submitter→approver flow requires the user to execute in two browser sessions.
2. **Platform Admin same-tenant read access.** Platform Admin can still list/read same-tenant succession data (by design for support). If the user wants to restrict this further, a separate `explicit_permission_only` flag would need to be added to list functions, or the Platform Admin's `client_id` assignment should be reconsidered.
3. **`succession.readiness.ratify` still in `SUCCESSION_PERMISSIONS`.** It is reserved for the future Deliberate/readiness phase. It remains granted to Super Administrator in `BASE_ROLE_PERMISSIONS` but is no longer checked by any Phase 1 approval function.
4. **Frontend `BASE_ROLE_PERMISSIONS['Platform Admin'] = ['*']`.** This frontend wildcard is not reflected in the actual user record (`permissions: []`). The backend `explicit_permission_only` flag ensures the wildcard is not honored for approvals regardless.
5. **Historical contaminated records.** Legacy self-approved CRRs and blueprints remain in the database. They are marked stale/superseded where applicable but are not deleted (retained for audit per retention design).

---

## J. Recommendation on Phase 1 Acceptance

**Conditional acceptance — pending genuine two-browser SoD execution.**

### What is complete:
- ✅ Permission model corrected: `succession.blueprints.approve` and `succession.critical_role_requirements.approve` replace `succession.readiness.ratify` for Phase 1 approvals.
- ✅ `explicit_permission_only` enforcement prevents Platform Admin bypass and wildcard matching for approval actions.
- ✅ Admin Level 1 can draft/submit but cannot approve (no approve permission in role mapping).
- ✅ Admin Level 2 and Super Administrator hold both approval permissions.
- ✅ Platform Admin denial verified for both approval functions (403).
- ✅ Test users configured: eosoria (Admin Level 1, submit only), CEO (Admin Level 2, approve).
- ✅ Frontend views updated to gate on the new permission names.
- ✅ Build passes.

### What remains before full acceptance:
- ⬜ User executes genuine two-browser SoD test (eosoria submits, CEO approves) for both blueprints and CRRs.
- ⬜ User verifies server-derived approver identity (`approved_by_profile_id` matches CEO, not request body).
- ⬜ User creates and approves fresh CRRs of all four modification types.
- ⬜ User creates and approves a CRR revision, verifying prior record immutability.
- ⬜ User generates a post-approval snapshot and verifies only approved current revisions enter it.

### Recommendation:
Proceed to browser-based SoD testing using the procedure in sections C and D. Once the user confirms successful submit→approve flows with server-derived identity, Phase 1 acceptance can be granted. Do not begin Phase 2 until browser SoD is confirmed.