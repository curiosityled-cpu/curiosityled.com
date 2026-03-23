import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate
    const user = await base44.auth.me();
    if (!user || !user.email) {
      return Response.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Fetch all journeys using service role
    const allJourneys = await base44.asServiceRole.entities.LearningJourney.list('-updated_date');
    
    // Filter based on user access
    const userJourneys = {
      assigned: [],
      created: []
    };

    allJourneys.forEach(journey => {
      // Check if user is assigned
      const isAssigned = journey.assigned_to_emails?.includes(user.email);
      
      // Check if user is creator or shared admin
      const isCreator = journey.author_email === user.email;
      const isSharedAdmin = journey.shared_admin_emails?.includes(user.email);
      
      // Check if user has access via client_id
      const hasClientAccess = user.client_id && journey.client_id === user.client_id;
      
      // Check if user has access via partner_id
      const hasPartnerAccess = user.partner_id && journey.partner_id === user.partner_id;

      // Add to assigned if user is assigned and not the creator
      if (isAssigned && !isCreator) {
        userJourneys.assigned.push(journey);
      }
      
      // Add to created if user is creator, shared admin, or has admin access
      if (isCreator || isSharedAdmin || 
          (hasClientAccess && ['Super Administrator', 'Admin Level 1', 'Admin Level 2', 'Platform Admin'].includes(user.app_role)) ||
          (hasPartnerAccess && user.app_role === 'Partner Business Administrator')) {
        userJourneys.created.push(journey);
      }
    });

    return Response.json({
      success: true,
      journeys: userJourneys
    });

  } catch (error) {
    console.error('Error in getUserJourneys:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});