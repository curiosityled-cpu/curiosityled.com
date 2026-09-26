/**
 * Shared helper for validating that target emails belong to the caller's
 * organization. Used by agent-tool executors to prevent cross-tenant
 * notification/assignment spoofing.
 *
 * Returns a Set of emails that are within the caller's tenant scope:
 *  - Platform Admin: all users
 *  - everyone else: users whose client_id matches the caller's client_id
 */
export async function getOrgEmails(
  base44: any,
  user: { app_role?: string; client_id?: string | null; email?: string },
): Promise<Set<string>> {
  const allUsers = await base44.asServiceRole.entities.User.list();
  return new Set(
    allUsers
      .filter(
        (u: any) =>
          user.app_role === "Platform Admin" || u.client_id === user.client_id,
      )
      .map((u: any) => u.email),
  );
}

/**
 * Derive the caller's direct reports server-side from the authoritative
 * User entity's manager_email field. This MUST be used instead of the
 * self-editable subordinate_emails field for any authorization decision
 * (goal cascading, learning assignment, email recipient validation, etc.).
 *
 * Returns a Set of lowercased emails of users whose manager_email matches
 * the caller's email AND who belong to the same tenant.
 */
export async function getDirectReportEmails(
  base44: any,
  user: { email?: string; client_id?: string | null; app_role?: string },
): Promise<Set<string>> {
  if (!user.email) return new Set();
  const directReports = await base44.asServiceRole.entities.User.filter({
    manager_email: user.email,
  });
  return new Set(
    directReports
      .filter(
        (u: any) =>
          user.app_role === "Platform Admin" ||
          !user.client_id ||
          u.client_id === user.client_id,
      )
      .map((u: any) => (u.email || "").toLowerCase()),
  );
}