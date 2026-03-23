import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Captures a snapshot of current analytics data for historical tracking
 * Should be run on a schedule (daily, weekly, or monthly)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Platform Admins can capture snapshots
    if (user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized - Platform Admin only' }, { status: 403 });
    }

    const { snapshot_type = 'daily' } = await req.json();

    // Get current analytics data
    const analyticsResponse = await base44.functions.invoke('getOrganizationalAnalytics', {
      timeframe: '1month'
    });

    if (!analyticsResponse.data?.success) {
      return Response.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
    }

    const analyticsData = analyticsResponse.data.data;

    // Prepare division breakdown
    const divisionBreakdown = analyticsData.divisions.map(div => ({
      name: div.name,
      leaders_count: div.leaders?.length || 0,
      avg_score: div.avgScore || 0,
      ready_now: div.readyNow || 0,
      high_potential: div.highPotential || 0,
      at_risk: div.atRisk || 0
    }));

    // Create snapshot
    const snapshot = await base44.asServiceRole.entities.AnalyticsSnapshot.create({
      client_id: user.client_id,
      snapshot_date: new Date().toISOString().split('T')[0],
      snapshot_type: snapshot_type,
      total_leaders: analyticsData.metrics.total_leaders,
      total_employees: analyticsData.metrics.total_employees,
      avg_si_score: analyticsData.metrics.avg_si_score,
      bench_strength: analyticsData.metrics.bench_strength,
      ready_now: analyticsData.metrics.ready_now,
      high_potential: analyticsData.metrics.high_potential,
      at_risk: analyticsData.metrics.at_risk,
      pipeline_strength: analyticsData.metrics.pipeline_strength,
      competency_averages: analyticsData.competency_averages,
      division_breakdown: divisionBreakdown,
      metadata: {
        captured_by: user.email,
        risk_areas_count: analyticsData.risk_areas?.length || 0
      }
    });

    return Response.json({
      success: true,
      message: `${snapshot_type} snapshot captured successfully`,
      snapshot_id: snapshot.id,
      snapshot_date: snapshot.snapshot_date
    });

  } catch (error) {
    console.error('Error capturing analytics snapshot:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Failed to capture snapshot' 
    }, { status: 500 });
  }
});