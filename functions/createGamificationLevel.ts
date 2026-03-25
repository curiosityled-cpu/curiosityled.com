import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-only check
    const adminRoles = ['Admin Level 2', 'Super Administrator', 'Platform Admin', 'Partner Business Administrator'];
    if (!adminRoles.includes(user.app_role)) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const levelData = await req.json();

    // Validate required fields
    if (!levelData.level_name || levelData.level_order === undefined || levelData.points_threshold === undefined) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create gamification level
    const level = await base44.asServiceRole.entities.GamificationLevel.create({
      client_id: user.app_role === 'Platform Admin' ? null : user.client_id,
      level_name: levelData.level_name,
      level_order: levelData.level_order,
      points_threshold: levelData.points_threshold,
      prerequisite_program_ids: levelData.prerequisite_program_ids || [],
      prerequisite_badge_ids: levelData.prerequisite_badge_ids || [],
      prerequisite_assessment_ids: levelData.prerequisite_assessment_ids || [],
      rewards: levelData.rewards || {},
      icon_url: levelData.icon_url,
      description: levelData.description,
      is_active: levelData.is_active !== false,
      is_platform_default: user.app_role === 'Platform Admin'
    });

    return Response.json({
      success: true,
      level
    });

  } catch (error) {
    console.error('Error creating gamification level:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});