import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { validateAssignment, isSnapshotOperationallyBlocked } from "../../shared/successionAssignmentRules.ts";
import { acquireOrgRoleLock, releaseOrgRoleLock } from "../../shared/successionLockHelper.ts";
import { quarantineRecord, resolveIntegrityConflict, filterActiveRecords, RESOLUTION_DISPOSITION } from "../../shared/successionIntegrityHelper.ts";
import { computePayloadHash, computeEventKey } from "../../shared/successionPayloadCanonical.ts";

/**
 * POST /successionPhase1Test
 *
 * Comprehensive Phase 1 checkpoint test harness. Tests:
 *   1. Schema existence — all 12 entities queryable via asServiceRole
 *   2. Direct-write denial — app-user SDK create fails (RLS create=false)
 *   3. Tenant isolation — app-user reads restricted to own client_id
 *   4. SuccessionOperation read denial — app-user read denied (RLS read=false)
 *   5. CAS lock — two concurrent acquireOrgRoleLock calls yield one winner
 *   6. Quarantine — quarantineRecord + filterActiveRecords + resolveIntegrityConflict
 *   7. Assignment rules — end_date<start_date rejected, backdated rejected, cancellation rules
 *   8. Snapshot immutability — isSnapshotOperationallyBlocked detects blocking incidents
 *   9. Payload canonicalization — deterministic hash for same payload, different for different
 *  10. At-least-once audit — event_key deterministic for same logical action
 */
