import { base44 } from "@/api/base44Client";

/**
 * Applies the role an administrator chose when they invited this person.
 *
 * A platform invitation can only carry a built-in role, so the app's own role
 * is stored in PendingInvitation and applied here, the first time the invited
 * person signs in and their user record exists.
 */
export async function claimPendingInvitation(user) {
  if (!user?.email || user.app_role) return user;

  try {
    const invitations = await base44.entities.PendingInvitation.filter({
      email: user.email,
      status: 'pending',
    });
    if (invitations.length === 0) return user;

    const invitation = invitations[0];

    await base44.auth.updateMe({
      app_role: invitation.app_role,
      ...(invitation.client_id ? { client_id: invitation.client_id } : {}),
    });

    await base44.entities.PendingInvitation.update(invitation.id, {
      status: 'claimed',
      claimed_at: new Date().toISOString(),
    });

    return await base44.auth.me();
  } catch (error) {
    console.error('Could not apply the invited role:', error);
    return user;
  }
}