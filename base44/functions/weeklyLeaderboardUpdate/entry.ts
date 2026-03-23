import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Generate global leaderboard
    const globalLeaderboard = await base44.asServiceRole.functions.invoke('generateLeaderboardData', {
      scope: 'global',
      metric_type: 'total_points',
      time_period: 'all_time'
    });

    // Generate monthly leaderboard
    const monthlyLeaderboard = await base44.asServiceRole.functions.invoke('generateLeaderboardData', {
      scope: 'global',
      metric_type: 'total_points',
      time_period: 'monthly'
    });

    return Response.json({
      success: true,
      message: 'Leaderboards updated successfully',
      global_entries: globalLeaderboard.data?.leaderboard?.length || 0,
      monthly_entries: monthlyLeaderboard.data?.leaderboard?.length || 0
    });

  } catch (error) {
    console.error('Leaderboard update error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});