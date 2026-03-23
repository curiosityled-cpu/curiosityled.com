import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can view inactive users
    const allowedRoles = ['Platform Admin', 'Super Administrator', 'Admin Level 2', 'Partner Business Administrator'];
    if (!allowedRoles.includes(user.app_role)) {
      return Response.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { inactiveDays = 30, includeNeverLoggedIn = true } = await req.json();

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - inactiveDays * 24 * 60 * 60 * 1000);

    // Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();

    // Identify inactive users
    const inactiveUsers = allUsers.filter(u => {
      // Skip suspended/locked accounts
      if (u.account_status === 'suspended' || u.account_status === 'locked') {
        return false;
      }

      // Never logged in
      if (!u.last_login_date) {
        return includeNeverLoggedIn && u.invitation_accepted_at;
      }

      // Inactive for X days
      const lastLogin = new Date(u.last_login_date);
      return lastLogin < cutoffDate;
    });

    // Categorize by inactivity level
    const categorized = {
      never_logged_in: [],
      inactive_30_60_days: [],
      inactive_60_90_days: [],
      inactive_90_plus_days: []
    };

    inactiveUsers.forEach(u => {
      if (!u.last_login_date) {
        categorized.never_logged_in.push({
          email: u.email,
          full_name: u.full_name,
          department: u.department,
          invitation_accepted_at: u.invitation_accepted_at,
          days_since_signup: u.invitation_accepted_at 
            ? Math.floor((now - new Date(u.invitation_accepted_at)) / (1000 * 60 * 60 * 24))
            : null
        });
      } else {
        const daysSinceLogin = Math.floor((now - new Date(u.last_login_date)) / (1000 * 60 * 60 * 24));
        
        const userData = {
          email: u.email,
          full_name: u.full_name,
          department: u.department,
          last_login_date: u.last_login_date,
          days_inactive: daysSinceLogin
        };

        if (daysSinceLogin <= 60) {
          categorized.inactive_30_60_days.push(userData);
        } else if (daysSinceLogin <= 90) {
          categorized.inactive_60_90_days.push(userData);
        } else {
          categorized.inactive_90_plus_days.push(userData);
        }
      }
    });

    return Response.json({
      success: true,
      summary: {
        total_inactive: inactiveUsers.length,
        never_logged_in: categorized.never_logged_in.length,
        inactive_30_60_days: categorized.inactive_30_60_days.length,
        inactive_60_90_days: categorized.inactive_60_90_days.length,
        inactive_90_plus_days: categorized.inactive_90_plus_days.length
      },
      users: categorized
    });

  } catch (error) {
    console.error('Error identifying inactive users:', error);
    return Response.json({
      error: 'Failed to identify inactive users',
      details: error.message
    }, { status: 500 });
  }
});