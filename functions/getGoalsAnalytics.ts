import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Recursive function to get all subordinates up to maxDepth
function getAllSubordinateEmails(managerEmail, allUsers, maxDepth = 50, currentDepth = 0, visited = new Set()) {
  if (currentDepth >= maxDepth || visited.has(managerEmail)) {
    return [];
  }
  
  visited.add(managerEmail);
  
  // Find direct reports
  const directReports = allUsers.filter(u => u.manager_email === managerEmail);
  const allSubordinates = [...directReports];
  
  // Recursively get reports of reports
  for (const report of directReports) {
    const nestedReports = getAllSubordinateEmails(report.email, allUsers, maxDepth, currentDepth + 1, visited);
    allSubordinates.push(...nestedReports);
  }
  
  return allSubordinates;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Allow Platform Admin, Super Admin, Admin roles, User Level 2, User Level 3, Analyst, and Partner Business Administrator
    const allowedRoles = ['Platform Admin', 'Super Administrator', 'Analyst', 'Partner Business Administrator', 'Admin Level 1', 'Admin Level 2', 'User Level 2', 'User Level 3'];
    if (!allowedRoles.includes(user.app_role)) {
      return Response.json({ 
        success: false, 
        error: 'Insufficient permissions' 
      }, { status: 403 });
    }

    // Fetch all data
    const [allUsers, allGoals] = await Promise.all([
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.Goal.list()
    ]);

    // Determine scope
    let scopedUsers = allUsers;
    let scopeLabel = 'Platform';

    if (user.app_role === 'User Level 2') {
      // Manager - get all subordinates recursively
      const subordinates = getAllSubordinateEmails(user.email, allUsers, 50);
      const teamEmails = new Set([user.email, ...subordinates.map(u => u.email)]);
      scopedUsers = allUsers.filter(u => teamEmails.has(u.email));
      scopeLabel = `${user.full_name || 'Manager'}'s Team`;
    } else if (user.app_role === 'User Level 3' || user.app_role === 'Analyst') {
      // Org Leader or Analyst - filter by client
      if (user.client_id) {
        scopedUsers = allUsers.filter(u => u.client_id === user.client_id);
        scopeLabel = 'Organization';
      }
    } else if (user.app_role === 'Admin Level 1' || user.app_role === 'Admin Level 2') {
      // Program Admin or HR Admin - filter by client
      if (user.client_id) {
        scopedUsers = allUsers.filter(u => u.client_id === user.client_id);
        scopeLabel = 'Organization';
      }
    } else if (user.app_role === 'Super Administrator' || user.app_role === 'Partner Business Administrator') {
      // Super Admin or Partner - filter by client or partner clients
      if (user.client_id) {
        scopedUsers = allUsers.filter(u => u.client_id === user.client_id);
        scopeLabel = 'Organization';
      }
    }
    // Platform Admin sees all data by default

    // Filter goals to scoped users
    const scopedUserEmails = new Set(scopedUsers.map(u => u.email));
    const scopedGoals = allGoals.filter(g => scopedUserEmails.has(g.created_by));

    // Calculate analytics
    const analytics = {
      scopeLabel,
      totalGoals: scopedGoals.length,
      completedGoals: scopedGoals.filter(g => g.status === 'completed').length,
      activeGoals: scopedGoals.filter(g => g.status === 'active').length,
      overdueGoals: scopedGoals.filter(g => g.status === 'overdue').length,
      atRiskGoals: scopedGoals.filter(g => g.status === 'at_risk').length,
      // ... additional metrics
    };

    return Response.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error in getGoalsAnalytics:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});