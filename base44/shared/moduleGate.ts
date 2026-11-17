/**
 * Package boundaries: which product modules a tenant's package includes, and
 * how that boundary is applied.
 *
 * This module is the single source of truth. The pricing page, any menu that
 * hides a module, any function that refuses one, and the rollout console that
 * reports what a tenant would lose all read the same rule from here.
 *
 * Two deliberate properties:
 *
 *  1. A tenant whose package is `unknown` or `internal` gets everything. Every
 *     live tenant is on `unknown` today, so the gate must not remove a feature
 *     from a working customer the moment it ships.
 *  2. The gate is a warning until a tenant is put in `block` mode. In `warn`
 *     mode the refusal is recorded and the call is allowed through, so the
 *     overage list is real evidence collected before anything breaks.
 */

/** Packages that grant every module, by design rather than by omission. */
export const PERMISSIVE_PACKAGES = ["unknown", "internal"];

/**
 * The modules the bundles differ by. `min_package` is the lowest package that
 * includes the module; everything above it includes it too.
 */
export const MODULE_CATALOG = [
  {
    key: "signals",
    label: "Signals",
    min_package: "growth",
    claim: "Assessments, quizzes, surveys, pulses and feedback built in Development Manager.",
  },
  {
    key: "reviews",
    label: "Reviews, calibration & 360",
    min_package: "growth",
    claim: "Review cycles, calibration and multi-rater 360 feedback in Performance Manager.",
  },
  {
    key: "cross_team_analytics",
    label: "Cross-team analytics",
    min_package: "growth",
    claim: "Insight across teams and the whole organization, not just the manager's own team.",
  },
  {
    key: "extended_history",
    label: "Multi-period history",
    min_package: "growth",
    claim: "Trends beyond the current cycle.",
  },
  {
    key: "custom_automations",
    label: "Configurable automations",
    min_package: "growth",
    claim: "Custom automations. Standard reminders stay available to every package.",
  },
  {
    key: "talent",
    label: "Talent Manager",
    min_package: "organization",
    claim: "Competency library, succession and career paths.",
  },
];

const ALL_MODULE_KEYS = MODULE_CATALOG.map((m) => m.key);

const GROWTH_MODULE_KEYS = MODULE_CATALOG.filter(
  (m) => m.min_package === "growth"
).map((m) => m.key);

/** What each package includes. Keys are the values of Client.package. */
export const PACKAGE_MODULES = {
  essentials: [],
  growth: GROWTH_MODULE_KEYS,
  organization: ALL_MODULE_KEYS,
  internal: ALL_MODULE_KEYS,
  unknown: ALL_MODULE_KEYS,
};

/** The rule, in the words the console and the sales conversation both use. */
export const MODULE_GATE_RULE =
  "Essentials covers the manager loop — check-ins, goals/KPIs/OKRs, 1:1s, Atreus and the team view — without Signals, reviews and 360, cross-team analytics, multi-period history, configurable automations or Talent Manager. Growth adds Signals, reviews/calibration/360, cross-team analytics, multi-period history and configurable automations. Organization adds Talent Manager. A tenant on 'unknown' or 'internal' gets everything: package boundaries are only applied to a tenant that has a package and has been moved to 'block' mode.";

export function normalizePackage(packageKey) {
  const key = String(packageKey || "unknown").toLowerCase().trim();
  return Object.prototype.hasOwnProperty.call(PACKAGE_MODULES, key) ? key : "unknown";
}

/** Whether this package is permissive by design rather than by a real package. */
export function isPermissivePackage(packageKey) {
  return PERMISSIVE_PACKAGES.includes(normalizePackage(packageKey));
}

/** Modules a package includes. */
export function packageModules(packageKey) {
  return [...(PACKAGE_MODULES[normalizePackage(packageKey)] || [])];
}

/** Whether a package includes one module. */
export function moduleAllowed(packageKey, moduleKey) {
  return packageModules(packageKey).includes(moduleKey);
}

/** How this tenant's gate behaves: records (warn) or refuses (block). */
export function gateMode(client) {
  return client?.enforcement_mode === "block" ? "block" : "warn";
}

