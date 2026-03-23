import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();
    let resetCount = 0;

    for (const targetUser of allUsers) {
      // Reset weekly budgets
      const updates = {
        peer_points_given_this_week: 0,
        manager_points_given_this_week: 0,
        budget_reset_date: new Date().toISOString()
      };

      await base44.asServiceRole.entities.User.update(targetUser.id, updates);
      resetCount++;
    }

    return Response.json({
      success: true,
      message: `Budget reset complete for ${resetCount} users`,
      users_reset: resetCount
    });

  } catch (error) {
    console.error('Budget reset error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});