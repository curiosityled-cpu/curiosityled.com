import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate and authorize
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ 
        success: false, 
        error: 'Unauthorized - Authentication required' 
      }, { status: 401 });
    }

    // Allow Platform Admin, Super Administrator, Partner Business Administrator, Admin Level 1, Admin Level 2
    const allowedRoles = ['Platform Admin', 'Super Administrator', 'Partner Business Administrator', 'Admin Level 1', 'Admin Level 2'];
    if (!allowedRoles.includes(user.app_role)) {
      return Response.json({ 
        success: false, 
        error: 'Unauthorized - Insufficient permissions',
        details: 'This endpoint requires admin privileges'
      }, { status: 403 });
    }

    console.log('Fetching platform analytics for:', user.email, user.app_role);

    // Helper function to safely fetch with timeout
    const fetchWithTimeout = async (promise, timeoutMs = 10000, entityName = 'data') => {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout fetching ${entityName}`)), timeoutMs)
      );
      
      try {
        return await Promise.race([promise, timeoutPromise]);
      } catch (error) {
        console.error(`Error fetching ${entityName}:`, error.message);
        return [];
      }
    };

    // Fetch all data with individual error handling and timeouts
    console.log('Starting data fetch...');
    
    const [
      users,
      clients,
      assessments,
      goals,
      assignedLearning,
      programs,
      activityLogs
    ] = await Promise.all([
      fetchWithTimeout(
        base44.asServiceRole.entities.User.list(),
        10000,
        'Users'
      ),
      fetchWithTimeout(
        base44.asServiceRole.entities.Client.list(),
        10000,
        'Clients'
      ),
      fetchWithTimeout(
        base44.asServiceRole.entities.Assessment.list(),
        10000,
        'Assessments'
      ),
      fetchWithTimeout(
        base44.asServiceRole.entities.Goal.list(),
        10000,
        'Goals'
      ),
      fetchWithTimeout(
        base44.asServiceRole.entities.AssignedLearning.list(),
        10000,
        'Assigned Learning'
      ),
      fetchWithTimeout(
        base44.asServiceRole.entities.Program.list(),
        10000,
        'Programs'
      ),
      fetchWithTimeout(
        base44.asServiceRole.entities.ActivityLog.list('-timestamp', 100),
        10000,
        'Activity Logs'
      )
    ]);

    // Apply role-based scoping
    let scopedUsers = Array.isArray(users) ? users : [];
    let scopedClients = Array.isArray(clients) ? clients : [];
    let scopedAssessments = Array.isArray(assessments) ? assessments : [];
    let scopedGoals = Array.isArray(goals) ? goals : [];
    let scopedLearning = Array.isArray(assignedLearning) ? assignedLearning : [];
    let scopedPrograms = Array.isArray(programs) ? programs : [];

    if ((user.app_role === 'Super Administrator' || user.app_role === 'Admin Level 1' || user.app_role === 'Admin Level 2') && user.client_id) {
      scopedClients = scopedClients.filter(c => c.id === user.client_id);
      scopedUsers = scopedUsers.filter(u => u.client_id === user.client_id);
      const userEmails = new Set(scopedUsers.map(u => u.email));
      scopedAssessments = scopedAssessments.filter(a => userEmails.has(a.email));
      scopedGoals = scopedGoals.filter(g => userEmails.has(g.created_by));
      scopedLearning = scopedLearning.filter(l => userEmails.has(l.user_email));
      scopedPrograms = scopedPrograms.filter(p => p.client_id === user.client_id);
    } else if (user.app_role === 'Partner Business Administrator' && user.partner_id) {
      scopedClients = scopedClients.filter(c => c.partner_id === user.partner_id);
      const clientIds = new Set(scopedClients.map(c => c.id));
      scopedUsers = scopedUsers.filter(u => clientIds.has(u.client_id));
      const userEmails = new Set(scopedUsers.map(u => u.email));
      scopedAssessments = scopedAssessments.filter(a => userEmails.has(a.email));
      scopedGoals = scopedGoals.filter(g => userEmails.has(g.created_by));
      scopedLearning = scopedLearning.filter(l => userEmails.has(l.user_email));
      scopedPrograms = scopedPrograms.filter(p => clientIds.has(p.client_id));
    }
    // Platform Admin sees all data

    console.log('Data fetched successfully:', {
      users: users?.length || 0,
      clients: clients?.length || 0,
      assessments: assessments?.length || 0,
      goals: goals?.length || 0,
      assignedLearning: assignedLearning?.length || 0,
      programs: programs?.length || 0,
      activityLogs: activityLogs?.length || 0
    });

    // Return the scoped data
    return Response.json({
      success: true,
      data: {
        users: scopedUsers,
        organizations: scopedClients,
        assessments: scopedAssessments,
        goals: scopedGoals,
        assignedLearning: scopedLearning,
        programs: scopedPrograms,
        activityLogs: Array.isArray(activityLogs) ? activityLogs : []
      }
    });

  } catch (error) {
    console.error('Error in getPlatformAnalytics:', error);
    
    // Return a structured error response
    return Response.json({ 
      success: false,
      error: error.message || 'Failed to fetch platform analytics',
      details: error.stack || 'Unknown error',
      data: {
        users: [],
        organizations: [],
        assessments: [],
        goals: [],
        assignedLearning: [],
        programs: [],
        activityLogs: []
      }
    }, { status: 500 });
  }
});