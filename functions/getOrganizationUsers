
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized - Platform Admin only' }, { status: 401 });
    }

    const { organization_id } = await req.json();

    if (!organization_id) {
      return Response.json({ error: 'organization_id is required' }, { status: 400 });
    }

    // Get all users for this organization
    const users = await base44.asServiceRole.entities.User.filter({ organization_id });

    // Get additional stats
    const stats = {
      total_users: users.length,
      by_role: users.reduce((acc, u) => {
        acc[u.app_role] = (acc[u.app_role] || 0) + 1;
        return acc;
      }, {}),
      active_users: users.filter(u => !u.at_risk_flag).length,
      at_risk_users: users.filter(u => u.at_risk_flag).length
    };

    return Response.json({ 
      users,
      stats
    });

  } catch (error) {
    console.error('Error getting organization users:', error);
    return Response.json({ 
      error: error.message || 'Failed to get users' 
    }, { status: 500 });
  }
});
