import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    let deletedCount = {
      achievements: 0,
      transactions: 0,
      badges: 0
    };

    // Delete test achievements
    const testAchievements = await base44.asServiceRole.entities.UserAchievement.filter({
      user_email: { $regex: 'test-user-.*@example.com' }
    });

    for (const achievement of testAchievements) {
      await base44.asServiceRole.entities.UserAchievement.delete(achievement.id);
      deletedCount.achievements++;
    }

    // Delete test transactions
    const testTransactions = await base44.asServiceRole.entities.PointTransaction.filter({
      user_email: { $regex: 'test-user-.*@example.com' }
    });

    for (const transaction of testTransactions) {
      await base44.asServiceRole.entities.PointTransaction.delete(transaction.id);
      deletedCount.transactions++;
    }

    // Delete test badges
    const testBadges = await base44.asServiceRole.entities.UserBadge.filter({
      user_email: { $regex: 'test-.*@example.com' }
    });

    for (const badge of testBadges) {
      await base44.asServiceRole.entities.UserBadge.delete(badge.id);
      deletedCount.badges++;
    }

    return Response.json({
      success: true,
      message: `Cleaned up test data`,
      deleted_count: deletedCount
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});