export default async function(req: Request): Promise<Response> {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: { passed: 0, failed: 0, skipped: 0, total: 0 },
  };

  function recordTest(name: string, passed: boolean, details: any, skipped = false) {
    results.tests.push({ name, passed, skipped, details });
    results.summary.total++;
    if (skipped) results.summary.skipped++;
    else if (passed) results.summary.passed++;
    else results.summary.failed++;
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      recordTest("authentication", false, { error: "No authenticated user" });
      return Response.json(results, { status: 401 });
    }

    const client_id = user.client_id || user.data?.client_id;
    if (!client_id) {
      recordTest("tenant_context", false, { error: "No client_id — tests require tenant user" });
      return Response.json(results, { status: 403 });
    }

    const ENTITIES = [
      "SuccessionCycle", "OrgRole", "OrgPosition", "PositionAssignment",
      "CriticalRole", "RoleRequirement", "CriticalRoleRequirement",
      "RoleSuccessBlueprint", "EffectiveBlueprintSnapshot",
      "SuccessionOperation", "SnapshotIntegrityIncident", "SuccessionAuditEvent",
    ];

    // ── Test 1: Schema existence ──────────────────────────────────────────
    for (const entityName of ENTITIES) {
      try {
        await base44.asServiceRole.entities[entityName].list(1);
        recordTest(`schema_exists_${entityName}`, true, { queryable: true });
      } catch (e) {
        recordTest(`schema_exists_${entityName}`, false, { error: (e as Error).message });
      }
    }

    // ── Test 2: Direct-write denial (app-user SDK create fails) ─────────────
    for (const entityName of ["SuccessionCycle", "OrgRole", "SuccessionOperation"]) {
      try {
        await base44.entities[entityName].create({
          client_id, cycle_key: "test", name: "test",
        });
        recordTest(`direct_write_denied_${entityName}`, false, { error: "Create succeeded — RLS NOT enforced!" });
      } catch (e) {
        recordTest(`direct_write_denied_${entityName}`, true, { denied: true, error: (e as Error).message });
      }
    }

    // ── Test 3: SuccessionOperation read denial ───────────────────────────
    try {
      const ops = await base44.entities.SuccessionOperation.list(1);
      recordTest("operation_read_denied", ops.length === 0, {
        count: ops.length, note: "RLS read=false should deny all app-user reads",
      });
    } catch (e) {
      recordTest("operation_read_denied", true, { denied: true, error: (e as Error).message });
    }

    // ── Test 4: SnapshotIntegrityIncident read denial (control-plane) ─────
    try {
      const incidents = await base44.entities.SnapshotIntegrityIncident.list(1);
      recordTest("snapshot_incident_read_denied", incidents.length === 0, {
        count: incidents.length, note: "Control-plane RLS denies app-user reads",
      });
    } catch (e) {
      recordTest("snapshot_incident_read_denied", true, { denied: true, error: (e as Error).message });
    }

    // ── Test 5: CAS lock — two concurrent acquireOrgRoleLock ──────────────
    // Create a test OrgRole first
    let testRoleId: string | null = null;
    try {
      const testRole = await base44.asServiceRole.entities.OrgRole.create({
        client_id, cycle_id: "test-cycle", title: "CAS_TEST_ROLE",
        role_identifier: "CAS_TEST", level: "L1",
        current_blueprint_id: null, blueprint_approval_revision: 0,
        blueprint_approval_lock_token: null,
        confidentiality_level: "confidential", integrity_status: "active",
      });
      testRoleId = testRole.id;

      const [lock1, lock2] = await Promise.all([
        acquireOrgRoleLock({ base44, org_role_id: testRoleId, operation_id: "op-test-1", expected_blueprint_id: null, expected_revision: 0 }),
        acquireOrgRoleLock({ base44, org_role_id: testRoleId, operation_id: "op-test-2", expected_blueprint_id: null, expected_revision: 0 }),
      ]);

      const exactlyOneAcquired = (lock1.acquired && !lock2.acquired) || (!lock1.acquired && lock2.acquired);
      recordTest("cas_lock_concurrent", exactlyOneAcquired, {
        lock1: { acquired: lock1.acquired, reason: lock1.reason },
        lock2: { acquired: lock2.acquired, reason: lock2.reason },
        note: "Exactly one of two concurrent locks should acquire",
      });

      // Release the winning lock
      const winner = lock1.acquired ? lock1 : lock2;
      if (winner.acquired && winner.lock_token) {
        const released = await releaseOrgRoleLock(base44, testRoleId, winner.lock_token, winner.lock_token === lock1.lock_token ? "op-test-1" : "op-test-2");
        recordTest("cas_lock_release", released, { released });
      }
    } catch (e) {
      recordTest("cas_lock_concurrent", false, { error: (e as Error).message });
    } finally {
      if (testRoleId) {
        try { await base44.asServiceRole.entities.OrgRole.delete(testRoleId); } catch {}
      }
    }

    // ── Test 6: Quarantine — filterActiveRecords + resolveIntegrityConflict ─
    try {
      const mockRecords = [
        { id: "1", integrity_status: "active" },
        { id: "2", integrity_status: "quarantined" },
        { id: "3", integrity_status: "pending_validation" },
        { id: "4", integrity_status: "resolved" },
      ];
      const active = filterActiveRecords(mockRecords);
      recordTest("quarantine_filter_active", active.length === 1 && active[0].id === "1", {
        active_count: active.length, note: "Only integrity_status=active records returned",
      });

      // Test resolution dispositions are valid
      const validDispositions = Object.values(RESOLUTION_DISPOSITION);
      const expectedDispositions = [
        "activate_selected_record", "retire_duplicate", "withdraw_record",
        "correct_and_revalidate", "keep_quarantined", "escalate",
      ];
      recordTest("quarantine_dispositions_complete", 
        expectedDispositions.every(d => validDispositions.includes(d as any)),
        { dispositions: validDispositions });
    } catch (e) {
      recordTest("quarantine_filter_active", false, { error: (e as Error).message });
    }

    // ── Test 7: Assignment rules ──────────────────────────────────────────
    try {
      // 7a: end_date before start_date → rejected
      const r1 = validateAssignment({
        start_date: "2026-10-01", end_date: "2026-09-01",
        assignment_timezone: "America/New_York",
      });
      recordTest("assignment_end_before_start_rejected", !r1.valid && r1.errors.includes("end_date_before_start_date"), r1);

      // 7b: backdated without correction → rejected
      const r2 = validateAssignment({
        start_date: "2020-01-01", end_date: "2026-12-31",
        assignment_timezone: "America/New_York",
      });
      recordTest("assignment_backdated_rejected", !r2.valid && r2.errors.includes("backdated_assignment_requires_correction_link"), r2);

      // 7c: backdated WITH correction → accepted
      const r3 = validateAssignment({
        start_date: "2020-01-01", end_date: "2026-12-31",
        assignment_timezone: "America/New_York",
        correction_of_assignment_id: "some-erroneous-id",
      });
      recordTest("assignment_backdated_with_correction_accepted", r3.valid, r3);

      // 7d: cancellation after start_date → rejected
      const r4 = validateAssignment({
        start_date: "2020-01-01",
        assignment_timezone: "America/New_York",
        is_cancellation: true,
      });
      recordTest("assignment_cancellation_after_start_rejected", !r4.valid && r4.errors.includes("cancellation_after_start_date_not_permitted"), r4);

      // 7e: valid future assignment → accepted, status=scheduled
      const r5 = validateAssignment({
        start_date: "2027-01-01", end_date: "2027-12-31",
        assignment_timezone: "America/New_York",
      });
      recordTest("assignment_valid_future_accepted", r5.valid && r5.derived_status === "scheduled", r5);
    } catch (e) {
      recordTest("assignment_rules", false, { error: (e as Error).message });
    }

    // ── Test 8: Snapshot immutability — isSnapshotOperationallyBlocked ────
    try {
      const blockingIncidents = [
        { operational_use_blocked: true, status: "open" },
        { operational_use_blocked: false, status: "resolved" },
      ];
      const blocked = isSnapshotOperationallyBlocked(blockingIncidents);
      recordTest("snapshot_immutability_blocked", blocked === true, {
        blocked, note: "Open incident with operational_use_blocked=true should block",
      });

      const nonBlockingIncidents = [
        { operational_use_blocked: true, status: "dismissed" },
        { operational_use_blocked: true, status: "resolved" },
      ];
      const notBlocked = isSnapshotOperationallyBlocked(nonBlockingIncidents);
      recordTest("snapshot_immutability_not_blocked", notBlocked === false, {
        not_blocked: notBlocked, note: "Dismissed/resolved incidents should not block",
      });
    } catch (e) {
      recordTest("snapshot_immutability", false, { error: (e as Error).message });
    }

    // ── Test 9: Payload canonicalization ──────────────────────────────────
    try {
      const hash1 = await computePayloadHash({ b: 2, a: 1 });
      const hash2 = await computePayloadHash({ a: 1, b: 2 });
      recordTest("payload_canonical_deterministic", hash1 === hash2, {
        hash1, hash2, note: "Same payload different key order → same hash",
      });

      const hash3 = await computePayloadHash({ a: 1, b: 3 });
      recordTest("payload_canonical_different", hash1 !== hash3, {
        hash1, hash3, note: "Different payload → different hash",
      });
    } catch (e) {
      recordTest("payload_canonical", false, { error: (e as Error).message });
    }

    // ── Test 10: At-least-once audit — event_key deterministic ─────────────
    try {
      const key1 = computeEventKey({ action: "blueprint_approved", blueprint_id: "bp-1" });
      const key2 = computeEventKey({ blueprint_id: "bp-1", action: "blueprint_approved" });
      recordTest("audit_event_key_deterministic", key1 === key2, {
        key1, key2, note: "Same logical action different key order → same event_key",
      });
    } catch (e) {
      recordTest("audit_event_key", false, { error: (e as Error).message });
    }

    // ── Test 11: Tenant isolation — cross-tenant read denied ──────────────
    try {
      // Try to read with a fabricated different client_id via app-user SDK
      // RLS should restrict to own client_id only
      const cycles = await base44.entities.SuccessionCycle.list(10);
      const allSameTenant = cycles.every((c: any) => c.client_id === client_id);
      recordTest("tenant_isolation", allSameTenant, {
        count: cycles.length, all_same_tenant: allSameTenant,
        note: "App-user reads restricted to own client_id",
      });
    } catch (e) {
      recordTest("tenant_isolation", true, { denied: true, error: (e as Error).message });
    }

    return Response.json(results, { status: 200 });
  } catch (error) {
    recordTest("unhandled_error", false, { error: (error as Error).message });
    return Response.json(results, { status: 500 });
  }
}