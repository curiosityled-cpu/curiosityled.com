/**
 * Shared tenant-scoping helpers for user lifecycle and analytics functions.
 *
 * These helpers enforce that tenant-level admins (Admin Level 2, Super
 * Administrator, Partner Business Administrator) can only act on users
 * within their own tenant/partner scope. Only Platform Admin may act
 * cross-tenant.
 *
 * Usage pattern (in a Deno backend function):
 *
 *   const scope = resolveUserScope(currentUser);
 *   // ... load allUsers ...
 *   const inScope = filterUsersByScope(allUsers, scope);
 *   // or for a single target:
 *   if (!isUserInScope(targetUser, scope)) return 403;
 */

export interface UserScope {
  role: string;
  client_id: string | null;
  partner_id: string | null;
  isPlatformAdmin: boolean;
  partnerClientIds?: string[];
}

/**
 * Resolve the caller's tenant scope from their authenticated session.
 * Returns a scope object used by the filter/check helpers below.
 */
export function resolveUserScope(user: {
  app_role?: string;
  client_id?: string | null;
  partner_id?: string | null;
}): UserScope {
  const role = user.app_role || '';
  return {
    role,
    client_id: user.client_id || null,
    partner_id: user.partner_id || null,
    isPlatformAdmin: role === 'Platform Admin',
  };
}

/**
 * Populate partnerClientIds on a scope (call after fetching the Client list
 * for Partner Business Administrator). Mutates and returns the scope.
 */
export function attachPartnerClientIds(
  scope: UserScope,
  clients: { id: string; partner_id?: string }[],
): UserScope {
  if (scope.role === 'Partner Business Administrator' && scope.partner_id) {
    scope.partnerClientIds = clients
      .filter((c) => c.partner_id === scope.partner_id)
      .map((c) => c.id);
  }
  return scope;
}

/**
 * Check whether a target user record falls within the caller's scope.
 * Returns true if the caller may act on / read the target user.
 */
export function isUserInScope(
  target: { client_id?: string | null },
  scope: UserScope,
): boolean {
  if (scope.isPlatformAdmin) return true;
  if (scope.role === 'Partner Business Administrator') {
    const ids = scope.partnerClientIds || [];
    return ids.includes(target.client_id || '');
  }
  // Admin Level 2, Super Administrator, and any other tenant-scoped role
  if (scope.client_id) {
    return target.client_id === scope.client_id;
  }
  // No client_id on the caller and not platform/partner → deny
  return false;
}

/**
 * Filter an array of user records down to those in the caller's scope.
 */
export function filterUsersByScope(
  users: { client_id?: string | null }[],
  scope: UserScope,
): typeof users {
  if (scope.isPlatformAdmin) return users;
  return users.filter((u) => isUserInScope(u, scope));
}

/**
 * Role-rank ordering for privilege-escalation checks.
 * A caller may only assign roles at or below their own rank.
 * Returns a numeric tier (lower = less privileged).
 */
export function roleTier(role: string): number {
  const tiers: Record<string, number> = {
    'User Level 1': 1,
    'User Level 2': 2,
    'User Level 3': 2,
    Analyst: 2,
    'Leadership Coach': 2,
    Consultant: 2,
    'Admin Level 1': 3,
    'Admin Level 2': 4,
    'Super Administrator': 5,
    'Partner Business Administrator': 5,
    'Platform Admin': 6,
  };
  return tiers[role] ?? 0;
}

/**
 * Returns true if the caller (by role) may assign the target role.
 * Rule: you may never assign a role at or above your own tier, and
 * only Platform Admin may assign Platform Admin.
 */
export function canAssignRole(callerRole: string, targetRole: string): boolean {
  if (targetRole === 'Platform Admin') return callerRole === 'Platform Admin';
  return roleTier(targetRole) < roleTier(callerRole);
}