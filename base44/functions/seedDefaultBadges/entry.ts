import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.app_role !== 'Platform Admin' && user.app_role !== 'Super Administrator')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const defaultBadges = [
      // Learning badges
      {
        name: "First Steps",
        description: "Complete your first learning resource",
        category: "learning",
        icon: "🎓",
        tier: "bronze",
        points_value: 50,
        criteria: { type: "count", target_value: 1, entity_type: "LearningResource" }
      },
      {
        name: "Learning Enthusiast",
        description: "Complete 5 learning resources",
        category: "learning",
        icon: "📚",
        tier: "silver",
        points_value: 200,
        criteria: { type: "count", target_value: 5, entity_type: "LearningResource" }
      },
      {
        name: "Knowledge Master",
        description: "Complete 20 learning resources",
        category: "learning",
        icon: "🎖️",
        tier: "gold",
        points_value: 500,
        criteria: { type: "count", target_value: 20, entity_type: "LearningResource" }
      },
      
      // Goal badges
      {
        name: "Goal Setter",
        description: "Complete your first goal",
        category: "goals",
        icon: "🎯",
        tier: "bronze",
        points_value: 100,
        criteria: { type: "count", target_value: 1, entity_type: "Goal" }
      },
      {
        name: "Achiever",
        description: "Complete 10 goals",
        category: "goals",
        icon: "🏆",
        tier: "silver",
        points_value: 300,
        criteria: { type: "count", target_value: 10, entity_type: "Goal" }
      },
      {
        name: "Goal Crusher",
        description: "Complete 50 goals",
        category: "goals",
        icon: "💎",
        tier: "gold",
        points_value: 750,
        criteria: { type: "count", target_value: 50, entity_type: "Goal" }
      },
      
      // Assessment badges
      {
        name: "Self Aware",
        description: "Complete your first assessment",
        category: "assessment",
        icon: "📊",
        tier: "bronze",
        points_value: 150,
        criteria: { type: "count", target_value: 1, entity_type: "Assessment" }
      },
      {
        name: "Improvement Focused",
        description: "Complete 3 assessments",
        category: "assessment",
        icon: "📈",
        tier: "silver",
        points_value: 400,
        criteria: { type: "count", target_value: 3, entity_type: "Assessment" }
      },
      
      // Streak badges
      {
        name: "Committed",
        description: "Maintain a 7-day streak",
        category: "streak",
        icon: "🔥",
        tier: "bronze",
        points_value: 200,
        criteria: { type: "streak", target_value: 7 }
      },
      {
        name: "Dedicated",
        description: "Maintain a 30-day streak",
        category: "streak",
        icon: "⚡",
        tier: "silver",
        points_value: 500,
        criteria: { type: "streak", target_value: 30 }
      },
      {
        name: "Unstoppable",
        description: "Maintain a 100-day streak",
        category: "streak",
        icon: "🌟",
        tier: "gold",
        points_value: 1000,
        criteria: { type: "streak", target_value: 100 }
      },
      
      // Milestone badges
      {
        name: "Rising Star",
        description: "Reach Level 5",
        category: "milestone",
        icon: "⭐",
        tier: "silver",
        points_value: 300,
        criteria: { type: "milestone", target_value: 5, entity_type: "level" }
      },
      {
        name: "Point Master",
        description: "Earn 5,000 total points",
        category: "milestone",
        icon: "💰",
        tier: "gold",
        points_value: 0,
        criteria: { type: "milestone", target_value: 5000, entity_type: "total_points" }
      },
      
      // Coaching badges
      {
        name: "Coachable",
        description: "Attend 5 coaching sessions",
        category: "coaching",
        icon: "🤝",
        tier: "silver",
        points_value: 250,
        criteria: { type: "count", target_value: 5, entity_type: "CoachingSession" }
      }
    ];

    // Create badges (skip if they already exist)
    const created = [];
    for (const badgeData of defaultBadges) {
      const existing = await base44.asServiceRole.entities.Badge.filter({
        name: badgeData.name,
        client_id: null
      });

      if (existing.length === 0) {
        const badge = await base44.asServiceRole.entities.Badge.create({
          ...badgeData,
          client_id: null,
          is_active: true
        });
        created.push(badge);
      }
    }

    return Response.json({
      success: true,
      message: `Created ${created.length} badges`,
      created_count: created.length,
      total_default_badges: defaultBadges.length
    });
  } catch (error) {
    console.error('Error seeding badges:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});