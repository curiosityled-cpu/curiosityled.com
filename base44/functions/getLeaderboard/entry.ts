import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { leaderboard_template_id, filters } = await req.json();

    if (!leaderboard_template_id) {
      return Response.json({ error: 'leaderboard_template_id is required' }, { status: 400 });
    }

    // Get leaderboard template
    const templates = await base44.asServiceRole.entities.LeaderboardTemplate.filter({ id: leaderboard_template_id });
    if (!templates.length) {
      return Response.json({ error: 'Leaderboard template not found' }, { status: 404 });
    }
    const template = templates[0];

    // Generate leaderboard data based on template configuration
    const leaderboardData = await base44.asServiceRole.functions.invoke('generateLeaderboardData', {
      scope: template.scope,
      metric_type: template.metric_type,
      time_period: template.time_period,
      filter_config: { ...template.filter_config, ...filters },
      display_count: template.display_count || 10,
      client_id: template.client_id
    });

    return Response.json({
      success: true,
      template,
      leaderboard: leaderboardData.data?.leaderboard || []
    });

  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});