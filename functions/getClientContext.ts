import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ 
        success: false, 
        error: 'Unauthorized - Authentication required' 
      }, { status: 401 });
    }

    console.log('Loading client context for user:', user.email, 'client_id:', user.client_id);

    // If user has no client_id, return null context
    if (!user.client_id) {
      console.log('User has no client_id, returning null context');
      return Response.json({
        success: true,
        data: {
          client: null,
          stats: {
            total_users: 0,
            total_goals: 0,
            total_assessments: 0,
            total_learning_assigned: 0
          }
        }
      });
    }

    // Fetch client data using regular entity access
    let client = null;
    try {
      const clients = await base44.entities.Client.filter({ id: user.client_id });
      client = clients.length > 0 ? clients[0] : null;
    } catch (error) {
      console.error('Error fetching client:', error);
      // Continue with null client
    }

    if (!client) {
      console.warn('Client not found for client_id:', user.client_id);
      return Response.json({
        success: true,
        data: {
          client: null,
          stats: {
            total_users: 0,
            total_goals: 0,
            total_assessments: 0,
            total_learning_assigned: 0
          }
        }
      });
    }

    console.log('Client found:', client.name);

    // Fetch all users in this client
    let clientUsers = [];
    try {
      const allUsers = await base44.entities.User.list();
      clientUsers = allUsers.filter(u => u.client_id === user.client_id);
    } catch (error) {
      console.error('Error fetching users:', error);
    }

    const clientUserEmails = clientUsers.map(u => u.email);
    console.log('Found', clientUsers.length, 'users in client');

    // Fetch stats for this client
    const [allAssessments, allGoals, allLearning] = await Promise.all([
      base44.entities.Assessment.list().catch(err => {
        console.error('Error fetching assessments:', err);
        return [];
      }),
      base44.entities.Goal.list().catch(err => {
        console.error('Error fetching goals:', err);
        return [];
      }),
      base44.entities.AssignedLearning.list().catch(err => {
        console.error('Error fetching assigned learning:', err);
        return [];
      })
    ]);

    // Filter by client users
    const clientAssessments = allAssessments.filter(a => clientUserEmails.includes(a.email));
    const clientGoals = allGoals.filter(g => clientUserEmails.includes(g.user_email));
    const clientLearning = allLearning.filter(l => clientUserEmails.includes(l.user_email));

    const stats = {
      total_users: clientUsers.length,
      total_goals: clientGoals.length,
      total_assessments: clientAssessments.length,
      total_learning_assigned: clientLearning.length
    };

    console.log('Client stats:', stats);

    return Response.json({
      success: true,
      data: {
        client,
        stats
      }
    });

  } catch (error) {
    console.error('Error in getClientContext:', error);
    
    // Return a graceful response even on error
    return Response.json({
      success: true,
      error: error.message || 'Failed to fetch client context',
      details: error.stack,
      data: {
        client: null,
        stats: {
          total_users: 0,
          total_goals: 0,
          total_assessments: 0,
          total_learning_assigned: 0
        }
      }
    }, { status: 200 });
  }
});