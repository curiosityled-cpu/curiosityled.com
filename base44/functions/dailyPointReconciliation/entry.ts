import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { authorizeScheduledTask } from '../../shared/scheduledTaskAuth.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Security: Only internal automation or admin may invoke scheduled tasks.
    const _auth = await authorizeScheduledTask(req, base44);
    if (!_auth.authorized) return _auth.response;

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