import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
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