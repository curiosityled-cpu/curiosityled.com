import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's achievement record
    const achievements = await base44.asServiceRole.entities.UserAchievement.filter({
      user_email: user.email
    });

    if (achievements.length === 0) {
      return Response.json({ newly_earned: [] });
    }

    const achievement = achievements[0];
    const earnedBadgeIds = new Set(achievement.earned_badges?.map(b => b.badge_id) || []);

    // Get all active badges
    const allBadges = await base44.asServiceRole.entities.Badge.filter({
      is_active: true
    });

    // Check which badges can be earned
    const newlyEarned = [];

    for (const badge of allBadges) {
      if (earnedBadgeIds.has(badge.id)) continue;

      const criteria = badge.criteria || {};
      let earned = false;

      switch (criteria.type) {
        case 'count':
          // Check if user has reached count target for entity_type
          const stats = achievement.stats || {};
          const entityMap = {
            'Goal': stats.goals_completed || 0,
            'LearningResource': stats.learning_completed || 0,
            'Assessment': stats.assessments_taken || 0,
            'CoachingSession': stats.coaching_sessions || 0
          };
          const count = entityMap[criteria.entity_type] || 0;
          earned = count >= (criteria.target_value || 0);
          break;

        case 'streak':
          earned = achievement.current_streak_days >= (criteria.target_value || 0);
          break;

        case 'percentage':
          // For competency mastery or goal completion rate
          earned = false; // Requires custom logic per badge
          break;

        case 'milestone':
          // For special achievements (total points, level reached, etc.)
          if (criteria.entity_type === 'total_points') {
            earned = achievement.total_points >= (criteria.target_value || 0);
          } else if (criteria.entity_type === 'level') {
            earned = achievement.current_level >= (criteria.target_value || 0);
          }
          break;
      }

      if (earned) {
        newlyEarned.push({
          badge_id: badge.id,
          badge_name: badge.name,
          description: badge.description,
          tier: badge.tier,
          icon: badge.icon,
          points_value: badge.points_value
        });
      }
    }

    // Award newly earned badges
    if (newlyEarned.length > 0) {
      const updatedBadges = [
        ...(achievement.earned_badges || []),
        ...newlyEarned.map(b => ({
          badge_id: b.badge_id,
          badge_name: b.badge_name,
          earned_date: new Date().toISOString(),
          tier: b.tier
        }))
      ];

      // Add badge points to total
      const badgePoints = newlyEarned.reduce((sum, b) => sum + (b.points_value || 0), 0);

      await base44.asServiceRole.entities.UserAchievement.update(achievement.id, {
        earned_badges: updatedBadges,
        total_points: achievement.total_points + badgePoints
      });
    }

    return Response.json({
      newly_earned: newlyEarned,
      total_badges: earnedBadgeIds.size + newlyEarned.length
    });
  } catch (error) {
    console.error('Error checking badge progress:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});