import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Recursively fetches all subordinates for a manager up to 10 levels deep
 * Used by managers to see their entire team hierarchy for assignments
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers (User Level 2), Analyst, and admins can use this function
    const allowedRoles = ['User Level 2', 'Analyst', 'Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Partner Business Administrator', 'Platform Admin'];
    if (!allowedRoles.includes(currentUser.app_role)) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { manager_email, max_depth = 10 } = await req.json();

    // Validate manager_email is provided
    if (!manager_email) {
      return Response.json({ error: 'manager_email is required' }, { status: 400 });
    }

    // For User Level 2, ensure they can only query their own hierarchy
    // Analysts and admins can query any hierarchy within their scope
    if (currentUser.app_role === 'User Level 2' && manager_email !== currentUser.email) {
      return Response.json({ error: 'You can only query your own team hierarchy' }, { status: 403 });
    }
    
    // For Analyst, verify manager is in their organization
    if (currentUser.app_role === 'Analyst' && currentUser.client_id) {
      const allUsers = await base44.asServiceRole.entities.User.list();
      const managerUser = allUsers.find(u => u.email === manager_email);
      if (!managerUser || managerUser.client_id !== currentUser.client_id) {
        return Response.json({ error: 'Manager not in your organization' }, { status: 403 });
      }
    }

    // Recursive function to get all subordinates
    const getAllSubordinates = async (managerEmail, currentDepth = 0) => {
      if (currentDepth >= max_depth) {
        return [];
      }

      // Get direct reports
      const allUsers = await base44.asServiceRole.entities.User.list();
      const directReports = allUsers.filter(u => u.manager_email === managerEmail);

      if (directReports.length === 0) {
        return [];
      }

      // Get subordinates of subordinates recursively
      const subordinatePromises = directReports.map(report =>
        getAllSubordinates(report.email, currentDepth + 1)
      );

      const nestedSubordinates = await Promise.all(subordinatePromises);
      const flattenedNested = nestedSubordinates.flat();

      // Combine direct reports with their subordinates
      return [...directReports, ...flattenedNested];
    };

    const subordinates = await getAllSubordinates(manager_email);

    // Remove duplicates (in case of complex reporting structures)
    const uniqueSubordinates = Array.from(
      new Map(subordinates.map(user => [user.email, user])).values()
    );

    // Group by level for better visualization
    const byLevel = {};
    const calculateLevel = async (userEmail, level = 1) => {
      const user = uniqueSubordinates.find(u => u.email === userEmail);
      if (!user) return;

      if (!byLevel[level]) byLevel[level] = [];
      byLevel[level].push(user);

      // Find direct reports of this user
      const reports = uniqueSubordinates.filter(u => u.manager_email === userEmail);
      for (const report of reports) {
        await calculateLevel(report.email, level + 1);
      }
    };

    // Start from the manager's direct reports
    const directReports = uniqueSubordinates.filter(u => u.manager_email === manager_email);
    for (const report of directReports) {
      await calculateLevel(report.email, 1);
    }

    return Response.json({
      success: true,
      data: {
        manager_email,
        total_subordinates: uniqueSubordinates.length,
        subordinate_emails: uniqueSubordinates.map(u => u.email),
        subordinates: uniqueSubordinates.map(u => ({
          id: u.id,
          email: u.email,
          full_name: u.full_name,
          department: u.department,
          current_role: u.current_role,
          manager_email: u.manager_email,
          app_role: u.app_role
        })),
        hierarchy_by_level: byLevel,
        max_depth_reached: Object.keys(byLevel).length >= max_depth
      }
    });

  } catch (error) {
    console.error('Error in getTeamHierarchy:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});