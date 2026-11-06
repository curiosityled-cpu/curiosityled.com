import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { resolveActiveClient } from '../../shared/tenantContext.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Tenant comes from the server resolver (selected client, else the caller's
    // home client), never from a membership field that may be stale.
    const callerClientId = user ? (await resolveActiveClient(base44, user)).client_id : null;

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Platform Admin and Super Admin can view impersonation history
    const allowedRoles = ['Platform Admin', 'Super Administrator'];
    if (!allowedRoles.includes(user.app_role)) {
      return Response.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { userEmail, adminEmail, limit = 50 } = await req.json();

    // Build filter query
    const filter = {};
    if (userEmail) {
      filter.target_user_email = userEmail;
    }
    if (adminEmail) {
      filter.admin_email = adminEmail;
    }

    // Tenant scoping: non-Platform-Admin callers can only see logs from their own tenant
    if (user.app_role !== 'Platform Admin') {
      if (!callerClientId) {
        return Response.json({ error: 'Access denied — tenant membership required' }, { status: 403 });
      }
      filter.client_id = callerClientId;
    }

    // Get impersonation logs
    const logs = await base44.asServiceRole.entities.ImpersonationLog.filter(
      filter,
      '-started_at',
      limit
    );

    return Response.json({
      success: true,
      logs,
      total: logs.length
    });

  } catch (error) {
    console.error('Error fetching impersonation history:', error);
    return Response.json({
      error: 'Failed to fetch impersonation history',
      details: error.message
    }, { status: 500 });
  }
});