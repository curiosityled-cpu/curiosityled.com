import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { canAssignRole } from '../../shared/userScope.ts';
import { sendInvite } from '../../shared/userInvites.ts';

/**
 * Invites a person into the app with one of the app's own roles.
 *
 * The platform's invitation can only carry a built-in role, so the requested
 * app role is recorded alongside the invitation and applied the first time the
 * person signs in (see src/lib/pendingInvitation.js).
 */

const CALLER_ROLES = [
  'Platform Admin',
  'Super Administrator',
  'Partner Business Administrator',
  'Admin Level 2',
  'Admin Level 1',
];

const ASSIGNABLE_ROLES = [
  'User Level 1',
  'User Level 2',
  'User Level 3',
  'Analyst',
  'Executive',
  'HRBP',
  'Leadership Coach',
  'Consultant',
  'Admin Level 1',
  'Admin Level 2',
  'Super Administrator',
  'Partner Business Administrator',
  'Platform Admin',
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!CALLER_ROLES.includes(currentUser.app_role)) {
      return Response.json(
        { success: false, error: 'You do not have permission to invite users' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const app_role = body.app_role || 'User Level 1';

    if (!EMAIL_PATTERN.test(email)) {
      return Response.json({ success: false, error: 'Enter a valid email address' }, { status: 400 });
    }

    if (!ASSIGNABLE_ROLES.includes(app_role)) {
      return Response.json({ success: false, error: `Unknown role: ${app_role}` }, { status: 400 });
    }

    // A caller may never invite someone at or above their own privilege level.
    if (!canAssignRole(currentUser.app_role, app_role)) {
      return Response.json(
        { success: false, error: `You are not permitted to invite someone as ${app_role}` },
        { status: 403 }
      );
    }

    const existing = await base44.asServiceRole.entities.User.filter({ email });
    if (existing.length > 0) {
      return Response.json(
        { success: false, error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    await sendInvite(base44, {
      email,
      app_role,
      client_id: currentUser.client_id || '',
      invited_by_email: currentUser.email,
    });

    return Response.json({ success: true, email, app_role });
  } catch (error) {
    console.error('Error inviting user:', error);
    return Response.json(
      { success: false, error: error.message || 'Failed to send invitation' },
      { status: 500 }
    );
  }
});