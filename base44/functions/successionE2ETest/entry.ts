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
import { resolveCanonicalClient, TenantResolutionError } from "../../shared/resolveClientTenant.ts";

/**
 * POST /successionE2ETest
 *
 * End-to-end test harness for the 9 succession journeys. Exercises the actual
 * succession backend functions through their real API surface (via
 * base44.functions.invoke), creating real records, verifying state transitions,
 * and cleaning up afterward.
 *
 * REQUIREMENTS:
 *   - Caller must be a TENANT ADMIN (Super Administrator, Admin Level 1/2).
 *     Platform Admin is REJECTED — it has no standing succession access.
 *   - The caller's tenant must be explicitly marked synthetic/demo.
 *   - Succession module must be enabled for the tenant.
 *
 * SoD constraints (submitter ≠ approver, proposer ≠ ratifier) are handled by
 * creating prerequisite state via asServiceRole with synthetic actor profile
 * IDs, then calling the actual succession function as the authenticated user.
 *
 * This is a TEST HARNESS — excluded from the architecture guard auth checks.
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

    const role = user.app_role || "User Level 1";
    const isPlatformAdmin =
      role === "Platform Admin" || role === "Platform Administrator" || role === "admin";

    // ── Reject Platform Admin — it has no standing succession access ────────
    if (isPlatformAdmin) {
      harness.recordTest("PREREQ", "Actor role check", false, {
        error:
          "Platform Admin has no standing succession access. " +
          "Log in as a synthetic Super Administrator for the demo tenant to run this test.",
        user_role: role,
      });
      return Response.json(harness.results, { status: 403 });
    }

    // ── Require tenant admin role ──────────────────────────────────────────
    const tenantAdminRoles = ["Super Administrator", "Admin Level 1", "Admin Level 2"];
    if (!tenantAdminRoles.includes(role)) {
      harness.recordTest("PREREQ", "Actor role check", false, {
        error: `Role "${role}" is not a tenant admin. Required: Super Administrator, Admin Level 1, or Admin Level 2.`,
      });
      return Response.json(harness.results, { status: 403 });
    }

    // ── Resolve tenant via canonical resolver (handles slug or entity ID) ──
    const rawClientId = user.client_id || user.data?.client_id;
    if (!rawClientId) {
      harness.recordTest("PREREQ", "Tenant context", false, { error: "No client_id — user must have a tenant" });
      return Response.json(harness.results, { status: 403 });
    }

    let client: any;
    let client_id: string;
    try {
      const resolved = await resolveCanonicalClient(base44, rawClientId);
      client = resolved.client;
      client_id = resolved.canonical_id;
    } catch (e) {
      if (e instanceof TenantResolutionError) {
        harness.recordTest("PREREQ", "Tenant resolution", false, { error: e.message });
        return Response.json(harness.results, { status: 403 });
      }
      throw e;
    }

    // ── Verify tenant is synthetic via the authoritative settings flag ──────
    if (!client.settings?.succession_demo) {
      harness.recordTest("PREREQ", "Synthetic tenant verification", false, {
        error:
          `Tenant "${client.name}" is not marked as synthetic (settings.succession_demo is false). ` +
          "E2E tests may only run against synthetic demo tenants to protect real data.",
        tenant_name: client.name,
        tenant_slug: client.slug,
      });
      return Response.json(harness.results, { status: 403 });
    }

    // ── Check succession is enabled ────────────────────────────────────────
    if (!client.settings?.succession_enabled) {
      harness.recordTest("PREREQ", "Succession module enabled", false, {
        error: "succession_enabled is false. Activate the module before running E2E tests.",
      });
      return Response.json(harness.results, { status: 403 });
    }

    harness.recordTest("PREREQ", "Prerequisites check", true, {
      client_id,
      tenant_name: client.name,
      succession_enabled: true,
      user_role: role,
      is_synthetic: true,
    });

    // ── Setup: create synthetic actor profiles for SoD ─────────────────────
    // The authenticated user is the PRIMARY ACTOR. Synthetic profiles are used
    // only in prerequisite state created via asServiceRole (fixtures), so that
    // SoD checks (submitter ≠ approver, proposer ≠ ratifier) pass when the
    // authenticated user performs the action.
    const runId = `e2e-${Date.now()}`;
    const profileDefs = [
      { key: "candidate",    first: "E2E", last: "Candidate",    dept: "Sales" },
      { key: "submitter",     first: "E2E", last: "Submitter",     dept: "HR" },
      { key: "reviewer",      first: "E2E", last: "Reviewer",      dept: "Talent" },
      { key: "panelist_1",    first: "E2E", last: "Panelist1",     dept: "Talent" },
      { key: "panelist_2",    first: "E2E", last: "Panelist2",     dept: "Operations" },
      { key: "panelist_3",    first: "E2E", last: "Panelist3",     dept: "Finance" },
      { key: "ratifier",      first: "E2E", last: "Ratifier",      dept: "Governance" },
      { key: "approver",      first: "E2E", last: "Approver",      dept: "HR" },
    ];

    const profiles = await base44.asServiceRole.entities.UserProfile.bulkCreate(
      profileDefs.map((p) => ({
        tenant_id: client_id,
        email: `${runId}-${p.key}@synthetic-demo.local`,
        first_name: p.first,
        last_name: p.last,
        department: p.dept,
        status: "ACTIVE",
        source_system: "MANUAL",
      }))
    );

    const ctx: any = {
      user,
      client_id, // canonical entity ID
      runId,
    };
    profileDefs.forEach((p, i) => {
      ctx[`${p.key}_profile_id`] = profiles[i].id;
      harness.trackId("UserProfile", profiles[i].id);
    });

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