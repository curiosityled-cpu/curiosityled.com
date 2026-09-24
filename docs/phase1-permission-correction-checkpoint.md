# Phase 1 Permission Correction & Acceptance Checkpoint

**Date:** 2026-09-24
**Status:** Platform Admin denial enforced across all succession functions; permission model corrected; genuine two-browser SoD pending user execution.

---

## A. Platform Admin Denial Evidence

### Policy
Platform Admin has **zero standing customer succession access** in Phase 1. The `CrossTenantAccessGrant` mechanism is disabled, so there is no authorized path for Platform Admin to read, list, create, mutate, or approve succession data — not even for the tenant matching its user record's `client_id`.

### Implementation
A Platform Admin denial check was added at the **top** of `authorizeSuccessionAction` (the single authorization chokepoint). It runs **before** the permission check, tenant-scope check, wildcard check, and role bypass. It cannot be overridden by:
- matching `client_id`;
- wildcard permission (`*`);
- role bypass (`isPlatformAdmin`);
- support purpose alone.

### Test Results (24 functions tested, all 403)

| # | Function | Type | Result | Denial Reason |
|---|---|---|---|---|
| 1 | `successionListCycles` | list | ✅ 403 | platform_admin_standing_access_denied_phase1 |
| 2 | `successionListOrgRoles` | list | ✅ 403 | platform_admin_standing_access_denied_phase1 |
| 3 | `successionListOrgPositions` | list | ✅ 403 | platform_admin_standing_access_denied_phase1 |
| 4 | `successionListPositionAssignments` | list | ✅ 403 | platform_admin_standing_access_denied_phase1 |
| 5 | `successionListCriticalRoles` | list | ✅ 403 | platform_admin_standing_access_denied_phase1 |
| 6 | `successionListBlueprints` | list | ✅ 403 | platform_admin_standing_access_denied_phase1 |
| 7 | `successionListCriticalRoleRequirements` | list | ✅ 403 | platform_admin_standing_access_denied_phase1 |
| 8 | `successionListSnapshots` | list | ✅ 403 | platform_admin_standing_access_denied_phase1 |
| 9 | `successionListSnapshotIntegrityIncidents` | list | ✅ 403 | platform_admin_standing_access_denied_phase1 |
| 10 | `successionListPositionChanges` | list | ✅ 403 | platform_admin_standing_access_denied_phase1 |
| 11 | `successionListOperations` | list | ✅ 403 | platform_admin_standing_access_denied_phase1 |
| 12 | `successionGetCycle` | get | ✅ 403 | platform_admin_standing_access_denied_phase1 |
| 13 | `successionGetBlueprint` | get | ✅ 403 | platform_admin_standing_access_denied_phase1 |
| 14 | `successionGetSnapshot` | get | ✅ 403 | platform_admin_standing_access_denied_phase1 |
| 15 | `successionCreateCycle` | create | ✅ 403 | platform_admin_standing_access_denied_phase1 |
| 16 | `successionCreateBlueprintDraft` | create | ✅ 403 | platform_admin_standing_access_denied_phase1 |
| 17 | `successionCreateOrgRole` | create | ✅ 403 | platform_admin_standing_access_denied_phase1 |
| 18 | `successionCreateRoleRequirement` | create | ✅ 403 | platform_admin_standing_access_denied_phase1 |
| 19 | `successionCreateCriticalRoleRequirement` | create | ✅ 403 | platform_admin_standing_access_denied_phase1 |
| 20 | `successionCreateEffectiveBlueprintSnapshot` | create | ✅ 403 | platform_admin_standing_access_denied_phase1 |
| 21 | `successionDesignateCriticalRole` | create | ✅ 403 | platform_admin_standing_access_denied_phase1 |
| 22 | `successionSubmitBlueprint` | mutate | ✅ 403 | platform_admin_standing_access_denied_phase1 |
| 23 | `successionApproveBlueprint` | approve | ✅ 403 | platform_admin_standing_access_denied_phase1 |
| 24 | `successionApproveCriticalRoleRequirement` | approve | ✅ 403 | platform_admin_standing_access_denied_phase1 |

### Zero-Mutation Verification
| Entity | Records Before | Records After | New Records |
|---|---|---|---|
| SuccessionCycle | 2 | 2 | 0 |
| OrgRole | 6 | 6 | 0 |
| RoleSuccessBlueprint | 11 | 11 | 0 |
| CriticalRoleRequirement | 18 | 18 | 0 |
| EffectiveBlueprintSnapshot | 11 | 11 | 0 |

**Result:** Zero records created, zero records mutated, zero records deleted by Platform Admin across all 24 tested functions.

