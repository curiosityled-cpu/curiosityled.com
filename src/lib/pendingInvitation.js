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
    // The invitation is applied on the server, against the session's own email —
    // the role and client never come from anything this browser sends.
    const response = await base44.functions.invoke('claimPendingInvitation', {});
    if (!response?.data?.claimed) return user;

    return await base44.auth.me();
  } catch (error) {
    console.error('Could not apply the invited role:', error);
    return user;
  }
}