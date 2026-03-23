import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { scope, metric_type, time_period, filter_config, display_count, client_id } = await req.json();

    if (!scope || !metric_type) {
      return Response.json({ error: 'scope and metric_type are required' }, { status: 400 });
    }

    let leaderboard = [];

    // Calculate time range
    const now = new Date();
    let startDate = null;

    if (time_period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (time_period === 'quarterly') {
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
    } else if (time_period === 'yearly') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    // Build query based on metric type
    if (metric_type === 'total_points') {
      // Get users with their points
      let query = {};
      if (client_id) query.client_id = client_id;
      if (filter_config?.role) query.app_role = filter_config.role;
      if (filter_config?.department) query.department = filter_config.department;

      const users = await base44.asServiceRole.entities.User.filter(query, '-total_points', display_count || 10);

      leaderboard = users.map((user, index) => ({
        rank: index + 1,
        user_email: user.email,
        user_name: user.full_name,
        metric_value: user.total_points || 0,
        metric_label: 'points',
        current_level_id: user.current_level_id
      }));

    } else if (metric_type === 'specific_badge') {
      // Count users who earned a specific badge
      const badge_id = filter_config?.badge_id;
      if (!badge_id) {
        return Response.json({ error: 'badge_id required in filter_config for specific_badge metric' }, { status: 400 });
      }

      const userBadges = await base44.asServiceRole.entities.UserBadge.filter({
        badge_template_id: badge_id,
        client_id
      }, '-earned_date', display_count || 10);

      leaderboard = await Promise.all(userBadges.map(async (ub, index) => {
        const users = await base44.asServiceRole.entities.User.filter({ email: ub.user_email });
        return {
          rank: index + 1,
          user_email: ub.user_email,
          user_name: users.length > 0 ? users[0].full_name : ub.user_email,
          metric_value: new Date(ub.earned_date).getTime(),
          metric_label: 'earned_date',
          earned_date: ub.earned_date
        };
      }));

    } else if (metric_type === 'learning_completion') {
      // Count learning completions
      // This would require tracking learning completions
      // Simplified implementation
      leaderboard = [];
    }

    return Response.json({
      success: true,
      leaderboard,
      generated_at: new Date().toISOString(),
      scope,
      metric_type,
      time_period
    });

  } catch (error) {
    console.error('Error generating leaderboard data:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});