export function moduleLabel(moduleKey) {
  return MODULE_CATALOG.find((m) => m.key === moduleKey)?.label || moduleKey;
}

/**
 * Pure evaluation of one module for one tenant — no database access, so a
 * function, a screen and a test all reach the same answer.
 *
 * `allowed` is what the caller should do: true while the tenant is permissive
 * or in warn mode, false only when the package excludes the module AND the
 * tenant is in block mode.
 */
export function evaluateModule(client, moduleKey) {
  const pkg = normalizePackage(client?.package);
  const mode = gateMode(client);
  const included = moduleAllowed(pkg, moduleKey);
  const permissive = isPermissivePackage(pkg);

  let outcome = "included";
  if (!included) {
    if (permissive) outcome = "permissive";
    else if (mode === "block") outcome = "blocked";
    else outcome = "warned";
  }

  const entry = MODULE_CATALOG.find((m) => m.key === moduleKey);

  return {
    module: moduleKey,
    label: moduleLabel(moduleKey),
    claim: entry?.claim || null,
    min_package: entry?.min_package || null,
    package: pkg,
    enforcement_mode: mode,
    included_in_package: included,
    permissive_package: permissive,
    outcome,
    allowed: outcome === "included" || outcome === "permissive" || outcome === "warned",
  };
}

/** Every module's position for one tenant. */
export function evaluateTenantModules(client) {
  return MODULE_CATALOG.map((m) => evaluateModule(client, m.key));
}

/** The sentence a refused caller sees, and the same sentence the log records. */
export function moduleGateMessage(evaluation, packageLabel) {
  if (evaluation.allowed) return null;
  const pkg = packageLabel || evaluation.package;
  return `${evaluation.label} is not included in the ${pkg} package. Upgrade the package on this account to use it.`;
}

/**
 * The one call a server function makes. Returns null when the caller may
 * proceed, or a Response to return when the module is blocked.
 *
 * It fails open: an unknown tenant, a missing client record or a failed log
 * write never stops a live manager's work. In warn mode the attempt is recorded
 * and the call is allowed.
 */
export async function tenantModuleState(base44, clientId, moduleKey) {
  if (!clientId) return null;

  const rows = await base44.asServiceRole.entities.Client.filter({ id: clientId });
  const client = (Array.isArray(rows) ? rows : rows?.items || [])[0];
  if (!client) return null;

  return evaluateModule(client, moduleKey);
}

/**
 * Records one attempt on a module the tenant's package leaves out, and returns
 * the sentence a refusal would show. Silent when the module is included, so the
 * log only ever holds real boundaries — and it never throws: a missing log row
 * must not take down the request it was recording.
 */
export async function recordModuleAttempt(base44, clientId, evaluation, context = {}) {
  if (!clientId || !evaluation || evaluation.included_in_package) return null;

  const message =
    moduleGateMessage(evaluation) ||
    `${evaluation.label} is not included in this package.`;

  try {
    await base44.asServiceRole.entities.ModuleGateLog.create({
      client_id: clientId,
      module: evaluation.module,
      module_label: evaluation.label,
      package: evaluation.package,
      enforcement_mode: evaluation.enforcement_mode,
      outcome: evaluation.outcome === "blocked" ? "blocked" : "warned",
      source: context.source || "unknown",
      actor_email: context.actorEmail || null,
      message,
    });
  } catch (_error) {
    // Logging is evidence, never a dependency of the request.
  }

  return message;
}

export async function enforceModule(base44, clientId, moduleKey, context = {}) {
  const evaluation = await tenantModuleState(base44, clientId, moduleKey);
  if (!evaluation || evaluation.included_in_package) return null;

  const message = await recordModuleAttempt(base44, clientId, evaluation, context);

  if (evaluation.outcome === "blocked") {
    return Response.json(
      { error: message, module: moduleKey, package: evaluation.package },
      { status: 403 }
    );
  }
  return null;
}

export { ALL_MODULE_KEYS, GROWTH_MODULE_KEYS };