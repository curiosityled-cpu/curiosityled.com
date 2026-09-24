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