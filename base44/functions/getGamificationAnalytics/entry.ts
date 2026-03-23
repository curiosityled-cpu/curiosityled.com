import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id, date_range } = await req.json();
    const targetClientId = client_id || user.client_id;

    // Calculate date range
    const now = new Date();
    let startDate = new Date(now);
    
    if (date_range === '7d') {
      startDate.setDate(now.getDate() - 7);
    } else if (date_range === '30d') {
      startDate.setDate(now.getDate() - 30);
    } else if (date_range === '90d') {
      startDate.setDate(now.getDate() - 90);
    } else {
      startDate.setDate(now.getDate() - 30); // default to 30 days
    }

    // Get point transactions in date range
    const transactions = await base44.asServiceRole.entities.PointTransaction.filter({
      client_id: targetClientId,
      created_date: { '$gte': startDate.toISOString() }
    });

    // Get user badges in date range
    const badges = await base44.asServiceRole.entities.UserBadge.filter({
      client_id: targetClientId,
      earned_date: { '$gte': startDate.toISOString() }
    });

    // Get all users for level distribution
    const users = await base44.asServiceRole.entities.User.filter({
      client_id: targetClientId
    });

    // Calculate analytics
    const totalPointsAwarded = transactions.reduce((sum, t) => sum + t.points_amount, 0);
    const avgPointsPerUser = users.length > 0 ? totalPointsAwarded / users.length : 0;

    // Transaction type breakdown
    const transactionsByType = transactions.reduce((acc, t) => {
      acc[t.transaction_type] = (acc[t.transaction_type] || 0) + 1;
      return acc;
    }, {});

    // Most earned badges
    const badgeCount = badges.reduce((acc, b) => {
      acc[b.badge_template_id] = (acc[b.badge_template_id] || 0) + 1;
      return acc;
    }, {});
    const mostEarnedBadges = Object.entries(badgeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([badge_id, count]) => ({ badge_id, count }));

    // Level distribution
    const levelDistribution = users.reduce((acc, u) => {
      const levelId = u.current_level_id || 'none';
      acc[levelId] = (acc[levelId] || 0) + 1;
      return acc;
    }, {});

    // Engagement metrics
    const activeUsers = new Set(transactions.map(t => t.user_email)).size;
    const engagementRate = users.length > 0 ? (activeUsers / users.length) * 100 : 0;

    return Response.json({
      success: true,
      date_range,
      start_date: startDate.toISOString(),
      end_date: now.toISOString(),
      metrics: {
        total_points_awarded: totalPointsAwarded,
        avg_points_per_user: Math.round(avgPointsPerUser),
        total_badges_earned: badges.length,
        active_users: activeUsers,
        total_users: users.length,
        engagement_rate: Math.round(engagementRate)
      },
      transactions_by_type: transactionsByType,
      most_earned_badges: mostEarnedBadges,
      level_distribution: levelDistribution
    });

  } catch (error) {
    console.error('Error getting gamification analytics:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});