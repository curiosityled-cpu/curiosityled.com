/**
 * rlsEvaluator — decides whether an entity access rule admits a principal to a
 * record.
 *
 * Why this exists: a service-role query bypasses every rule, so a proof written
 * with the service role tests query construction, not the tenant boundary. This
 * module evaluates the rule itself against a synthetic principal and a
 * synthetic record, which is the only way to test the boundary that actually
 * applies to a signed-in browser.
 *
 * Supported rule shapes (the ones this app's schemas use):
 *   { "field": "value" }                 field equality
 *   { "field": { "$in": [...] } }        membership; a template may resolve to a list
 *   { "field": { "$nin": [...] } }
 *   { "field": { "$ne": "value" } }
 *   { "field": { "$elemMatch": {...} } } array element match
 *   { "$or": [rule, ...] } / { "$and": [rule, ...] }
 *   { "user_condition": { "role": "..." } }
 *   "{{user.email}}" / "{{user.id}}" / "{{user.data.client_id}}" templates
 *   null expected value → matches a record where the field is unset
 */

export type Principal = {
  id: string;
  email: string;
  role?: string;
  app_role?: string;
  data?: Record<string, any>;
};

export type Rule = any;

const WHOLE_TEMPLATE = /^\{\{\s*([A-Za-z0-9_.]+)\s*\}\}$/;
const ANY_TEMPLATE = /\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g;

export function readPath(source: any, path: string): any {
  return String(path)
    .split(".")
    .reduce((value, key) => (value === null || value === undefined ? undefined : value[key]), source);
}

/**
 * Rule templates are written against the user object itself — `{{user.email}}`,
 * `{{user.data.client_id}}` — so the leading `user.` names the principal, not a
 * property on it. Resolving it literally returns undefined for every template,
 * which makes each template comparison match an unset record field. That single
 * mistake silently turns a proof into "everything is open", so the prefix is
 * stripped here and nowhere else.
 */
export function templatePath(path: string): string {
  return String(path).replace(/^user\./, "");
}

export function resolveTemplates(value: any, principal: Principal): any {
  if (typeof value !== "string") return value;
  const whole = value.match(WHOLE_TEMPLATE);
  if (whole) return readPath(principal, templatePath(whole[1]));
  return value.replace(ANY_TEMPLATE, (_match, path) => {
    const resolved = readPath(principal, templatePath(path));
    return resolved === undefined || resolved === null ? "" : String(resolved);
  });
}

function fieldValue(record: any, key: string): any {
  if (key === "data" || key.startsWith("data.")) {
    return readPath(record, key.replace(/^data\.?/, ""));
  }
  return record?.[key];
}

function looseEquals(actual: any, expected: any): boolean {
  if (expected === null || expected === undefined) {
    return actual === null || actual === undefined;
  }
  if (actual === null || actual === undefined) return false;
  if (typeof expected === "boolean" || typeof actual === "boolean") {
    return Boolean(actual) === Boolean(expected);
  }
  return String(actual) === String(expected);
}

function matchValue(actual: any, expected: any, principal: Principal): boolean {
  if (expected === null || expected === undefined) return looseEquals(actual, expected);
  if (typeof expected !== "object" || Array.isArray(expected)) {
    if (Array.isArray(expected)) {
      return expected.some((entry) => looseEquals(actual, resolveTemplates(entry, principal)));
    }
    return looseEquals(actual, resolveTemplates(expected, principal));
  }

  const target = resolveTemplates(actual, principal);

  if ("$elemMatch" in expected) {
    if (!Array.isArray(actual)) return false;
    return actual.some((entry) =>
      Object.entries(expected.$elemMatch).every(([key, wanted]) =>
        matchValue(entry?.[key], wanted, principal)
      )
    );
  }
  if ("$exists" in expected) {
    const present = actual !== null && actual !== undefined;
    return Boolean(expected.$exists) === present;
  }

  let value = expected.$in ?? expected.$nin;
  if (value !== undefined) {
    if (typeof value === "string" || typeof value === "object") {
      value = resolveTemplates(value, principal);
    }
    const list = Array.isArray(value) ? value : [value];
    const hit = list.some((entry) => looseEquals(target, resolveTemplates(entry, principal)));
    return "$nin" in expected ? !hit : hit;
  }
  if ("$ne" in expected) {
    return !looseEquals(target, resolveTemplates(expected.$ne, principal));
  }

  // Plain nested object: compare field-by-field (e.g. an inline sub-document).
  return Object.entries(expected).every(([key, wanted]) =>
    matchValue(actual?.[key], wanted, principal)
  );
}

