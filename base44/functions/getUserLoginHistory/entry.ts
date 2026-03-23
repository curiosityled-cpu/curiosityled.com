import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userEmail, limit = 50 } = await req.json();

    if (!userEmail) {
      return Response.json({ error: 'userEmail is required' }, { status: 400 });
    }

    // Check authorization - user can view their own history, admins can view any
    const isAdmin = ['Platform Admin', 'Super Administrator', 'Partner Business Administrator', 'Admin Level 2'].includes(currentUser.app_role);
    
    if (!isAdmin && currentUser.email !== userEmail) {
      return Response.json({ error: 'Forbidden: Cannot view other users login history' }, { status: 403 });
    }

    // Fetch login history using list() to bypass RLS completely
    const allLoginHistory = await base44.asServiceRole.entities.LoginHistory.list('-login_timestamp');
    const loginHistory = allLoginHistory
      .filter(l => l.user_email === userEmail)
      .slice(0, limit);

    // Calculate statistics
    const successfulLogins = loginHistory.filter(l => l.status === 'success').length;
    const failedLogins = loginHistory.filter(l => l.status === 'failed').length;
    const lockedAttempts = loginHistory.filter(l => l.status === 'locked').length;

    // Get unique locations
    const uniqueLocations = [...new Set(loginHistory.map(l => l.location).filter(Boolean))];

    // Get recent failed attempts (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentFailedAttempts = loginHistory.filter(l => 
      l.status === 'failed' && new Date(l.login_timestamp) > oneDayAgo
    ).length;

    return Response.json({
      success: true,
      loginHistory,
      statistics: {
        total: loginHistory.length,
        successful: successfulLogins,
        failed: failedLogins,
        locked: lockedAttempts,
        recent_failed_24h: recentFailedAttempts,
        unique_locations: uniqueLocations.length
      }
    });
  } catch (error) {
    console.error('Error fetching login history:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});