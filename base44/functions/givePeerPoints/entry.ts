import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipient_email, points_amount, reason } = await req.json();

    if (!recipient_email || !points_amount || !reason) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get gamification settings
    const settings = await base44.asServiceRole.entities.GamificationSettings.filter({
      client_id: user.client_id
    });
    const clientSettings = settings.length > 0 ? settings[0] : { peer_point_budget_weekly: 100 };

    // Check if point giving is enabled
    if (clientSettings.point_giving_enabled === false) {
      return Response.json({ error: 'Point giving is currently disabled' }, { status: 403 });
    }

    // Calculate current week's points given
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const pointsGivenThisWeek = await base44.asServiceRole.entities.PointTransaction.filter({
      given_by_email: user.email,
      transaction_type: 'peer_recognition',
      created_date: { '$gte': weekStart.toISOString() }
    });

    const totalGivenThisWeek = pointsGivenThisWeek.reduce((sum, t) => sum + t.points_amount, 0);
    const remainingBudget = clientSettings.peer_point_budget_weekly - totalGivenThisWeek;

    if (points_amount > remainingBudget) {
      return Response.json({ 
        error: `Insufficient budget. You have ${remainingBudget} points remaining this week.`,
        remaining_budget: remainingBudget
      }, { status: 400 });
    }

    // Award points
    const result = await base44.asServiceRole.functions.invoke('awardPoints', {
      user_email: recipient_email,
      points_amount,
      transaction_type: 'peer_recognition',
      given_by_email: user.email,
      reason,
      client_id: user.client_id
    });

    return Response.json({
      success: true,
      points_awarded: points_amount,
      remaining_budget: remainingBudget - points_amount,
      transaction: result.data.transaction
    });

  } catch (error) {
    console.error('Error giving peer points:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});