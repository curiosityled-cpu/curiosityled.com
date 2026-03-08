import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

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