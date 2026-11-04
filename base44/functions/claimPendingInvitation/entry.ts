import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * POST /claimPendingInvitation
 *
 * Applies the role and organisation an administrator chose when they invited
 * this person, the first time the invited person signs in.
 *
 * The invitation is the authority, not the caller: we look it up by the caller's
 * own verified email (from the session, never from the request body) and write
 * the values it carries with the service role. Nothing the caller sends is
 * trusted, so a person can no longer grant themselves a role or a client.
 *
 * Both membership fields are written in one update and `data` is merged rather
 * than replaced — it also carries role, permissions and portfolio fields, and
 * overwriting it would take those with it.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    const me = await base44.auth
      .me()
      .catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // The invitation is matched on the session's email, which the caller cannot set.
    const invitations = await base44.asServiceRole.entities.PendingInvitation.filter({
      email: me.email,
      status: 'pending',
    });
    const invitation = Array.isArray(invitations) ? invitations[0] : invitations?.items?.[0];

    if (!invitation) {
      return Response.json({ claimed: false, reason: 'no_pending_invitation', email: me.email });
    }

    // A client named on the invitation must still exist before anyone is put in it.
    let clientId = invitation.client_id || null;
    if (clientId) {
      const found = await base44.asServiceRole.entities.Client.filter({ id: clientId });
      const client = Array.isArray(found) ? found[0] : found?.items?.[0];
      if (!client) {
        console.log(`Invited client ${clientId} no longer exists; applying the role only.`);
        clientId = null;
      }
    }

    const foundUser = await base44.asServiceRole.entities.User.filter({ id: me.id });
    const record = Array.isArray(foundUser) ? foundUser[0] : foundUser?.items?.[0];
    if (!record) return Response.json({ error: 'User record not found' }, { status: 404 });

    const data = { ...(record.data || {}) };
    if (invitation.app_role) data.app_role = invitation.app_role;
    if (clientId) data.client_id = clientId;

    await base44.asServiceRole.entities.User.update(me.id, {
      ...(clientId ? { client_id: clientId } : {}),
      data,
    });

    await base44.asServiceRole.entities.PendingInvitation.update(invitation.id, {
      status: 'claimed',
      claimed_at: new Date().toISOString(),
    });

    return Response.json({
      claimed: true,
      email: me.email,
      app_role: data.app_role || null,
      client_id: clientId,
    });
  } catch (error) {
    console.error('claimPendingInvitation failed:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}