import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Fetches all teams within divisions with optional filtering
 * Used by admins to see teams and assign resources
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can use this function
    const allowedRoles = ['Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Partner Business Administrator', 'Platform Admin'];
    if (!allowedRoles.includes(currentUser.app_role)) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { division_name, manager_email, client_id } = await req.json();

    // Get all users with service role for admin access
    let allUsers = await base44.asServiceRole.entities.User.list();

    // Filter by client_id if provided and user is not Platform Admin
    if (client_id && currentUser.app_role !== 'Platform Admin') {
      allUsers = allUsers.filter(u => u.client_id === client_id);
    } else if (currentUser.app_role !== 'Platform Admin' && currentUser.app_role !== 'Super Administrator') {
      // For Partner Business Admin, filter by their associated clients
      allUsers = allUsers.filter(u => u.client_id === currentUser.client_id);
    }

    // Filter by division if provided
    if (division_name && division_name !== 'all') {
      allUsers = allUsers.filter(u => u.department === division_name);
    }

    // Get unique divisions
    const divisions = [...new Set(allUsers.map(u => u.department).filter(Boolean))].sort();

    // Group users by manager to identify teams
    const teamsByManager = {};
    
    allUsers.forEach(user => {
      if (user.manager_email) {
        if (!teamsByManager[user.manager_email]) {
          teamsByManager[user.manager_email] = [];
        }
        teamsByManager[user.manager_email].push(user);
      }
    });

    // Build team objects
    const teams = Object.entries(teamsByManager)
      .filter(([managerEmail, members]) => {
        // Filter by manager_email if provided
        if (manager_email && manager_email !== 'all') {
          return managerEmail === manager_email;
        }
        return true;
      })
      .map(([managerEmail, members]) => {
        const manager = allUsers.find(u => u.email === managerEmail);
        const teamDepartments = [...new Set(members.map(m => m.department).filter(Boolean))];
        
        return {
          manager_email: managerEmail,
          manager_name: manager?.full_name || 'Unknown Manager',
          manager_role: manager?.current_role || manager?.app_role || 'Manager',
          department: teamDepartments.length === 1 ? teamDepartments[0] : 'Mixed',
          departments: teamDepartments,
          member_count: members.length,
          members: members.map(m => ({
            id: m.id,
            email: m.email,
            full_name: m.full_name,
            department: m.department,
            current_role: m.current_role,
            app_role: m.app_role
          })),
          member_emails: members.map(m => m.email)
        };
      })
      .sort((a, b) => b.member_count - a.member_count); // Sort by team size

    // Get users without managers (individual contributors or top-level)
    const usersWithoutManagers = allUsers.filter(u => !u.manager_email);

    return Response.json({
      success: true,
      data: {
        divisions,
        teams,
        total_teams: teams.length,
        total_members: teams.reduce((sum, t) => sum + t.member_count, 0),
        users_without_managers: usersWithoutManagers.map(u => ({
          id: u.id,
          email: u.email,
          full_name: u.full_name,
          department: u.department,
          current_role: u.current_role,
          app_role: u.app_role
        })),
        filters_applied: {
          division_name: division_name || 'all',
          manager_email: manager_email || 'all',
          client_id: client_id || null
        }
      }
    });

  } catch (error) {
    console.error('Error in getDivisionTeams:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});