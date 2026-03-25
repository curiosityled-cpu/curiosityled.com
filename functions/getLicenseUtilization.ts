import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can view license utilization
    const allowedRoles = ['Platform Admin', 'Super Administrator', 'Partner Business Administrator'];
    if (!allowedRoles.includes(user.app_role)) {
      return Response.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    // Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();

    // Count by license type
    const utilization = {
      full: 0,
      limited: 0,
      view_only: 0,
      total: allUsers.length,
      active: 0,
      suspended: 0
    };

    allUsers.forEach(u => {
      const licenseType = u.license_type || 'full';
      utilization[licenseType] = (utilization[licenseType] || 0) + 1;

      if (u.account_status === 'active') {
        utilization.active++;
      } else if (u.account_status === 'suspended') {
        utilization.suspended++;
      }
    });

    // Calculate utilization by client
    const byClient = {};
    allUsers.forEach(u => {
      if (u.client_id) {
        if (!byClient[u.client_id]) {
          byClient[u.client_id] = { full: 0, limited: 0, view_only: 0, total: 0 };
        }
        const licenseType = u.license_type || 'full';
        byClient[u.client_id][licenseType]++;
        byClient[u.client_id].total++;
      }
    });

    return Response.json({
      success: true,
      utilization,
      byClient
    });

  } catch (error) {
    console.error('Error getting license utilization:', error);
    return Response.json({
      error: 'Failed to get license utilization',
      details: error.message
    }, { status: 500 });
  }
});