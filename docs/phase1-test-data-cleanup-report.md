# Phase 1 — Test Data Cleanup Report

## Immutability Constraints

All succession entities are designed as **immutable audit records**. Their RLS configurations enforce:

| Entity | Create | Update | Delete |
|---|---|---|---|
| OrgRole | false | false | false |
| OrgPosition | false | false | false |
| CriticalRole | false | false | false |
| RoleSuccessBlueprint | false | false | false |
| RoleRequirement | false | false | false |
| CriticalRoleRequirement | false | false | false |
| EffectiveBlueprintSnapshot | false | false | false |
| EffectiveRequirementSnapshot | false | false | false |
| SuccessionOperation | false | false | false |
| SuccessionAuditEvent | false (writer-only) | false | false |
| SnapshotIntegrityIncident | false | false | false |

**No succession records can be deleted or directly updated via the SDK.** This is by design — these are audit-grade records that form the integrity backbone of the succession module.

## What CAN Be Done (Lifecycle Transitions Only)

Via authenticated browser sessions calling the dedicated lifecycle backend functions:

| Record Type | Action | Function |
|---|---|---|
| OrgRole | Mark inactive | `successionSetOrgRoleStatus` |
| CriticalRole | Mark removed | `successionChangeCriticalRoleStatus` |
| Blueprint draft | Withdraw | `successionWithdrawBlueprintDraft` |
| Submitted blueprint | Return to draft | `successionReturnBlueprint` → then withdraw |
| Submitted CRR | Return to draft | `successionReturnCriticalRoleRequirement` |

**Approved blueprints, approved CRRs, generated snapshots, and child snapshot records are fully immutable** — they cannot be changed or removed by any mechanism. They are preserved permanently for audit.

## Current Test Data Inventory

### OrgRoles (6 records)
| ID | Title | Status | Blueprint |
|---|---|---|---|
| `6ab561e704e889417a107b10` | VP of Engineering | active | v4-revised (approved, rev 4) |
| `6ab59c229561ec8f627b16b1` | VP of Engineering (SoD Test) | active | v1-sod-test (submitted) |
| `6ab571bdf3af3c1539139e6e` | VP of Engineering (V5 SoD Test) | active | v5-sod-test (submitted) |
| `6ab59f8d2ae6b058652ecb42` | VP of Engineering (V7 SoD Test) | active | v8-sod-genuine (approved, rev 1) ← clean |
| `6ab57207ae95b78818e181e6` | VP of Operations (Override Test) | active | v5-override-test (submitted) |
| `6ab568d8f9b0d0b9bda360ef` | VP of Sales (Zero-Req Test) | active | v1-zero-req (approved, rev 1) |

### Blueprints (11 records)
| Version | Status | Notes |
|---|---|---|
| v8-sod-genuine | approved | ✅ Clean SoD test (submitter ≠ approver) |
| v7-sod-test | submitted | Stale — never approved |
| v1-sod-test | submitted | Stale — never approved |
| v5-override-test | submitted | Stale — never approved |
| v5-sod-test | submitted | Stale — never approved |
| v4-revised | approved | Historical (revision 4) |
| v1-zero-req | approved | Historical (zero-requirement test) |
| v3-clean | superseded | Historical |
| v2-revised | superseded | Historical |
| v1 | superseded | Historical |
| v1 | withdrawn | Historical draft |

### CriticalRoles (4 records)
| ID | Status | Notes |
|---|---|---|
| `6ab5a01610bb54f55a4b8977` | designated | ✅ Clean SoD test (for V8) |
| `6ab573826295a57a5dba98f6` | designated | Historical |
| `6ab572701f81f3a9d67701c0` | removed | Historical (already removed) |
| `6ab561f87766a943382ab3a0` | designated | Historical |

### Snapshots (11 records)
| ID | Status | Integrity | Count |
|---|---|---|---|
| `6ab5a22fa9fc21403b3c0f90` | generated | active | 5 ← ✅ Clean Snapshot 5 |
| 6 others | generation_failed | quarantined | 0-3 |
| 4 others | generated | quarantined | 0-7 |

### Other Records
- **CriticalRoleRequirements**: 18 (1 clean SoD test + 17 historical, many self-approved)
- **RoleRequirements**: ~38 (4 clean SoD test + 34 historical)
- **EffectiveRequirementSnapshot children**: 27 (5 clean + 22 historical)
- **SuccessionOperations**: 20+
- **SuccessionAuditEvents**: 20+

## Recommended Cleanup Actions (Browser-Based)

Since the SDK cannot delete or update succession records, cleanup must be performed via authenticated browser sessions:

### 1. Mark Test OrgRoles as Inactive
For each test-only OrgRole, navigate to **Succession Management → Organizational Roles**, select the role, and set it to inactive:
- VP of Engineering (SoD Test)
- VP of Engineering (V5 SoD Test)
- VP of Operations (Override Test)
- VP of Sales (Zero-Req Test)

**Keep active**: VP of Engineering (original) and VP of Engineering (V7 SoD Test) — the V7 role holds the clean V8 blueprint + Snapshot 5.

### 2. Return Stale Submitted Blueprints
For each stale submitted blueprint, use **Return to Draft** then **Withdraw**:
- v7-sod-test (VP of Engineering V7 SoD Test) — already has V8 approved, so this stale submission can be returned
- v1-sod-test (VP of Engineering SoD Test)
- v5-override-test (VP of Operations Override Test)
- v5-sod-test (VP of Engineering V5 SoD Test)

### 3. Mark Test CriticalRoles as Removed
- `6ab573826295a57a5dba98f6` (historical, designated)
- Keep `6ab5a01610bb54f55a4b8977` (clean SoD test)

### 4. Immutable Records (No Action Possible)
These records are permanently preserved and cannot be changed:
- All approved blueprints (v8, v4, v1-zero-req)
- All superseded blueprints (v3, v2, v1)
- All approved CRRs
- All generated snapshots (including quarantined ones)
- All child EffectiveRequirementSnapshot records
- All SuccessionOperations
- All SuccessionAuditEvents
- All SnapshotIntegrityIncidents

## Historical Contamination Note

17 of the 18 CRRs were self-approved (submitted_by === approved_by) due to the prior lack of SoD enforcement. This is documented in `docs/phase1-v4-revision-checkpoint.md`. These records are preserved as-is for audit — they cannot be modified or deleted. The V8 SoD test data (1 CRR with proper SoD) is the only clean CRR record.

## Summary

| Action | Possible via SDK | Possible via Browser |
|---|---|---|
| Delete succession records | ❌ Never | ❌ Never |
| Update succession records directly | ❌ Never | ❌ Never |
| Lifecycle transitions (inactive/removed/withdrawn) | ❌ (needs auth session) | ✅ Via dedicated functions |
| Mark OrgRole inactive | ❌ | ✅ `successionSetOrgRoleStatus` |
| Mark CriticalRole removed | ❌ | ✅ `successionChangeCriticalRoleStatus` |
| Withdraw blueprint draft | ❌ | ✅ `successionWithdrawBlueprintDraft` |
| Return submitted blueprint | ❌ | ✅ `successionReturnBlueprint` |

**Conclusion**: The succession module's immutability design is working as intended. Test data is preserved as audit history. Only lifecycle transitions are available, and only via authenticated browser sessions calling dedicated backend functions.