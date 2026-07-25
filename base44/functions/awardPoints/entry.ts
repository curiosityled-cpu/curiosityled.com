import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Trust boundary: when invoked by an authenticated user, require an admin role.
    // Unauthenticated calls are treated as trusted internal system workflows
    // (scheduled automations and other functions invoking this via asServiceRole).
    const isAuthenticated = await base44.auth.isAuthenticated().catch(() => false);
    if (isAuthenticated) {
      const caller = await base44.auth.me();
      const ADMIN_ROLES = ['Platform Admin', 'Super Administrator', 'Admin Level 1', 'Admin Level 2'];
      if (!caller || !ADMIN_ROLES.includes(caller.app_role)) {
        return Response.json({ error: 'Forbidden - admin access required to award points directly' }, { status: 403 });
      }
    }

    const { user_email, points_amount, transaction_type, given_by_email, related_entity_type, related_entity_id, reason, client_id } = await req.json();

    if (!user_email || points_amount === undefined || !transaction_type) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
    if (!users.length) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    const user = users[0];

    const transaction = await base44.asServiceRole.entities.PointTransaction.create({
      user_email,
      points_amount,
      transaction_type,
      given_by_email: given_by_email || 'system',
      related_entity_type,
      related_entity_id,
      reason,
      client_id: client_id || user.client_id
    });

    const currentPoints = user.total_points || 0;
    const newTotalPoints = currentPoints + points_amount;
    
    await base44.asServiceRole.entities.User.update(user.id, {
      total_points: newTotalPoints
    });

    const levelCheck = await base44.asServiceRole.functions.invoke('checkLevelProgression', {
      user_email
    });

    return Response.json({
      success: true,
      transaction,
      new_total_points: newTotalPoints,
      level_data: levelCheck.data
    });

  } catch (error) {
    console.error('Error awarding points:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});