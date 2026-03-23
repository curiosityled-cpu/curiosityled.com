import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can export security logs
    if (!['Platform Admin', 'Super Administrator', 'Partner Business Administrator', 'Admin Level 2'].includes(currentUser.app_role)) {
      return Response.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { userEmail, startDate, endDate, includeLoginHistory = true, includeActivityLog = true } = await req.json();

    const auditData = {
      generated_at: new Date().toISOString(),
      generated_by: currentUser.email,
      target_user: userEmail,
      date_range: { start: startDate, end: endDate }
    };

    // Build filters
    const dateFilter = {};
    if (startDate) {
      dateFilter.$gte = startDate;
    }
    if (endDate) {
      dateFilter.$lte = endDate;
    }

    // Fetch login history
    if (includeLoginHistory) {
      const allLoginHistory = await base44.asServiceRole.entities.LoginHistory.list('-login_timestamp');
      let loginHistory = allLoginHistory.filter(l => l.user_email === userEmail);

      // Apply date filtering if specified
      if (startDate || endDate) {
        loginHistory = loginHistory.filter(l => {
          const timestamp = new Date(l.login_timestamp);
          if (startDate && timestamp < new Date(startDate)) return false;
          if (endDate && timestamp > new Date(endDate)) return false;
          return true;
        });
      }

      loginHistory = loginHistory.slice(0, 1000);

      auditData.login_history = {
        total_attempts: loginHistory.length,
        successful: loginHistory.filter(l => l.status === 'success').length,
        failed: loginHistory.filter(l => l.status === 'failed').length,
        locked: loginHistory.filter(l => l.status === 'locked').length,
        records: loginHistory
      };
    }

    // Fetch activity logs
    if (includeActivityLog) {
      const allActivityLogs = await base44.asServiceRole.entities.ActivityLog.list('-timestamp');
      let activityLogs = allActivityLogs.filter(l => 
        l.initiator_user_email === userEmail || l.target_user_email === userEmail
      );

      // Apply date filtering if specified
      if (startDate || endDate) {
        activityLogs = activityLogs.filter(l => {
          const timestamp = new Date(l.timestamp);
          if (startDate && timestamp < new Date(startDate)) return false;
          if (endDate && timestamp > new Date(endDate)) return false;
          return true;
        });
      }

      activityLogs = activityLogs.slice(0, 1000);

      auditData.activity_log = {
        total_activities: activityLogs.length,
        records: activityLogs
      };
    }

    // Fetch user data
    const allUsers = await base44.asServiceRole.entities.User.list();
    const user = allUsers.find(u => u.email === userEmail);
    if (user) {
      auditData.user_info = {
        email: user.email,
        full_name: user.full_name,
        app_role: user.app_role,
        account_status: user.account_status || 'active',
        failed_login_attempts: user.failed_login_attempts || 0,
        created_date: user.created_date,
        last_login_date: user.last_login_date
      };
    }

    return Response.json({
      success: true,
      audit_data: auditData
    });
  } catch (error) {
    console.error('Error exporting security audit log:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});