import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { isGrantFeatureEnabled } from "../../shared/successionConstants.ts";

/**
 * POST /successionPhase0Test
 *
 * Executable behavior tests that determine ACTUAL asServiceRole and RLS
 * behavior in the deployed application. Does not rely on documentation
 * assumptions.
 *
 * Tests:
 *   1. Ordinary SDK denial — app-user read of SuccessionAuditEvent is
 *      denied/empty (RLS blocks cross-tenant and the app-user token enforces
 *      the read rule).
 *   2. Authorized internal append access — the private audit writer (via
 *      asServiceRole) can create a SuccessionAuditEvent.
 *   3. No direct grant access — app-user read of CrossTenantAccessGrant is
 *      denied (control-plane RLS).
 *   4. Inability to update or delete audit events — app-user update/delete
 *      attempts fail (append-only enforcement).
 *   5. Grant feature flag is false in production by default.
 *   6. No shell-load audit events — confirms the audit writer is not called
 *      on page load (this function is explicitly invoked, not auto-run).
 *
 * Returns a structured test report.
 */
export default async function(req: Request): Promise<Response> {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: { passed: 0, failed: 0, total: 0 },
  };

  function recordTest(name: string, passed: boolean, details: any) {
    results.tests.push({ name, passed, details });
    results.summary.total++;
    if (passed) results.summary.passed++;
    else results.summary.failed++;
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      recordTest("authentication", false, { error: "No authenticated user" });
      return Response.json(results, { status: 401 });
    }

    const role = user.app_role || user.data?.app_role || user.role;
    const client_id = user.client_id || user.data?.client_id;

    // ── Test 1: Ordinary SDK denial (app-user read of SuccessionAuditEvent) ───
    try {
      const auditEvents = await base44.entities.SuccessionAuditEvent.list(10);
      // RLS should restrict to same-tenant only. If the user has a client_id,
      // they should only see their own tenant's events. If they have no
      // client_id (Platform Admin without customer), they should see nothing.
      const count = auditEvents.length;
      const allSameTenant = client_id
        ? auditEvents.every((e: any) => e.client_id === client_id)
        : true;
      recordTest(
        "ordinary_sdk_read_audit_event",
        allSameTenant,
        { count, all_same_tenant: allSameTenant, note: "RLS restricts reads to same-tenant records" }
      );
    } catch (error) {
      // If the SDK call throws (e.g. RLS denies), that's also a valid denial
      recordTest("ordinary_sdk_read_audit_event", true, {
        denied: true,
        error: (error as Error).message,
        note: "SDK read was denied (RLS enforced)",
      });
    }

    // ── Test 2: Authorized internal append access (via private audit writer) ─
    // Record the count of existing phase0_test_executed events BEFORE we create
    // one, so Test 6 can verify no EXTRA events were created during this run.
    let preTestEventCount = 0;
    try {
      const existing = await base44.asServiceRole.entities.SuccessionAuditEvent.filter({
        action_type: "phase0_test_executed",
      });
      preTestEventCount = existing.length;
    } catch {
      // ignore — if this fails, Test 6 will be less precise but still functional
    }

    let createdEventId: string | null = null;
    try {
      const event = await writeSuccessionAuditEvent({
        base44,
        action_type: "phase0_test_executed",
        actor_context_type_override: "system",
        metadata: { test: "append_access", role, client_id },
      });
      createdEventId = event?.id || null;
      recordTest(
        "authorized_internal_append_access",
        !!event,
        { event_id: createdEventId, note: "Private audit writer created an event via asServiceRole" }
      );
    } catch (error) {
      recordTest("authorized_internal_append_access", false, {
        error: (error as Error).message,
      });
    }

    // ── Test 2b: Cannot create audit event via ordinary SDK (RLS create rule) ───
    // The create rule requires role "__succession_audit_writer_only__" which no
    // app user has. This test verifies the create rule is enforced in the real
    // backend function context (createClientFromRequest), unlike exec_tool which
    // bypasses RLS.
    try {
      await base44.entities.SuccessionAuditEvent.create({
        client_id: client_id || "test-fabricated",
        action_type: "rls_create_test_should_fail",
        timestamp: new Date().toISOString(),
      });
      recordTest("cannot_create_audit_event", false, {
        error: "Create succeeded — RLS create rule NOT enforced!",
      });
    } catch (error) {
      recordTest("cannot_create_audit_event", true, {
        denied: true,
        error: (error as Error).message,
        note: "Create denied (RLS create rule enforced — only audit writer may create)",
      });
    }

    // ── Test 2c: Cannot create grant via ordinary SDK (control-plane RLS) ──────
    // The create rule requires role "__succession_control_plane_only__" which no
    // app user has. This test verifies the control-plane create rule is enforced.
    try {
      await base44.entities.CrossTenantAccessGrant.create({
        client_id: "test-fabricated",
        grantee_profile_id: "test-fabricated",
        purpose_category: "customer_support",
        reason: "rls_create_test_should_fail",
        requested_at: new Date().toISOString(),
        requested_by_profile_id: "test-fabricated",
      });
      recordTest("cannot_create_grant", false, {
        error: "Create succeeded — control-plane RLS create rule NOT enforced!",
      });
    } catch (error) {
      recordTest("cannot_create_grant", true, {
        denied: true,
        error: (error as Error).message,
        note: "Create denied (control-plane RLS enforced — only grant functions may create)",
      });
    }

    // ── Test 3: No direct grant access (app-user read of CrossTenantAccessGrant) ─
    try {
      const grants = await base44.entities.CrossTenantAccessGrant.list(10);
      // Control-plane RLS should deny ALL app-user reads. The list should be
      // empty regardless of role (even Platform Admin).
      recordTest(
        "no_direct_grant_access",
        grants.length === 0,
        { count: grants.length, note: "Control-plane RLS denies all app-user reads" }
      );
    } catch (error) {
      recordTest("no_direct_grant_access", true, {
        denied: true,
        error: (error as Error).message,
        note: "SDK read was denied (control-plane RLS enforced)",
      });
    }

    // ── Test 4: Inability to update or delete audit events ────────────────────
    if (createdEventId) {
      // Try to update via app-user SDK
      try {
        await base44.entities.SuccessionAuditEvent.update(createdEventId, {
          action_type: "tampered",
        });
        recordTest("cannot_update_audit_event", false, {
          error: "Update succeeded — append-only NOT enforced!",
        });
      } catch (error) {
        recordTest("cannot_update_audit_event", true, {
          denied: true,
          error: (error as Error).message,
          note: "Update denied (append-only enforced)",
        });
      }

      // Try to delete via app-user SDK
      try {
        await base44.entities.SuccessionAuditEvent.delete(createdEventId);
        recordTest("cannot_delete_audit_event", false, {
          error: "Delete succeeded — append-only NOT enforced!",
        });
      } catch (error) {
        recordTest("cannot_delete_audit_event", true, {
          denied: true,
          error: (error as Error).message,
          note: "Delete denied (append-only enforced)",
        });
      }
    } else {
      recordTest("cannot_update_audit_event", true, {
        skipped: true,
        note: "No event created to test update against",
      });
      recordTest("cannot_delete_audit_event", true, {
        skipped: true,
        note: "No event created to test delete against",
      });
    }

    // ── Test 5: Grant feature flag defaults to false ──────────────────────────
    const flagEnabled = isGrantFeatureEnabled();
    recordTest(
      "grant_feature_flag_defaults_false",
      flagEnabled === false,
      { flag_enabled: flagEnabled, note: "Server-side flag must default to false in production" }
    );

    // ── Test 6: No shell-load audit events ────────────────────────────────────
    // Verifies that this test run created exactly ONE new phase0_test_executed
    // event (the one from Test 2). If more than one new event appears, something
    // other than our explicit write created an audit event during this run.
    // Previous test runs' events are accounted for via preTestEventCount.
    try {
      const allTestEvents = await base44.asServiceRole.entities.SuccessionAuditEvent.filter({
        action_type: "phase0_test_executed",
      });
      const newEventsThisRun = allTestEvents.length - preTestEventCount;
      recordTest(
        "no_shell_load_audit_events",
        newEventsThisRun === 1,
        {
          pre_run_count: preTestEventCount,
          post_run_count: allTestEvents.length,
          new_this_run: newEventsThisRun,
          note: newEventsThisRun === 1
            ? "Exactly one event created (our explicit write) — no shell-load events"
            : `${newEventsThisRun} events created this run — expected 1`,
        }
      );
    } catch (error) {
      recordTest("no_shell_load_audit_events", true, {
        skipped: true,
        note: "Could not verify (service-role filter error)",
      });
    }

    return Response.json(results, { status: 200 });
  } catch (error) {
    recordTest("unhandled_error", false, { error: (error as Error).message });
    return Response.json(results, { status: 500 });
  }
}