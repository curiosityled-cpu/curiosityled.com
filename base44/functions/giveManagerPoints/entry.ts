import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { team_member_email, points_amount, reason } = await req.json();

    if (!team_member_email || !points_amount || !reason) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Security: validate points_amount is a finite positive integer (prevent negative/malformed).
    const pts = Number(points_amount);
    if (!Number.isFinite(pts) || !Number.isInteger(pts) || pts <= 0 || pts > 10000) {
      return Response.json({ error: 'points_amount must be a positive integer between 1 and 10000' }, { status: 400 });
    }

    // Verify manager relationship
    const teamMember = await base44.asServiceRole.entities.User.filter({ email: team_member_email });
    if (!teamMember.length) {
      return Response.json({ error: 'Team member not found' }, { status: 404 });
    }

    // Derive manager relationship server-side from the target user's
    // manager_email field — never trust the self-editable subordinate_emails.
    const isManager = teamMember[0].manager_email === user.email;

    if (!isManager) {
      return Response.json({ error: 'You are not the manager of this user' }, { status: 403 });
    }

    // Get gamification settings
    const settings = await base44.asServiceRole.entities.GamificationSettings.filter({
      client_id: user.client_id
    });
    const clientSettings = settings.length > 0 ? settings[0] : { manager_point_budget_weekly: 500 };

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
      transaction_type: 'manager_award',
      created_date: { '$gte': weekStart.toISOString() }
    });

    const totalGivenThisWeek = pointsGivenThisWeek.reduce((sum, t) => sum + t.points_amount, 0);
    const remainingBudget = clientSettings.manager_point_budget_weekly - totalGivenThisWeek;

    if (pts > remainingBudget) {
      return Response.json({ 
        error: `Insufficient budget. You have ${remainingBudget} points remaining this week.`,
        remaining_budget: remainingBudget
      }, { status: 400 });
    }

    // Award points
    const result = await base44.asServiceRole.functions.invoke('awardPoints', {
      internal_secret: Deno.env.get('INTERNAL_FUNCTION_SECRET'),
      user_email: team_member_email,
      points_amount: pts,
      transaction_type: 'manager_award',
      given_by_email: user.email,
      reason,
      client_id: user.client_id
    });

    return Response.json({
      success: true,
      points_awarded: pts,
      remaining_budget: remainingBudget - pts,
      transaction: result.data.transaction
    });

  } catch (error) {
    console.error('Error giving manager points:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});