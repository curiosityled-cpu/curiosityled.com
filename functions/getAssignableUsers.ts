import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Gets list of users that the current user can assign resources to
 * Based on role and permissions
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to assign
    const canAssignRoles = ['User Level 2', 'Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Partner Business Administrator', 'Platform Admin'];
    if (!canAssignRoles.includes(currentUser.app_role)) {
      return Response.json({ error: 'Insufficient permissions to assign resources' }, { status: 403 });
    }

    const { include_metadata = true } = await req.json().catch(() => ({}));

    let assignableUsers = [];
    let scope = '';
    let grouping = {};

    // Get users based on role
    if (currentUser.app_role === 'User Level 2') {
      // Manager: Get team hierarchy
      const hierarchyResponse = await base44.functions.invoke('getTeamHierarchy', {
        manager_email: currentUser.email
      });

      if (hierarchyResponse.data?.success) {
        assignableUsers = hierarchyResponse.data.data.subordinates || [];
        scope = 'team_hierarchy';
        
        // Group by level in hierarchy
        grouping = hierarchyResponse.data.data.hierarchy_by_level || {};
      }
    } else if (currentUser.app_role === 'Admin Level 1') {
      // Program Admin: Get users in their programs/cohorts
      const allUsers = await base44.asServiceRole.entities.User.list();
      assignableUsers = allUsers.filter(u => u.client_id === currentUser.client_id);
      scope = 'programs';
      
      // Group by department
      assignableUsers.forEach(user => {
        const dept = user.department || 'No Department';
        if (!grouping[dept]) grouping[dept] = [];
        grouping[dept].push(user);
      });
    } else if (['Admin Level 2', 'Super Administrator'].includes(currentUser.app_role)) {
      // HR Admin / Super Admin: All users in organization
      const allUsers = await base44.asServiceRole.entities.User.list();
      assignableUsers = allUsers.filter(u => u.client_id === currentUser.client_id);
      scope = 'organization_wide';
      
      // Group by division/department
      assignableUsers.forEach(user => {
        const dept = user.department || 'No Department';
        if (!grouping[dept]) grouping[dept] = [];
        grouping[dept].push(user);
      });
    } else if (currentUser.app_role === 'Partner Business Administrator') {
      // Partner Admin: All users in their partner's clients
      const allUsers = await base44.asServiceRole.entities.User.list();
      assignableUsers = allUsers.filter(u => u.client_id === currentUser.client_id);
      scope = 'partner_clients';
      
      // Group by client
      assignableUsers.forEach(user => {
        const clientId = user.client_id || 'No Client';
        if (!grouping[clientId]) grouping[clientId] = [];
        grouping[clientId].push(user);
      });
    } else if (currentUser.app_role === 'Platform Admin') {
      // Platform Admin: All users across all clients
      assignableUsers = await base44.asServiceRole.entities.User.list();
      scope = 'platform_wide';
      
      // Group by client
      assignableUsers.forEach(user => {
        const clientId = user.client_id || 'No Client';
        if (!grouping[clientId]) grouping[clientId] = [];
        grouping[clientId].push(user);
      });
    }

    // Format user data
    const formattedUsers = assignableUsers.map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      department: u.department,
      current_role: u.current_role,
      app_role: u.app_role,
      manager_email: u.manager_email,
      client_id: u.client_id
    }));

    // Get assessment and goal counts if metadata requested
    let metadata = {};
    if (include_metadata) {
      const userEmails = formattedUsers.map(u => u.email);
      
      const [assessments, goals] = await Promise.all([
        base44.asServiceRole.entities.Assessment.list(),
        base44.asServiceRole.entities.Goal.list()
      ]);

      metadata.assessment_completion = {};
      metadata.active_goals = {};

      userEmails.forEach(email => {
        const userAssessments = assessments.filter(a => a.email === email);
        metadata.assessment_completion[email] = userAssessments.length > 0;
        
        const userGoals = goals.filter(g => g.user_email === email && ['active', 'at_risk', 'overdue'].includes(g.status));
        metadata.active_goals[email] = userGoals.length;
      });
    }

    return Response.json({
      success: true,
      data: {
        assignable_users: formattedUsers,
        total_count: formattedUsers.length,
        scope,
        grouped_by: grouping,
        current_user_role: currentUser.app_role,
        metadata: include_metadata ? metadata : null
      }
    });

  } catch (error) {
    console.error('Error in getAssignableUsers:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});