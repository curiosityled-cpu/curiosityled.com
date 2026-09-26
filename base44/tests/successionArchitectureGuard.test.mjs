/**
 * successionArchitectureGuard.test.mjs — Hardened Architecture Release Control
 *
 * Run:  node base44/tests/successionArchitectureGuard.test.mjs
 *   or:  npx vitest run base44/tests/successionArchitectureGuard.test.mjs
 *   or:  npm run guard  (also runs on prebuild)
 *
 * EXIT CODE: 0 = pass, 1 = violations found.
 *
 * This guard is a RELEASE CONTROL. It must pass before any Phase 1 build
 * is published. It verifies that every succession backend function enforces
 * the mandatory authorization bootstrap and domain authorization gate.
 *
 * Hardening:
 *   1. Strips comments AND string literals before checking — dead-code
 *      string references in comments/strings do NOT satisfy the guard.
 *   2. Verifies auth calls occur in EXECUTABLE code (not comments/strings).
 *   3. Verifies authorization occurs BEFORE the first domain entity read
 *      or service-role operation (ordering check via character offset).
 *   4. Uses an EXPLICIT, REVIEWED exception list (below). Any function
 *      not in an exception set defaults to "operational" and MUST pass
 *      both auth gates.
 *   5. FAILS on unknown or duplicate classifications.
 *   6. Prevents test harnesses from being referenced by production functions.
 *   7. Produces a machine-readable JSON report artifact at
 *      base44/tests/reports/succession-architecture-guard-report.json.
 *   8. Exits nonzero on every violation.
 *
 * Classification (each function classified EXACTLY ONCE):
 *   operational    — must call bootstrapSuccessionAuth THEN authorizeSuccessionAction,
 *                    both before any domain entity access.
 *   control_plane  — must call resolvePlatformOperatorContext or perform
 *                    partner_client_ids validation. No tenant-domain access
 *                    while the grant feature is disabled.
 *   infrastructure — must call bootstrapSuccessionAuth (read-only operation
 *                    status / heartbeat; no domain authorization needed).
 *   test_harness   — excluded from auth checks, but must NOT be referenced
 *                    by any production function.
 *   private_helper — shared modules in base44/shared/ (not callable backend
 *                    functions; inventoried but not auth-gated).
 *
 * Any new succession function that is not classified AND does not call both
 * auth gates is reported as a violation, causing the guard to fail.
 */

import { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FUNCTIONS_DIR = join(__dirname, "..", "functions");
const SHARED_DIR = join(__dirname, "..", "shared");
const REPORT_DIR = join(__dirname, "reports");
const REPORT_PATH = join(REPORT_DIR, "succession-architecture-guard-report.json");

// ═══════════════════════════════════════════════════════════════════════════
// REVIEWED EXCEPTION LIST
// ═══════════════════════════════════════════════════════════════════════════
// Last reviewed: 2026-09-25
// Reviewer: Phase 1 Security Hardening — Curiosity Led
//
// These sets are the EXPLICIT, REVIEWED exception list. Any succession
// function NOT listed here defaults to "operational" and MUST pass both
// auth gates. Adding a function to an exception set requires security
// review and updating the review date above.
// ═══════════════════════════════════════════════════════════════════════════

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

const TEST_HARNESS_FUNCTIONS = new Set([
  "successionPhase0Test",
  "successionPhase1Test",
  "successionPhase1_5Test",
]);

// Approved auth call markers (checked in executable code)
const BOOTSTRAP_CALL = "bootstrapSuccessionAuth(";
const AUTHORIZE_CALL = "authorizeSuccessionAction(";
const PLATFORM_OPERATOR_CALL = "resolvePlatformOperatorContext(";
const PARTNER_VALIDATE_MARKER = "partner_client_ids";

// Domain entity names — accessing these requires prior authorization.
// SuccessionOperation and SuccessionAuditEvent are infrastructure (exempt
// from the ordering check since they may be written before authorization
// for idempotency tracking).
const DOMAIN_ENTITY_NAMES = new Set([
  "SuccessionCycle",
  "OrgRole",
  "OrgPosition",
  "OrgPositionChange",
  "RoleSuccessBlueprint",
  "RoleRequirement",
  "CriticalRole",
  "CriticalRoleRequirement",
  "EffectiveBlueprintSnapshot",
  "EffectiveRequirementSnapshot",
  "SnapshotIntegrityIncident",
  "PositionAssignment",
  "CrossTenantAccessGrant",
  "TalentPool",
  "TalentPoolMembership",
  "SuccessorCandidacy",
  "CandidateSelfDisclosure",
  "EvidenceRecord",
  "EvidenceReviewDecision",
  "ReadinessConclusion",
  "ReadinessEvidenceCitation",
  "ReadinessCondition",
  "CalibrationSession",
  "CalibrationCase",
  "CalibrationJudgment",
  "GovernanceApproval",
]);

// ═══════════════════════════════════════════════════════════════════════════
// COMMENT AND STRING STRIPPING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Strips comments and string literals from TypeScript source, leaving only
 * executable code. This prevents dead-code string references in comments or
 * strings from satisfying the guard.
 *
 * - Block comments (/* ... *\/) removed.
 * - Line comments (// ...) removed.
 * - Template literals, double-quoted, and single-quoted strings replaced
 *   with empty quotes to preserve token boundaries.
 */
function stripCommentsAndStrings(source) {
  let result = source;

  // Remove block comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, "");

  // Remove line comments (// not inside a colon, e.g. not in URLs)
  // Simple but effective: remove // to end of line when not preceded by :
  result = result.replace(/(^|[^:])\/\/.*$/gm, "$1");

  // Replace string literals with empty quotes to preserve token boundaries
  // Template literals first (they may contain ${...} with code)
  result = result.replace(/`[^`]*`/g, '""');
  // Double-quoted strings
  result = result.replace(/"[^"]*"/g, '""');
  // Single-quoted strings
  result = result.replace(/'[^']*'/g, '""');

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTABLE CODE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find the character offset of the first occurrence of `pattern` in
 * executable code (comments and strings stripped). Returns -1 if not found.
 */
function findInExecutableCode(source, pattern) {
  const stripped = stripCommentsAndStrings(source);
  return stripped.indexOf(pattern);
}

/**
 * Find the first domain entity access in executable code.
 * Returns { offset, entity } or { offset: -1, entity: "" } if none found.
 */
function findFirstDomainAccess(source) {
  const stripped = stripCommentsAndStrings(source);
  const regex = /base44\.(?:asServiceRole\.)?entities\.(\w+)/g;
  let match;
  while ((match = regex.exec(stripped)) !== null) {
    const entityName = match[1];
    if (DOMAIN_ENTITY_NAMES.has(entityName)) {
      return { offset: match.index, entity: entityName };
    }
  }
  return { offset: -1, entity: "" };
}

/**
 * Find the first service-role operation in executable code.
 * Returns the character offset, or -1 if not found.
 * We look for base44.asServiceRole. NOT followed by entities.SuccessionOperation
 * (which is infrastructure for idempotency).
 */
function findFirstServiceRoleDomainOp(source) {
  const stripped = stripCommentsAndStrings(source);
  const regex = /base44\.asServiceRole\.entities\.(\w+)/g;
  let match;
  while ((match = regex.exec(stripped)) !== null) {
    const entityName = match[1];
    if (DOMAIN_ENTITY_NAMES.has(entityName)) {
      return match.index;
    }
  }
  return -1;
}

// ═══════════════════════════════════════════════════════════════════════════
// CLASSIFICATION VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect duplicate classifications — a function appearing in more than one
 * exception set is a violation.
 */
function detectDuplicateClassifications() {
  const duplicates = [];
  const allSets = [
    { name: "control_plane", set: CONTROL_PLANE_FUNCTIONS },
    { name: "infrastructure", set: INFRASTRUCTURE_FUNCTIONS },
    { name: "test_harness", set: TEST_HARNESS_FUNCTIONS },
  ];

  for (const fn of allFunctions) {
    const classifications = allSets.filter(s => s.set.has(fn)).map(s => s.name);
    if (classifications.length > 1) {
      duplicates.push({ function: fn, classifications });
    }
  }
  return duplicates;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCTION DISCOVERY
// ═══════════════════════════════════════════════════════════════════════════

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

// Shared private-helper modules (base44/shared/)
function listSharedHelpers() {
  if (!existsSync(SHARED_DIR)) return [];
  return readdirSync(SHARED_DIR)
    .filter((f) => f.startsWith("succession") || f.startsWith("authorize") || f.startsWith("resolve"))
    .sort();
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST HARNESS ISOLATION CHECK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verify no production function references a test harness function name.
 * This prevents test harnesses from being callable production functions.
 */
function checkTestHarnessIsolation(allFunctions, testFunctions) {
  const violations = [];
  const testNames = [...testFunctions];

  for (const fnName of allFunctions) {
    if (testFunctions.has(fnName)) continue; // skip test functions themselves

    let source;
    try {
      source = readEntryFile(fnName);
    } catch {
      continue;
    }

    const stripped = stripCommentsAndStrings(source);
    for (const testName of testNames) {
      if (stripped.includes(testName)) {
        violations.push({
          function: fnName,
          category: "test_isolation",
          issue: `production_function_references_test_harness`,
          referenced_test: testName,
        });
      }
    }
  }
  return violations;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN GUARD LOGIC
// ═══════════════════════════════════════════════════════════════════════════

const allFunctions = listSuccessionFunctions();

function runGuard() {
  const violations = [];
  const inventory = [];
  const coverage = {
    operational: 0,
    control_plane: 0,
    infrastructure: 0,
    test_harness: 0,
    private_helper: 0,
    unclassified: 0,
  };

  // ── Check for duplicate classifications ─────────────────────────────
  const allSets = [
    { name: "control_plane", set: CONTROL_PLANE_FUNCTIONS },
    { name: "infrastructure", set: INFRASTRUCTURE_FUNCTIONS },
    { name: "test_harness", set: TEST_HARNESS_FUNCTIONS },
  ];
  for (const fnName of allFunctions) {
    const classifications = allSets.filter(s => s.set.has(fnName)).map(s => s.name);
    if (classifications.length > 1) {
      violations.push({
        function: fnName,
        category: "classification",
        issue: "duplicate_classification",
        classifications,
      });
    }
  }

  // ── Test harness isolation ───────────────────────────────────────────
  const isolationViolations = checkTestHarnessIsolation(allFunctions, TEST_HARNESS_FUNCTIONS);
  violations.push(...isolationViolations);

  // ── Classify and check each function ────────────────────────────────
  for (const fnName of allFunctions) {
    let source;
    try {
      source = readEntryFile(fnName);
    } catch {
      // Directory without entry.ts — skip (not a deployed function)
      continue;
    }

    let classification = "operational"; // default
    if (TEST_HARNESS_FUNCTIONS.has(fnName)) classification = "test_harness";
    else if (CONTROL_PLANE_FUNCTIONS.has(fnName)) classification = "control_plane";
    else if (INFRASTRUCTURE_FUNCTIONS.has(fnName)) classification = "infrastructure";

    const entry = {
      name: fnName,
      classification,
      bootstrap_offset: -1,
      authorize_offset: -1,
      domain_access_offset: -1,
      domain_access_entity: "",
      ordering_ok: null,
      issues: [],
    };

    if (classification === "test_harness") {
      coverage.test_harness++;
      inventory.push(entry);
      continue;
    }

    if (classification === "control_plane") {
      coverage.control_plane++;
      const platformOpOffset = findInExecutableCode(source, PLATFORM_OPERATOR_CALL);
      const partnerOffset = findInExecutableCode(source, PARTNER_VALIDATE_MARKER);
      if (platformOpOffset === -1 && partnerOffset === -1) {
        violations.push({
          function: fnName,
          category: "control_plane",
          issue: "missing_platform_operator_or_partner_validation",
        });
        entry.issues.push("missing_platform_operator_or_partner_validation");
      }
      inventory.push(entry);
      continue;
    }

    if (classification === "infrastructure") {
      coverage.infrastructure++;
      const bootstrapOffset = findInExecutableCode(source, BOOTSTRAP_CALL);
      entry.bootstrap_offset = bootstrapOffset;
      if (bootstrapOffset === -1) {
        violations.push({
          function: fnName,
          category: "infrastructure",
          issue: "missing_bootstrap_call",
        });
        entry.issues.push("missing_bootstrap_call");
      }
      inventory.push(entry);
      continue;
    }

    // ── Operational function (the critical guard) ─────────────────────
    coverage.operational++;

    const bootstrapOffset = findInExecutableCode(source, BOOTSTRAP_CALL);
    const authorizeOffset = findInExecutableCode(source, AUTHORIZE_CALL);
    const domainAccess = findFirstDomainAccess(source);

    entry.bootstrap_offset = bootstrapOffset;
    entry.authorize_offset = authorizeOffset;
    entry.domain_access_offset = domainAccess.offset;
    entry.domain_access_entity = domainAccess.entity;

    if (bootstrapOffset === -1) {
      violations.push({
        function: fnName,
        category: "operational",
        issue: "missing_bootstrap_call",
      });
      entry.issues.push("missing_bootstrap_call");
    }

    if (authorizeOffset === -1) {
      violations.push({
        function: fnName,
        category: "operational",
        issue: "missing_authorize_call",
      });
      entry.issues.push("missing_authorize_call");
    }

    // Ordering check: bootstrap < authorize < domain_access
    if (bootstrapOffset !== -1 && authorizeOffset !== -1) {
      if (bootstrapOffset >= authorizeOffset) {
        violations.push({
          function: fnName,
          category: "operational",
          issue: "bootstrap_not_before_authorize",
        });
        entry.issues.push("bootstrap_not_before_authorize");
      }
    }

    if (authorizeOffset !== -1 && domainAccess.offset !== -1) {
      if (authorizeOffset >= domainAccess.offset) {
        violations.push({
          function: fnName,
          category: "operational",
          issue: "authorize_not_before_domain_access",
          detail: `authorize at offset ${authorizeOffset}, domain access to ${domainAccess.entity} at offset ${domainAccess.offset}`,
        });
        entry.issues.push("authorize_not_before_domain_access");
      }
    }

    entry.ordering_ok = entry.issues.length === 0;
    inventory.push(entry);
  }

  // ── Check for unclassified functions (unknown) ──────────────────────
  // Any function that is not in an exception set AND doesn't pass
  // operational checks is already caught above. But we also flag
  // functions that might be "private helpers" incorrectly placed in
  // the functions directory.
  for (const fnName of allFunctions) {
    const isInExceptionSet =
      CONTROL_PLANE_FUNCTIONS.has(fnName) ||
      INFRASTRUCTURE_FUNCTIONS.has(fnName) ||
      TEST_HARNESS_FUNCTIONS.has(fnName);
    if (!isInExceptionSet) {
      // It's operational — already checked. No "unknown" possible unless
      // it has no entry.ts, which is skipped above.
    }
  }

  // ── Shared private helpers (inventoried, not auth-gated) ─────────────
  const sharedHelpers = listSharedHelpers();
  coverage.private_helper = sharedHelpers.length;

  // ═══════════════════════════════════════════════════════════════════════════
  // BACKEND AUTHORIZATION SOURCE GUARD (all backend functions)
  // ═══════════════════════════════════════════════════════════════════════════
  // Fail when backend authorization decisions directly read untrusted,
  // browser-settable fields: user.data.permissions, user.permissions,
  // user.data.app_role, browser-supplied role/actor/tenant identity,
  // unverified custom_role_id.
  // Allow only: successionRolePermissions, explicitly approved centralized
  // server-derived helpers, and test fixtures clearly excluded from production.

  const UNTRUSTED_AUTH_PATTERNS = [
    { pattern: "user.data.permissions", issue: "reads_user_data_permissions" },
    { pattern: "user.permissions", issue: "reads_user_permissions" },
    { pattern: "user.data.app_role", issue: "reads_user_data_app_role" },
    { pattern: ".data.app_role", issue: "reads_data_app_role" },
  ];

  // Approved authorization helpers (these are the ONLY allowed sources)
  const APPROVED_AUTH_SOURCES = [
    "successionRolePermissions",
    "resolveUserScope",
    "isUserInScope",
    "authorizeScheduledTask",
    "resolvePlatformOperatorContext",
    "bootstrapSuccessionAuth",
    "authorizeSuccessionAction",
  ];

  // Test fixtures excluded from the auth-source check
  const AUTH_TEST_FIXTURES = new Set([
    "successionPhase0Test",
    "successionPhase1Test",
    "successionPhase1_5Test",
    "successionPrivilegeEscalationTest",
    "debugUserContext",
    "checkMyRole",
    "setMyRole",
  ]);

  function listAllBackendFunctions() {
    if (!existsSync(FUNCTIONS_DIR)) return [];
    return readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  }

  const allBackendFunctions = listAllBackendFunctions();
  const authSourceViolations = [];

  for (const fnName of allBackendFunctions) {
    if (AUTH_TEST_FIXTURES.has(fnName)) continue;

    let source;
    try {
      source = readEntryFile(fnName);
    } catch {
      continue;
    }

    const stripped = stripCommentsAndStrings(source);

    for (const { pattern, issue } of UNTRUSTED_AUTH_PATTERNS) {
      if (stripped.includes(pattern)) {
        // Check if it's in an approved helper context
        const hasApprovedSource = APPROVED_AUTH_SOURCES.some(h => stripped.includes(h));
        // Still flag it — the pattern itself is the violation even if approved helpers exist
        authSourceViolations.push({
          function: fnName,
          category: "auth_source",
          issue,
          pattern,
        });
      }
    }
  }

  violations.push(...authSourceViolations);

  // ═══════════════════════════════════════════════════════════════════════════
  // FRONTEND SERVICE-ROLE GUARD
  // ═══════════════════════════════════════════════════════════════════════════
  // Fail when frontend source contains:
  //   - base44.asServiceRole
  //   - service-role SDK construction
  //   - restricted secret identifiers
  //   - direct privileged User role or CustomRole mutation

  const FRONTEND_FORBIDDEN_PATTERNS = [
    { pattern: "asServiceRole", issue: "frontend_service_role_access" },
    { pattern: "PLATFORM_ADMIN_FULL_ACCESS", issue: "frontend_secret_identifier" },
    { pattern: "INTERNAL_FUNCTION_SECRET", issue: "frontend_secret_identifier" },
    { pattern: "TEAMS_WEBHOOK_SECRET", issue: "frontend_secret_identifier" },
    { pattern: "PUBLIC_REQUEST_TOKEN_SECRET", issue: "frontend_secret_identifier" },
    { pattern: "RESEND_API_KEY", issue: "frontend_secret_identifier" },
    { pattern: "TYPEFORM_WEBHOOK_SECRET", issue: "frontend_secret_identifier" },
  ];

  const SRC_DIR = join(__dirname, "..", "..", "src");
  const frontendViolations = [];

  function scanFrontendDir(dir) {
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        scanFrontendDir(fullPath);
      } else if (entry.isFile() && /\.(jsx|js|tsx|ts)$/.test(entry.name)) {
        const source = readFileSync(fullPath, "utf-8");
        const stripped = stripCommentsAndStrings(source);
        for (const { pattern, issue } of FRONTEND_FORBIDDEN_PATTERNS) {
          if (stripped.includes(pattern)) {
            frontendViolations.push({
              file: fullPath.replace(SRC_DIR + "/", ""),
              category: "frontend",
              issue,
              pattern,
            });
          }
        }
      }
    }
  }

  scanFrontendDir(SRC_DIR);
  violations.push(...frontendViolations);

  // ── Build result ────────────────────────────────────────────────────
  const result = {
    guard_version: "3.0-hardened",
    checked_at: new Date().toISOString(),
    exception_list_reviewed: "2026-09-25",
    passed: violations.length === 0,
    total_functions: allFunctions.length,
    total_backend_functions_scanned: allBackendFunctions.length,
    coverage,
    shared_private_helpers: sharedHelpers,
    auth_source_violations: authSourceViolations,
    frontend_violations: frontendViolations,
    inventory,
    violations,
  };

  // ── Write machine-readable report artifact ───────────────────────────
  if (!existsSync(REPORT_DIR)) {
    mkdirSync(REPORT_DIR, { recursive: true });
  }
  writeFileSync(REPORT_PATH, JSON.stringify(result, null, 2));

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST RUNNER (vitest-compatible + standalone + CI)
// ═══════════════════════════════════════════════════════════════════════════

const result = runGuard();

if (import.meta.vitest) {
  // vitest mode
  test("architecture guard: all operational succession functions call auth gates before domain access", () => {
    expect(result.passed, JSON.stringify(result.violations, null, 2)).toBe(true);
  });
} else {
  // standalone / CI mode
  const reportSummary = {
    passed: result.passed,
    total_functions: result.total_functions,
    coverage: result.coverage,
    violations: result.violations,
    report_path: REPORT_PATH,
  };

  console.log(JSON.stringify(reportSummary, null, 2));

  if (!result.passed) {
    console.error(`\n❌ ARCHITECTURE GUARD FAILED: ${result.violations.length} violation(s)`);
    for (const v of result.violations) {
      console.error(`   ${v.function}: ${v.issue} (category: ${v.category})`);
    }
    console.error(`\nReport: ${REPORT_PATH}`);
    process.exit(1);
  } else {
    console.log(`\n✅ ARCHITECTURE GUARD PASSED`);
    console.log(`   ${result.coverage.operational} operational | ${result.coverage.control_plane} control-plane | ${result.coverage.infrastructure} infrastructure | ${result.coverage.test_harness} test harness | ${result.coverage.private_helper} private helpers`);
    console.log(`   Total: ${result.total_functions} functions checked`);
    console.log(`   Report: ${REPORT_PATH}`);
  }
}

export { runGuard };