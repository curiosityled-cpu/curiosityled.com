/**
 * Sending an invitation.
 *
 * The platform's invitation only carries a built-in role ("user" or "admin"),
 * so it cannot convey this app's own roles (Program Admin, HR Admin, Team
 * Leader, …). Every invitation therefore does two things:
 *
 *   1. records the intended app role in PendingInvitation, keyed by email, and
 *   2. sends the platform invitation with the built-in role that belongs to it.
 *
 * The pending record is applied to the person's user record the first time they
 * sign in, which is the first moment their user record exists.
 */

const BUILT_IN_ADMIN_ROLES = new Set([
  'Admin Level 1',
  'Admin Level 2',
  'Super Administrator',
  'Partner Business Administrator',
  'Platform Admin',
]);

/** The built-in platform role that belongs to one of this app's roles. */
export function toPlatformRole(appRole?: string | null): 'user' | 'admin' {
  return BUILT_IN_ADMIN_ROLES.has(appRole || '') ? 'admin' : 'user';
}

interface InviteArgs {
  email: string;
  app_role: string;
  client_id?: string;
  invited_by_email?: string;
}

/**
 * Record the intended role, then send the platform invitation. If the
 * invitation cannot be sent the record is removed again, so a role is never
 * waiting for someone who was not actually invited.
 */
export async function sendInvite(base44: any, { email, app_role, client_id, invited_by_email }: InviteArgs) {
  const pending = await base44.asServiceRole.entities.PendingInvitation.create({
    email,
    app_role,
    client_id: client_id || '',
    invited_by_email: invited_by_email || '',
    status: 'pending',
    sent_at: new Date().toISOString(),
  });

  const preferredRole = toPlatformRole(app_role);
  try {
    await base44.users.inviteUser(email, preferredRole);
  } catch (error) {
    // A client administrator (Super Administrator) is an ordinary platform user,
    // so the platform only lets them send an invitation as "user". The app role
    // is not lost: the pending invitation carries it and it is applied at the
    // person's first sign-in, so inviting as "user" still lands the right role.
    if (preferredRole === 'admin') {
      try {
        await base44.users.inviteUser(email, 'user');
        return pending;
      } catch {
        // Fall through to the original error.
      }
    }
    try {
      await base44.asServiceRole.entities.PendingInvitation.delete(pending.id);
    } catch {
      // Nothing further to do — the invitation error is what the caller needs.
    }
    throw error;
  }

  return pending;
}