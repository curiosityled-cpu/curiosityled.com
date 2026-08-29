import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const body = await req.json();
    const { requester_email, client_id, request_type } = body;

    if (!requester_email || !client_id) {
      return Response.json({ error: 'requester_email and client_id are required' }, { status: 400 });
    }

    // Only coaching_support requests are gated by the allowlist
    if (request_type && request_type !== 'coaching_support') {
      return Response.json({ allowed: true, reason: 'not_coaching_support' });
    }

    // Fetch the client to read allowlist settings
    const clients = await base44.asServiceRole.entities.Client.filter({ id: client_id });
    if (clients.length === 0) {
      return Response.json({ allowed: false, reason: 'Client organization not found' }, { status: 403 });
    }

    const client = clients[0];
    const settings = client.settings || {};
    const allowlist = settings.coaching_request_allowlist_enabled === true;

    // If allowlist is not enabled, anyone can submit
    if (!allowlist) {
      return Response.json({ allowed: true, reason: 'allowlist_disabled' });
    }

    const allowedEmails = settings.coaching_request_allowed_emails || [];
    const allowedRoles = settings.coaching_request_allowed_roles || [];
    const allowedTitles = settings.coaching_request_allowed_titles || [];

    // Check explicit email allowlist first
    if (allowedEmails.length > 0) {
      const emailMatch = allowedEmails.some(
        e => e.toLowerCase().trim() === requester_email.toLowerCase().trim()
      );
      if (emailMatch) {
        return Response.json({ allowed: true, reason: 'email_allowed' });
      }
    }

    // Fetch the user to check role and title
    const users = await base44.asServiceRole.entities.User.filter({ email: requester_email });
    const requester = users.length > 0 ? users[0] : null;

    if (!requester) {
      // Not a registered user — only the email allowlist could have let them in
      return Response.json({
        allowed: false,
        reason: 'You are not authorized to submit coaching requests for this organization.'
      }, { status: 403 });
    }

    // Check role allowlist
    if (allowedRoles.length > 0) {
      const roleMatch = allowedRoles.some(
        r => r.toLowerCase().trim() === (requester.app_role || '').toLowerCase().trim()
      );
      if (roleMatch) {
        return Response.json({ allowed: true, reason: 'role_allowed' });
      }
    }

    // Check title allowlist
    if (allowedTitles.length > 0) {
      const titleMatch = allowedTitles.some(
        t => t.toLowerCase().trim() === (requester.current_role || '').toLowerCase().trim()
      );
      if (titleMatch) {
        return Response.json({ allowed: true, reason: 'title_allowed' });
      }
    }

    // None of the allowlist criteria matched
    return Response.json({
      allowed: false,
      reason: 'You are not authorized to submit coaching requests for this organization. Contact your Program Administrator if you believe this is an error.'
    }, { status: 403 });

  } catch (error) {
    console.error('validateCoachingRequestAccess error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}