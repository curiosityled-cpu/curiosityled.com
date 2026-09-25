/**
 * successionArchitectureGuard.test.mjs — automated architecture test.
 *
 * Run:  node base44/tests/successionArchitectureGuard.test.mjs
 *   or:  npx vitest run base44/tests/successionArchitectureGuard.test.mjs
 *
 * FAILS (exit code 1) if any operational succession function bypasses the
 * authorization bootstrap (bootstrapSuccessionAuth) or the domain
 * authorization gate (authorizeSuccessionAction).
 *
 * Classification:
 *   operational    — must import AND call both bootstrapSuccessionAuth and
 *                    authorizeSuccessionAction.
 *   control_plane  — must import resolvePlatformOperatorContext (or, for
 *                    successionPartnerValidate, perform partner_client_ids
 *                    validation from the authenticated user).
 *   infrastructure — must call bootstrapSuccessionAuth (read-only operation
 *                    status / heartbeat; no domain authorization needed).
 *   test           — excluded from the guard.
 *
 * Any new succession function that is not classified AND does not call both
 * auth gates is reported as a violation, causing the guard to fail.
 */

import { readdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FUNCTIONS_DIR = join(__dirname, "..", "functions");

// ── Classification constants ────────────────────────────────────────────────
const CONTROL_PLANE_FUNCTIONS = new Set([
  "successionCrossTenantRead",
  "successionGrantApprove",
  "successionGrantList",
  "successionGrantRequest",
  "successionGrantRevoke",
  "successionPartnerValidate",
]);

const INFRASTRUCTURE_FUNCTIONS = new Set([
  "successionGetOperationStatus",
  "successionHeartbeat",
]);

const TEST_FUNCTIONS = new Set([
  "successionPhase0Test",
  "successionPhase1Test",
  "successionPhase1_5Test",
]);

const BOOTSTRAP_CALL = "bootstrapSuccessionAuth(";
const AUTHORIZE_CALL = "authorizeSuccessionAction(";
const PLATFORM_OPERATOR_IMPORT = "resolvePlatformOperatorContext";
const PARTNER_VALIDATE_MARKER = "partner_client_ids";

function listSuccessionFunctions() {
  if (!existsSync(FUNCTIONS_DIR)) {
    throw new Error(`Functions directory not found: ${FUNCTIONS_DIR}`);
  }
  return readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith("succession"))
    .map((e) => e.name)
    .sort();
}

function readEntryFile(fnName) {
  const entryPath = join(FUNCTIONS_DIR, fnName, "entry.ts");
  return readFileSync(entryPath, "utf-8");
}

function runGuard() {
  const allFunctions = listSuccessionFunctions();
  const violations = [];
  const operationalFunctions = [];
  const coverage = {
    operational: 0,
    control_plane: 0,
    infrastructure: 0,
    test: 0,
    unclassified: 0,
  };

  for (const fnName of allFunctions) {
    let source;
    try {
      source = readEntryFile(fnName);
    } catch {
      // Directory without entry.ts — skip (not a deployed function)
      continue;
    }

    const isTest = TEST_FUNCTIONS.has(fnName);
    const isControlPlane = CONTROL_PLANE_FUNCTIONS.has(fnName);
    const isInfrastructure = INFRASTRUCTURE_FUNCTIONS.has(fnName);

    if (isTest) {
      coverage.test++;
      continue;
    }

    if (isControlPlane) {
      coverage.control_plane++;
      const hasPlatformOperator = source.includes(PLATFORM_OPERATOR_IMPORT);
      const hasPartnerValidation = source.includes(PARTNER_VALIDATE_MARKER);
      if (!hasPlatformOperator && !hasPartnerValidation) {
        violations.push({
          function: fnName,
          category: "control_plane",
          issue: "missing_platform_operator_or_partner_validation",
        });
      }
      continue;
    }

    if (isInfrastructure) {
      coverage.infrastructure++;
      if (!source.includes(BOOTSTRAP_CALL)) {
        violations.push({
          function: fnName,
          category: "infrastructure",
          issue: "missing_bootstrap_call",
        });
      }
      continue;
    }

    // ── Operational function (the critical guard) ──────────────────────
    coverage.operational++;
    operationalFunctions.push(fnName);

    if (!source.includes(BOOTSTRAP_CALL)) {
      violations.push({
        function: fnName,
        category: "operational",
        issue: "missing_bootstrap_call",
      });
    }
    if (!source.includes(AUTHORIZE_CALL)) {
      violations.push({
        function: fnName,
        category: "operational",
        issue: "missing_authorize_call",
      });
    }
  }

  return {
    passed: violations.length === 0,
    total_functions: allFunctions.length,
    coverage,
    operational_functions: operationalFunctions,
    violations,
    checked_at: new Date().toISOString(),
  };
}

// ── Test runner (vitest-compatible + standalone) ────────────────────────────
const result = runGuard();

if (import.meta.vitest) {
  // vitest mode
  test("architecture guard: all operational succession functions call auth gates", () => {
    expect(result.passed, JSON.stringify(result.violations, null, 2)).toBe(true);
  });
} else {
  // standalone mode
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) {
    console.error(`\n❌ ARCHITECTURE GUARD FAILED: ${result.violations.length} violation(s)`);
    for (const v of result.violations) {
      console.error(`   ${v.function}: ${v.issue} (category: ${v.category})`);
    }
    process.exit(1);
  } else {
    console.log(`\n✅ ARCHITECTURE GUARD PASSED: ${result.coverage.operational} operational, ${result.coverage.control_plane} control-plane, ${result.coverage.infrastructure} infrastructure, ${result.coverage.test} test functions checked.`);
  }
}

export { runGuard };