function matchesPrincipal(condition: any, principal: Principal): boolean {
  if (condition === null || condition === undefined) return true;
  return Object.entries(condition).every(([key, wanted]) => {
    if (key === "role") {
      const roles = Array.isArray(wanted) ? wanted : [wanted];
      const held = [principal.app_role, principal.role].filter(Boolean);
      return roles.some((role) => held.includes(resolveTemplates(role, principal)));
    }
    if (key === "email") {
      return looseEquals(principal.email, resolveTemplates(wanted, principal));
    }
    if (key === "id") {
      return looseEquals(principal.id, resolveTemplates(wanted, principal));
    }
    return matchValue(readPath(principal, templatePath(key)), wanted, principal);
  });
}

/**
 * Returns true when the rule admits the principal to the record, false when it
 * rejects, and null when the rule is absent (the caller must then fall back the
 * way the platform does: update/delete → create → read).
 */
export function evaluateRule(rule: Rule, principal: Principal, record: any): boolean | null {
  if (rule === null || rule === undefined) return null;
  if (typeof rule !== "object" || Array.isArray(rule)) return false;

  let hasClause = false;
  for (const [key, expected] of Object.entries(rule)) {
    if (key === "$or") {
      hasClause = true;
      const any = Array.isArray(expected) ? expected : [expected];
      if (!any.some((branch) => evaluateRule(branch, principal, record) === true)) return false;
      continue;
    }
    if (key === "$and") {
      hasClause = true;
      const all = Array.isArray(expected) ? expected : [expected];
      if (!all.every((branch) => evaluateRule(branch, principal, record) === true)) return false;
      continue;
    }
    if (key === "user_condition") {
      hasClause = true;
      if (!matchesPrincipal(expected, principal)) return false;
      continue;
    }
    hasClause = true;
    if (!matchValue(fieldValue(record, key), expected, principal)) return false;
  }
  return hasClause;
}

/** Platform fallback order: the op's own rule, then create, then read. */
export function effectiveRule(rls: any, op: "read" | "create" | "update" | "delete"): boolean | null {
  if (!rls) return null;
  const chain: Array<"read" | "create" | "update" | "delete"> =
    op === "update" || op === "delete" ? [op, "create", "read"] : [op];
  for (const step of chain) {
    const result = rls[step];
    if (result !== null && result !== undefined) return result;
  }
  return null;
}

export type RuleShape = "tenant_scoped" | "identity_bound" | "platform_only" | "open";

const PERSON_KEYS = [
  "user_email",
  "email",
  "created_by",
  "created_by_id",
  "employee_email",
  "manager_email",
  "target_email",
  "base44_user_id",
  "requester_email",
  "owner_email",
  "tester_email",
  "accessed_by",
  "subject_email",
];

function flatten(source: any, into: Set<string> = new Set()): Set<string> {
  if (source === null || source === undefined) return into;
  if (Array.isArray(source)) {
    source.forEach((entry) => flatten(entry, into));
    return into;
  }
  if (typeof source === "object") {
    Object.entries(source).forEach(([key, value]) => {
      into.add(key);
      flatten(value, into);
    });
    return into;
  }
  into.add(String(source));
  return into;
}

/**
 * Classifies one operation's rule. This is the label the inventory is built
 * from, so it is derived from the rule text rather than asserted in prose.
 */
export function classifyRule(rule: Rule): RuleShape {
  if (rule === null || rule === undefined) return "open";
  const text = JSON.stringify(rule);
  if (text.includes("client_id")) return "tenant_scoped";
  if (PERSON_KEYS.some((key) => text.includes(key))) return "identity_bound";

  const keys = flatten(rule);
  const roleOnly = [...keys].every(
    (key) =>
      !key.startsWith("$") &&
      (key === "role" ||
        key === "user_condition" ||
        /^[A-Z][A-Za-z ]+$/.test(key) ||
        key === "true")
  );
  if (roleOnly) return "platform_only";
  return "open";
}