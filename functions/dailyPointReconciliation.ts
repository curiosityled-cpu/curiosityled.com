import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Note: This function is designed to run via scheduled automation (no user context)
    // If called manually, verify admin access
    const isAuthenticated = await base44.auth.isAuthenticated();
    if (isAuthenticated) {
      const user = await base44.auth.me();
      if (user?.app_role !== 'Platform Admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }
    // If not authenticated, assume it's an automation and proceed with service role

    const allAchievements = await base44.asServiceRole.entities.UserAchievement.list();
    let updatedCount = 0;

    for (const achievement of allAchievements) {
      const result = await base44.asServiceRole.functions.invoke('checkLevelProgression', {
        user_email: achievement.user_email
      });

      if (result.data?.level_changed) {
        updatedCount++;
      }
    }

    return Response.json({
      success: true,
      message: `Reconciliation complete. ${updatedCount} users leveled up.`,
      total_checked: allAchievements.length,
      levels_updated: updatedCount
    });

  } catch (error) {
    console.error('Reconciliation error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});