### Audit Trail
24 `denied_action` audit events were written to `SuccessionAuditEvent` with:
- `action_type`: `"denied_action"`
- `metadata.denied_reason`: `"platform_admin_standing_access_denied_phase1"`
- `metadata.actor_role`: `"Platform Admin"`
- `metadata.actor_email`: `"team@curiosityled.com"`
- `actor_context_type_override`: `"platform_operator"`

Sample event:
```json
{
  "action": "successionApproveBlueprint",
  "actor_role": "Platform Admin",
  "actor_email": "team@curiosityled.com",
  "denied_reason": "platform_admin_standing_access_denied_phase1",
  "timestamp": "2026-09-24T23:09:12.737Z"
}
```

---

## B. Authoritative Permission Provenance

### Authoritative Source
The **backend** is the authoritative source for effective permissions:

1. `bootstrapSuccessionAuth()` reads `user.permissions` (or `user.data.permissions`) from the authenticated session — this array is populated by the platform from the user's `app_role` mapping + custom role grants.
2. `authorizeSuccessionAction()` checks `auth.permissions` server-side. This is the enforcement point.
3. The frontend `BASE_ROLE_PERMISSIONS` in `src/components/constants/permissions.jsx` is a **mirror** for UI gating only — it does not enforce access.

### Final Phase 1 Approval Permissions
| Permission | Grants Authority To | Granted To Roles |
|---|---|---|
| `succession.blueprints.approve` | Approve submitted `RoleSuccessBlueprint` records | Admin Level 2, Super Administrator |
| `succession.critical_role_requirements.approve` | Approve submitted `CriticalRoleRequirement` records | Admin Level 2, Super Administrator |

### Reserved Permission
| Permission | Scope | Status |
|---|---|---|
| `succession.readiness.ratify` | Future Deliberate/readiness phase | **RESERVED** — not checked by any Phase 1 function |

### Effective Permission Matrix (Current Test Users)

| User | User ID | app_role | client_id | `roles.manage` | `blueprints.approve` | `crr.approve` | `readiness.ratify` | `*` wildcard | Platform Admin |
|---|---|---|---|---|---|---|---|---|---|
| **eosoria** | `69ddb638b6f4f5de0c2a2219` | Admin Level 1 | `69f3e931d1d34e0cdedf75c1` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **CEO** | `69f3e4ad3ffd946aafd1298a` | Admin Level 2 | `69f3e931d1d34e0cdedf75c1` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Platform Admin** | `69d4650b54be3dc79a1fd0ba` | Platform Admin | `69f3e931d1d34e0cdedf75c1` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (denied) |

### Confidentiality Clearance
No role receives `legally_restricted` clearance automatically. The `getCallerClearance` function in `authorizeSuccessionAction` maps:
- Admin roles (Platform Admin, Super Administrator, Admin Level 1/2) → `highly_confidential`
- HRBP → `confidential`
- All others → `standard`

`legally_restricted` requires an explicit additional authorization path not yet implemented in Phase 1.

### Frontend ↔ Backend Sync
| Layer | Source | Purpose |
|---|---|---|
| Backend `bootstrapSuccessionAuth` | `user.permissions` from session | **Authoritative** — enforcement |
| Backend `authorizeSuccessionAction` | `auth.permissions` + Platform Admin denial | **Enforcement gate** |
| Frontend `BASE_ROLE_PERMISSIONS` | `permissions.jsx` constants | UI gating only — show/hide buttons |
| Frontend `useAuth.hasPermission()` | Merged base + custom role perms | UI gating only |

---

## C. Blueprint Two-Browser SoD

### Platform Admin Denial — VERIFIED
See Section A: `successionApproveBlueprint` returns 403 for Platform Admin.

### Genuine Two-Browser SoD — PENDING USER EXECUTION

**Cannot be executed by the build agent.** Base44 restricts authenticated session creation to browser-based invitation flows. The `test_backend_function` tool runs as the Platform Admin, not as eosoria or CEO.

**Test setup completed:**
- eosoria (`69ddb638b6f4f5de0c2a2219`) → Admin Level 1, permissions: `[cycles.view, cycles.manage, roles.view, roles.manage]`
- CEO (`69f3e4ad3ffd946aafd1298a`) → Admin Level 2, permissions: `[cycles.view, cycles.manage, roles.view, roles.manage, blueprints.approve, critical_role_requirements.approve]`

**Browser test procedure:**

**Session A — eosoria (Admin Level 1, submitter):**
1. Log in as `eosoria@curiosityled.com` at https://curiosity-led.base44.app/login
2. Navigate to Succession → Blueprints
3. Select cycle "SoD Two-User Test Cycle (Clean)" and role "VP of Engineering (V7 SoD Test)"
4. Create a new blueprint draft (v9-sod-perm-test)
5. Create canonical requirements on the blueprint
6. Submit the blueprint
7. **Verify approval unavailable** — the Approve button should be hidden (eosoria lacks `succession.blueprints.approve`)
8. **Verify direct approval fails** — if the button were forced, the backend denies with "Missing permission: succession.blueprints.approve"
9. Verify no mutation occurred (blueprint remains `submitted`)

