import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import {
  E2ETestHarness,
  journey1_OrgFoundation,
  journey2_CriticalRole,
  journey3_BlueprintAndSnapshot,
  journey4_TalentPool,
  journey5_Evidence,
  journey6_Readiness,
  journey7_Development,
  journey8_Transition,
  journey9_Monitoring,
} from "../../shared/successionE2ETestHelper.ts";

/**
 * POST /successionE2ETest
 *
 * End-to-end test harness for the 9 succession journeys. Exercises the actual
 * succession backend functions through their real API surface (via
 * base44.functions.invoke), creating real records, verifying state transitions,
 * and cleaning up afterward.
 *
 * Prerequisites:
 *   - Authenticated user with an admin role (Admin Level 1/2, Super Administrator)
 *   - Succession module enabled for the user's tenant (Client.settings.succession_enabled = true)
 *   - User must have a client_id (tenant context)
 *
 * Returns a JSON report with per-test results, per-journey summaries, and an
 * overall pass/fail count. All created records are cleaned up via asServiceRole
 * at the end (or on error).
 *
 * This is a TEST HARNESS — excluded from the architecture guard auth checks.
 * It does NOT call bootstrapSuccessionAuth/authorizeSuccessionAction itself;
 * the invoked succession functions handle their own authorization.
 */
export default async function(req: Request): Promise<Response> {
  const harness = new E2ETestHarness();
  let base44: any;

  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      harness.recordTest("PREREQ", "Authentication", false, { error: "No authenticated user" });
      return Response.json(harness.results, { status: 401 });
    }

    const client_id = user.client_id || user.data?.client_id;
    if (!client_id) {
      harness.recordTest("PREREQ", "Tenant context", false, { error: "No client_id — user must have a tenant" });
      return Response.json(harness.results, { status: 403 });
    }

    // Check succession is enabled for this tenant (same pattern as bootstrapSuccessionAuth)
    let client: any = null;
    try {
      client = await base44.asServiceRole.entities.Client.get(client_id);
    } catch {
      // Client may not exist; leave null
    }
    if (!client) {
      harness.recordTest("PREREQ", "Client exists", false, { error: "Client not found for client_id" });
      return Response.json(harness.results, { status: 403 });
    }
    if (!client.settings?.succession_enabled) {
      harness.recordTest("PREREQ", "Succession module enabled", false, {
        error: "succession_enabled is false for this tenant. Activate it before running E2E tests.",
      });
      return Response.json(harness.results, { status: 403 });
    }
    harness.recordTest("PREREQ", "Prerequisites check", true, {
      client_id,
      succession_enabled: true,
      user_role: user.app_role || user.role,
    });

    // ── Setup: create test user profiles ──────────────────────────────────
    const profiles = await base44.asServiceRole.entities.UserProfile.bulkCreate([
      { tenant_id: client_id, email: `e2e-candidate-${Date.now()}@test.local`, first_name: "E2E", last_name: "Candidate", department: "Sales", status: "ACTIVE", source_system: "MANUAL" },
      { tenant_id: client_id, email: `e2e-submitter-${Date.now()}@test.local`, first_name: "E2E", last_name: "Submitter", department: "HR", status: "ACTIVE", source_system: "MANUAL" },
    ]);
    harness.trackId("UserProfile", profiles[0].id);
    harness.trackId("UserProfile", profiles[1].id);

    const ctx: any = {
      user,
      client_id,
      candidate_profile_id: profiles[0].id,
      submitter_profile_id: profiles[1].id, // used for SoD (submitter ≠ approver)
    };

    // ── Run 9 journeys sequentially ────────────────────────────────────────
    const journeys = [
      { fn: journey1_OrgFoundation,      name: "Organizational Foundation" },
      { fn: journey2_CriticalRole,        name: "Critical Role & Requirements" },
      { fn: journey3_BlueprintAndSnapshot, name: "Blueprint & Snapshot" },
      { fn: journey4_TalentPool,          name: "Talent Pool & Candidacy" },
      { fn: journey5_Evidence,            name: "Evidence Lifecycle" },
      { fn: journey6_Readiness,          name: "Readiness Deliberation" },
      { fn: journey7_Development,        name: "Development Planning" },
      { fn: journey8_Transition,         name: "Transition Execution" },
      { fn: journey9_Monitoring,         name: "Operational Monitoring" },
    ];

    let prevFailed = false;
    for (let i = 0; i < journeys.length; i++) {
      const { fn, name } = journeys[i];
      if (prevFailed) {
        harness.recordTest(`J${i + 1}-SKIP`, `Journey ${i + 1}: ${name} (skipped)`, true, {
          reason: "Prerequisite journey failed — skipping dependent journeys",
        }, true);
        harness.results.journeys.push({
          journey: i + 1,
          name,
          status: "skipped",
          tests_passed: 0,
          tests_failed: 0,
          error: "prerequisite journey failed",
        });
        continue;
      }
      try {
        const ok = await fn(harness, base44, ctx);
        if (!ok) prevFailed = true;
      } catch (e: any) {
        harness.recordTest(`J${i + 1}-ERROR`, `Journey ${i + 1}: ${name} (unhandled error)`, false, {
          error: e?.message || String(e),
        });
        prevFailed = true;
      }
    }

    // ── Cleanup ───────────────────────────────────────────────────────────
    await harness.cleanup(base44);

    return Response.json(harness.results, { status: 200 });
  } catch (error: any) {
    if (base44) {
      try { await harness.cleanup(base44); } catch {}
    }
    harness.recordTest("FATAL", "Fatal error", false, { error: error?.message || String(error) });
    return Response.json(harness.results, { status: 500 });
  }
}