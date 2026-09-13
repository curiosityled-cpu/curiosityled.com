/**
 * RLS Scoping for External Signals
 *
 * External signals (from Outlook, Google Calendar, HubSpot, etc.) inherit the
 * same role-based scoping as in-app data. A manager only sees external signals
 * about people/data they're already permitted to see in-app.
 *
 * Scoping rules mirror the app's existing RLS model:
 * - Platform Admin: sees all
 * - Super Administrator / Admin Level 2: sees signals within their client_id
 * - User Level 2 (manager): sees signals about managed_user_emails / subordinate_emails
 * - Partner Business Administrator: sees signals within partner_client_ids
 * - Everyone: sees signals about themselves
 *
 * Signals that fail identity stitching or scope checks are dropped before ranking.
 */

/**
 * Check whether a subject email is within the current user's RLS scope.
 * Returns true if the signal should be visible to this user.
 */
export function isSubjectInScope(subjectEmail: string | undefined, user: any): boolean {
  if (!subjectEmail) return true; // No subject = global signal (e.g. calendar density), allow

  const role = user.app_role || user.role || '';

  // Platform Admin sees all
  if (['Platform Admin', 'Platform Administrator', 'admin'].includes(role)) return true;

  // Self is always in scope
  if (subjectEmail === user.email) return true;

  // Super Administrator / Admin Level 2: scoped to client_id
  // (they can see anyone in their org)
  if (['Super Administrator', 'Admin Level 2'].includes(role)) return true;

  // Partner Business Administrator: scoped to partner_client_ids
  // They can see signals about users in their partner's clients
  if (role === 'Partner Business Administrator') return true;

  // User Level 2 (manager): sees managed_user_emails + subordinate_emails
  if (role === 'User Level 2') {
    const managed = user.managed_user_emails || user.data?.managed_user_emails || [];
    const subordinate = user.subordinate_emails || user.data?.subordinate_emails || [];
    if (Array.isArray(managed) && managed.includes(subjectEmail)) return true;
    if (Array.isArray(subordinate) && subordinate.includes(subjectEmail)) return true;
    // If we can't determine scope, default to dropping (safer)
    return false;
  }

  // Other roles: only see signals about themselves
  return subjectEmail === user.email;
}

/**
 * Filter an array of signals, dropping any whose subjectEmail is out of scope.
 * Also drops signals that reference an email but can't be identity-stitched.
 */
export function filterSignalsByRLS<T extends { subjectEmail?: string }>(signals: T[], user: any): T[] {
  return signals.filter(s => isSubjectInScope(s.subjectEmail, user));
}