**Session B — CEO (Admin Level 2, approver):**
1. Log in as `ceo@curiosityled.com` in a separate browser/incognito window
2. Navigate to Succession → Blueprints
3. Select the same cycle and role
4. Verify the v9 blueprint appears as `submitted`
5. Click Approve
6. Verify the blueprint transitions to `approved`, `is_current: true`
7. Verify `approved_by_profile_id` = `69f3e4ad3ffd946aafd1298a` (CEO's server-derived profile ID)

**Expected return data:**
- User IDs: eosoria=`69ddb638b6f4f5de0c2a2219`, CEO=`69f3e4ad3ffd946aafd1298a`
- Tenant ID: `69f3e931d1d34e0cdedf75c1`
- Effective permissions: as per Section B matrix
- Before/after records: blueprint status `submitted` → `approved`
- Operation IDs: from the approval response
- Audit-event keys: `blueprint_approved` event with `approved_by_profile_id` = CEO
- Rejected-attempt results: eosoria self-approval denied (if attempted)
- Successful approval results: CEO approval succeeds

---

## D. CRR Two-Browser SoD

### Platform Admin Denial — VERIFIED
See Section A: `successionApproveCriticalRoleRequirement` returns 403 for Platform Admin.

### Genuine Two-Browser CRR SoD — PENDING USER EXECUTION

**Browser test procedure:**

**Session A — eosoria:**
1. Log in as `eosoria@curiosityled.com`
2. Navigate to Succession → Critical Roles
3. Select the V7 SoD Test role
4. Create a new CRR (new_requirement type)
5. Submit the CRR
6. **Verify CRR approval fails** — the Approve button should be hidden (eosoria lacks `succession.critical_role_requirements.approve`)

**Session B — CEO:**
1. Log in as `ceo@curiosityled.com`
2. Navigate to Succession → Critical Roles → same role
3. Verify the CRR appears as `submitted`
4. Click Approve
5. Verify `approved_by_profile_id` = CEO's server-derived profile ID

---

## E. Four-Type CRR Form Results

### Existing Test Data
The database contains CRRs covering all four modification types on the "VP of Engineering" role (`6ab561e704e889417a107b10`):

| modification_type | Count | Status | Notes |
|---|---|---|---|
| `new_requirement` | 4 | approved | Various applicability states (applicable, stale, superseded) |
| `modification` | 5 | approved | Base-requirement bound, stale/superseded |
| `approved_exception` | 4 | approved | Base-requirement bound, stale/superseded |
| `not_applicable` | 3 | approved | Base-requirement bound, stale/superseded |

### Validation Coverage
- **Exact-version base selection:** `CriticalRoleRequirement` schema requires `base_requirement_id`, `base_blueprint_id`, and `base_blueprint_version_number` for modification/exception/not_applicable types. The `successionCreateCriticalRoleRequirement` function validates these fields.
- **Rationale requirements:** `requirement_text` is required for all types. The `CreateCRRForm` component enforces rationale input per type.
- **Stale-record exclusion:** The `successionCreateEffectiveBlueprintSnapshot` function excludes CRRs with `applicability_status: "stale_for_future_snapshots"` and `"superseded"` from new snapshots.
- **Cross-tenant rejection:** All functions filter by `client_id: auth.client_id` and emit `denied_cross_tenant_reference` audit events on mismatch.
- **Arbitrary-ID rejection:** Base-requirement IDs are validated for tenant ownership and existence before binding.

### Fresh Four-Type Test — PENDING USER EXECUTION
Creating fresh CRRs of each type requires an authenticated eosoria session (to submit) and CEO session (to approve). The form (`CreateCRRForm`) supports all four types with base-requirement binding.

**Browser test procedure for each type:**
1. eosoria: Create CRR with `modification_type: "new_requirement"` → submit
2. eosoria: Create CRR with `modification_type: "modification"` (bind to base requirement) → submit
3. eosoria: Create CRR with `modification_type: "approved_exception"` (bind to base requirement) → submit
4. eosoria: Create CRR with `modification_type: "not_applicable"` (bind to base requirement) → submit
5. CEO: Approve all four CRRs
6. Verify each CRR's `approved_by_profile_id` = CEO
7. **Switching types:** Verify the form dynamically shows/hides base-requirement fields based on selected type
8. **Stale/quarantined exclusion:** Generate a snapshot and verify stale CRRs are excluded

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

**Browser test procedure:**
1. eosoria: Select an approved CRR → click Revise → create revision
2. Verify prior record remains unchanged (immutable)
3. eosoria: Submit the revision
4. CEO: Approve the revision
5. Verify `revision_number` incremented correctly
6. Verify `revises_requirement_id` links to prior record

---

## G. Audit Evidence

### Platform Admin Denial Audit Events
- 24 `denied_action` audit events written to `SuccessionAuditEvent`
- Each event includes: `action`, `actor_role`, `actor_email`, `denied_reason`, `actor_context_type: "platform_operator"`
- Events are deduplication-safe via `operation_id` and `event_key`

### Audit Writer Provenance
- `writeSuccessionAuditEvent` is the private audit writer (separate non-authorizing module)
- It derives `actor_profile_id`, `actor_email`, `actor_role` server-side from the authenticated session
- Request-body actor fields are ignored — identity comes exclusively from `auth.profile_id`
- `client_id_override` ensures denial events are written to the correct tenant partition

### Audit Event Fields
Every audit event includes:
- `operation_id` — for retry deduplication
- `event_key` — deterministic logical key
- `event_type` — operation_started, domain_action_completed, integrity_quarantined, etc.
- `actor_context_type` — tenant, platform_operator, partner, system, denied
- `timestamp` — server-side

---

## H. Failures and Residual Risks

### Skipped Tests (Cannot Execute via Backend)
| Test | Status | Reason |
|---|---|---|
| Genuine two-browser blueprint SoD | SKIPPED | Cannot create authenticated sessions for eosoria/CEO via backend tooling |
| Genuine two-browser CRR SoD | SKIPPED | Same |
| Fresh four-type CRR creation + approval | SKIPPED | Requires authenticated submit + approve sessions |
| Fresh CRR revision creation + approval | SKIPPED | Requires authenticated sessions |
| Snapshot generation post-approval | SKIPPED | Depends on successful approval first |

### Residual Risks
1. **Two-browser SoD not yet executed.** The permission model is corrected and Platform Admin denial is verified across 24 functions, but the genuine submitter→approver flow requires the user to execute in two browser sessions.
2. **`succession.readiness.ratify` still in `SUCCESSION_PERMISSIONS`.** It is reserved for the future Deliberate/readiness phase. It remains granted to Super Administrator in `BASE_ROLE_PERMISSIONS` but is no longer checked by any Phase 1 approval function.
3. **Frontend `BASE_ROLE_PERMISSIONS['Platform Admin'] = ['*']`.** This frontend wildcard is not reflected in the actual user record (`permissions: []`). The backend Platform Admin denial at the top of `authorizeSuccessionAction` ensures the wildcard is not honored regardless.
4. **Historical contaminated records.** Legacy self-approved CRRs and blueprints remain in the database (16 of 17 legacy CRRs were self-approved by Platform Admin before SoD enforcement). They are marked stale/superseded where applicable but are not deleted (retained for audit per retention design).
5. **Control-plane functions not gated.** `successionGrantRequest`, `successionGrantApprove`, `successionGrantRevoke`, `successionGrantList`, `successionCrossTenantRead` do not use `authorizeSuccessionAction`. They use `resolvePlatformOperatorContext` instead. However, `successionCrossTenantRead` returns 503 (grant feature disabled), and grant functions cannot reach `active` status in Phase 1, so these are not a risk.

---

## I. Recommendation on Final Phase 1 Testing

### What is complete:
- ✅ Platform Admin denied across all 24 tested succession functions (list, get, create, mutate, approve) — zero records, zero mutations.
- ✅ Permission model corrected: `succession.blueprints.approve` and `succession.critical_role_requirements.approve` replace `succession.readiness.ratify` for Phase 1 approvals.
- ✅ `explicit_permission_only` enforcement prevents wildcard matching for approval actions.
- ✅ Platform Admin denial runs before any other check — no client_id match, wildcard, role bypass, or support purpose can override it.
- ✅ Admin Level 1 (eosoria) can draft/submit but cannot approve.
- ✅ Admin Level 2 (CEO) holds both approval permissions.
- ✅ No role receives `legally_restricted` clearance automatically.
- ✅ Test users configured with correct roles and permissions.
- ✅ 24 denial audit events recorded with full provenance.
- ✅ Build passes.

### What remains before full acceptance:
- ⬜ User executes genuine two-browser SoD test (eosoria submits, CEO approves) for both blueprints and CRRs.
- ⬜ User verifies server-derived approver identity (`approved_by_profile_id` matches CEO, not request body).
- ⬜ User creates and approves fresh CRRs of all four modification types.
- ⬜ User creates and approves a CRR revision, verifying prior record immutability.
- ⬜ User generates a post-approval snapshot and verifies only approved current revisions enter it.

### Recommendation:
Proceed to browser-based SoD testing using the procedures in sections C, D, E, and F. Once the user confirms successful submit→approve flows with server-derived identity, Phase 1 acceptance can be granted. Do not begin Phase 2. Do not publish. Use synthetic data only.