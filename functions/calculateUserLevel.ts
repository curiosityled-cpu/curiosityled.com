import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_email } = await req.json();

    if (!user_email) {
      return Response.json({ error: 'user_email is required' }, { status: 400 });
    }

    // Get user
    const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
    if (!users.length) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    const user = users[0];
    const totalPoints = user.total_points || 0;

    // Get all levels for this client (or platform defaults)
    const levels = await base44.asServiceRole.entities.GamificationLevel.filter({
      '$or': [
        { client_id: user.client_id },
        { is_platform_default: true, client_id: null }
      ],
      is_active: true
    }, 'level_order', 100);

    // Find appropriate level based on points and prerequisites
    let appropriateLevel = null;
    
    for (const level of levels) {
      if (totalPoints >= level.points_threshold) {
        // Check prerequisites
        let meetsPrereqs = true;
        
        // Check program prerequisites
        if (level.prerequisite_program_ids?.length > 0) {
          // Would need to check user's completed programs
          // Simplified for now
        }
        
        // Check badge prerequisites
        if (level.prerequisite_badge_ids?.length > 0) {
          const userBadges = await base44.asServiceRole.entities.UserBadge.filter({
            user_email,
            badge_template_id: { '$in': level.prerequisite_badge_ids }
          });
          if (userBadges.length < level.prerequisite_badge_ids.length) {
            meetsPrereqs = false;
          }
        }
        
        if (meetsPrereqs) {
          appropriateLevel = level;
        }
      }
    }

    // If no level found, use first level or create default
    if (!appropriateLevel && levels.length > 0) {
      appropriateLevel = levels[0];
    }

    return Response.json({
      success: true,
      current_level: appropriateLevel,
      total_points: totalPoints,
      next_level: levels.find(l => l.level_order === (appropriateLevel?.level_order || 0) + 1),
      points_to_next_level: appropriateLevel 
        ? (levels.find(l => l.level_order === appropriateLevel.level_order + 1)?.points_threshold || 0) - totalPoints
        : 0
    });

  } catch (error) {
    console.error('Error calculating user level:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});