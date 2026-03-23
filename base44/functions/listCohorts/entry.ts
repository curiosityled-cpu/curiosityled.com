import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get cohorts based on user role
    let cohorts;
    
    if (user.app_role === 'Platform Admin') {
      // Platform Admin sees all cohorts
      cohorts = await base44.asServiceRole.entities.Cohort.list();
    } else if (user.app_role === 'Super Administrator' && user.client_id) {
      // Super Admin sees cohorts in their client
      cohorts = await base44.asServiceRole.entities.Cohort.list();
      cohorts = cohorts.filter(c => c.client_id === user.client_id);
    } else if (user.app_role === 'Admin Level 1' || user.app_role === 'Admin Level 2' || user.app_role === 'User Level 2' || user.app_role === 'User Level 3') {
      // Program managers and senior leaders see cohorts they manage or participate in
      cohorts = await base44.asServiceRole.entities.Cohort.list();
      cohorts = cohorts.filter(c => 
        c.manager_email === user.email || 
        (c.participant_emails && c.participant_emails.includes(user.email))
      );
    } else {
      // Regular users see cohorts they participate in
      cohorts = await base44.asServiceRole.entities.Cohort.list();
      cohorts = cohorts.filter(c => 
        c.participant_emails && c.participant_emails.includes(user.email)
      );
    }

    return Response.json({
      success: true,
      cohorts: cohorts
    });

  } catch (error) {
    console.error('Error listing cohorts:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to list cohorts',
      details: error.stack
    }, { status: 500 });
  }
});