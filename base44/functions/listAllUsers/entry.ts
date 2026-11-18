import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { resolveActiveClient } from '../../shared/tenantContext.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check authorization
    const allowedRoles = ['Platform Admin', 'Super Administrator', 'Partner Business Administrator', 'Admin Level 2'];
    if (!allowedRoles.includes(user.app_role)) {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    console.log('Fetching users for:', user.email, user.app_role);

    // One organization at a time, chosen in the org switcher. The selection is
    // validated by the resolver — a member cannot move out of their own tenant,
    // and a platform administrator may act on any organization.
    const body = await req.json().catch(() => ({}));
    const requestedClientId = typeof body?.client_id === 'string' ? body.client_id : null;
    const ctx = await resolveActiveClient(base44, user, requestedClientId);
    const callerClientId = ctx.client_id || null;

    if (!callerClientId) {
      // Security: fail closed — no organization resolved means no people list,
      // never a platform-wide one.
      return Response.json({ error: 'Tenant membership required — no client_id assigned' }, { status: 403 });
    }

    // Fetch users using service role to bypass RLS
    let users = await base44.asServiceRole.entities.User.list('-created_date');

    // Every viewer, Platform Admin included, sees only the active organization.
    // A person is aligned to their canonical tenant id, falling back to the
    // legacy field so a half-written account is still found (or still hidden).
    const tenantOf = (u) => u?.data?.client_id || u?.client_id || null;
    users = users.filter(u => tenantOf(u) === callerClientId);

    // Platform Admin accounts are never shown in the user management of a
    // client or partner client: only a Platform Admin may see them at all.
    if (user.app_role !== 'Platform Admin') {
      users = users.filter(u => u.app_role !== 'Platform Admin');
    }

    console.log('Returning', users.length, 'users');

    // Security: Strip credential-related fields from all user records.
    // temporary_password and must_reset_password must never be exposed in
    // API responses — they enable account takeover of onboarding-stage users.
    const SENSITIVE_FIELDS = ['temporary_password', 'must_reset_password', 'password_hash', 'reset_token'];
    const safeUsers = (users || []).map(u => {
      const safe = { ...u };
      for (const field of SENSITIVE_FIELDS) delete safe[field];
      // The table reads last_login; the record stores last_login_date.
      safe.last_login = u.last_login_date || null;
      return safe;
    });

    return Response.json({
      success: true,
      users: safeUsers
    });

  } catch (error) {
    console.error('Error listing users:', error);
    return Response.json({
      success: false,
      error: 'Failed to list users',
      users: []
    }, { status: 200 }); // Return 200 to prevent UI crash
  }
});