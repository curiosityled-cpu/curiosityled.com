/**
 * Package entitlements — which modules a tenant's commercial package includes.
 *
 * The public offer sells coverage, not seats: Essentials runs the manager loop,
 * Growth adds Signals and the full Performance Manager (reviews, calibration,
 * 360), Organization adds the Talent Manager (competency library, succession,
 * career paths). Every one of those claims needs a switch the server actually
 * respects, or the page is promising a boundary the product does not have.
 *
 * Two rules govern this module:
 *
 *   1. A tenant whose package is `unknown` (or unset) is never refused. Legacy
 *      tenants were not confirmed into a package, so guessing one would lock a
 *      paying customer out of a screen they use today. The same warn-mode logic
 *      that governs capacity governs entitlement: `enforced: false` means the
 *      gate records the package and lets the request through.
 *
 *   2. Downgrading never destroys work. This gate is consulted where work is
 *      *created* (a new signal, a review cycle, activating succession) — never
 *      where existing work is read, submitted against, or exported. A tenant
 *      that moves down keeps every cycle it already ran.
 */

export type PackageModule = "signals" | "reviews" | "talent_manager";

export type PackageName =
  | "essentials"
  | "growth"
  | "organization"
  | "internal"
  | "unknown";

const PACKAGE_RANK: Record<string, number> = {
  unknown: 0,
  essentials: 1,
  growth: 2,
  organization: 3,
  // Internal tenants run the whole platform; they are staff, not customers.
  internal: 3,
};

/** The lowest package that includes each module. */
export const MODULE_MINIMUM: Record<PackageModule, PackageName> = {
  signals: "growth",
  reviews: "growth",
  talent_manager: "organization",
};

export const MODULE_LABEL: Record<PackageModule, string> = {
  signals: "Signals",
  reviews: "Performance reviews and 360 feedback",
  talent_manager: "Talent Manager",
};

const PACKAGE_LABEL: Record<string, string> = {
  essentials: "Essentials",
  growth: "Growth",
  organization: "Organization",
  internal: "Internal",
  unknown: "Unconfirmed",
};

export function normalizePackage(packageName: any): PackageName {
  const raw = String(packageName || "").toLowerCase();
  return (PACKAGE_RANK[raw] !== undefined ? raw : "unknown") as PackageName;
}

/** Whether the package is a confirmed commercial boundary we can enforce. */
export function isEnforceablePackage(packageName: any): boolean {
  const pkg = normalizePackage(packageName);
  return pkg !== "unknown";
}

/** Which modules a package includes, before any tenant-specific override. */
export function entitlementsFor(packageName: any) {
  const pkg = normalizePackage(packageName);
  const rank = PACKAGE_RANK[pkg];
  const included = (module: PackageModule) =>
    rank >= PACKAGE_RANK[MODULE_MINIMUM[module]];

  return {
    package: pkg,
    package_label: PACKAGE_LABEL[pkg] || pkg,
    enforced: pkg !== "unknown",
    signals: included("signals"),
    reviews: included("reviews"),
    talent_manager: included("talent_manager"),
  };
}

const asRows = (value: any) => (Array.isArray(value) ? value : value?.items || []);

/** Read one tenant's package. Missing client or field resolves to `unknown`. */
export async function readTenantPackage(
  base44: any,
  clientId: string | null
): Promise<PackageName> {
  if (!clientId) return "unknown";
  const rows = await base44.asServiceRole.entities.Client.filter({ id: clientId })
    .catch(() => []);
  const client = asRows(rows)[0];
  return normalizePackage(client?.package);
}

/**
 * The decision for one module on one tenant.
 *
 * `allowed: true, enforced: false` means the package is not confirmed, so the
 * request proceeds and the absence of a boundary stays visible in the result
 * rather than becoming a refusal.
 */
export async function tenantModuleAccess(
  base44: any,
  clientId: string | null,
  module: PackageModule
) {
  const pkg = await readTenantPackage(base44, clientId);
  const entitlements = entitlementsFor(pkg);
  const included = Boolean(entitlements[module]);
  const enforced = entitlements.enforced;

  return {
    module,
    module_label: MODULE_LABEL[module],
    package: pkg,
    package_label: entitlements.package_label,
    required: MODULE_MINIMUM[module],
    required_label: PACKAGE_LABEL[MODULE_MINIMUM[module]],
    enforced,
    included,
    allowed: !enforced || included,
  };
}

/** The refusal a function returns when a module sits above the tenant's package. */
export function packageRequiredResponse(access: any) {
  return Response.json(
    {
      success: false,
      error: "PACKAGE_REQUIRED",
      module: access.module,
      package: access.package,
      required: access.required,
      message: `${access.module_label} is part of the ${access.required_label} package. Your organization is on ${access.package_label}. Talk to us about moving up.`,
    },
    { status: 403 }
  );
}