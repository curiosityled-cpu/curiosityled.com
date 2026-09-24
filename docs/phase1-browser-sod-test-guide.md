# Phase 1 — Browser SoD Test Guide

This guide walks you through the genuine two-session Separation of Duties (SoD) test in the browser. The backend SoD mechanism has been verified via simulation; this test confirms the UI enforces it correctly end-to-end.

## Prerequisites

- Two user accounts with succession permissions:
  - **Submitter**: `eosoria@curiosityled.com` (Admin Level 1)
  - **Approver**: `ceo@curiosityled.com` (Platform Admin or Super Administrator)
- Both accounts must belong to the same tenant (client)
- A succession cycle and org role must exist

## Test Setup

### Step 1: Prepare Fresh Test Data (as either user)

Since V8 is already approved, you need a fresh draft for the browser test:

1. Navigate to **Succession Management** → **Succession Cycles**
2. Ensure a cycle exists (or create one)
3. Navigate to **Organizational Roles**
4. Create a new OrgRole: "VP of Engineering (Browser SoD Test)"
5. Navigate to **Role Success Blueprints**
6. Select the new role and create a blueprint draft (e.g., "v1-browser-sod")
7. Add 2-3 requirements to the draft

## Session A — Submitter (eosoria)

### Step 2: Submit the Blueprint

1. Open an incognito/private browser window
2. Log in as `eosoria@curiosityled.com`
3. Navigate to **Succession Management** → **Role Success Blueprints**
4. Select the "VP of Engineering (Browser SoD Test)" role
5. Find the "v1-browser-sod" draft blueprint
6. Click **Submit for Approval**
7. Verify: blueprint status changes to `submitted`
8. Verify: the **Approve** button is **disabled** with tooltip "Separation of duties: you cannot approve a blueprint you submitted"
9. Verify: "You submitted this" text appears next to the blueprint

### Step 3: Submit a CRR (if testing CRR SoD)

1. Navigate to **Critical Roles**
2. Designate a critical role for the test position
3. Create a CriticalRoleRequirement (position-specific requirement)
4. Submit the CRR for approval
5. Verify: the Approve button is disabled for you (submitter)

## Session B — Approver (ceo)

### Step 4: Approve the Blueprint

1. Open a **second** incognito/private browser window (different browser or profile)
2. Log in as `ceo@curiosityled.com`
3. Navigate to **Succession Management** → **Role Success Blueprints**
4. Select the "VP of Engineering (Browser SoD Test)" role
5. Find the "v1-browser-sod" submitted blueprint
6. Verify: the **Approve** button is **enabled** (you are not the submitter)
7. Click **Approve**
8. Verify: blueprint status changes to `approved`
9. Verify: `is_current` is true, revision incremented

### Step 5: Approve the CRR

1. Navigate to **Critical Roles**
2. Find the submitted CRR
3. Verify: the **Approve** button is **enabled**
4. Click **Approve**
5. Verify: CRR status changes to `approved`

### Step 6: Generate Snapshot

1. Navigate to **Effective Snapshots**
2. Generate a snapshot for the approved blueprint + critical role
3. Verify: snapshot status is `generated`, count matches, no integrity incidents

## Negative Test — Self-Approval Rejection

### Step 7: Verify Self-Approval is Blocked

1. In Session A (eosoria), create another blueprint draft and submit it
2. Attempt to approve it yourself
3. Verify: the **Approve** button is **disabled** with SoD tooltip
4. (Backend already verified: even if bypassed via API, 403 is returned)

## Acceptance Criteria

| Check | Expected Result |
|---|---|
| Submitter sees Approve disabled | ✅ Button disabled + "You submitted this" text |
| Approver sees Approve enabled | ✅ Button enabled, no SoD warning |
| Blueprint approval succeeds (different users) | ✅ Status → approved, revision incremented |
| CRR approval succeeds (different users) | ✅ Status → approved |
| Snapshot generates from approved data | ✅ Status → generated, count matches, 0 incidents |
| Self-approval blocked in UI | ✅ Button disabled with SoD tooltip |
| Self-approval blocked in backend | ✅ 403 returned (already verified) |
| Audit events captured | ✅ `blueprint_approved`, `crr_approved`, `snapshot_generated` with operation_id |

## What Has Already Been Verified (Backend)

The following were verified via backend simulation and do NOT need re-verification in the browser:

- ✅ Self-approval returns 403 (negative SoD test)
- ✅ Different-user approval succeeds (positive SoD test, blueprint)
- ✅ Different-user approval succeeds (positive SoD test, CRR)
- ✅ Snapshot 5 generated with 5 requirements, hash verified, 0 incidents
- ✅ Server-side identity derivation (ignores request-body identity fields)
- ✅ Audit events with operation_id and event_key for deduplication

The browser test confirms the **UI layer** correctly wires these checks — disabling the Approve button for submitters and enabling it for different users.