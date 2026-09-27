import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { isInternalCall } from '../../shared/urlValidation.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { leaderboard_template_id, filters } = await req.json();

    if (!leaderboard_template_id) {
      return Response.json({ error: 'leaderboard_template_id is required' }, { status: 400 });
    }

    // Security: Require authentication.
    const internalCall = isInternalCall(req);
    let callerUser = null;
    try { callerUser = await base44.auth.me(); } catch (_) { /* may be internal */ }
    if (!internalCall && !callerUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get leaderboard template
    const templates = await base44.asServiceRole.entities.LeaderboardTemplate.filter({ id: leaderboard_template_id });
    if (!templates.length) {
      return Response.json({ error: 'Leaderboard template not found' }, { status: 404 });
    }
    const template = templates[0];

    // Security: Verify the template belongs to the caller's tenant (or caller
    // is Platform Admin / internal) to prevent cross-tenant leaderboard access.
    if (!internalCall && callerUser && callerUser.app_role !== 'Platform Admin') {
      const callerClientId = callerUser.client_id || callerUser.data?.client_id;
      if (template.client_id && template.client_id !== callerClientId) {
        return Response.json({ error: 'Leaderboard not found' }, { status: 404 });
      }
    }

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