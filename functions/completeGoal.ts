import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { goal_id } = await req.json();

    if (!goal_id) {
      return Response.json({ error: 'goal_id is required' }, { status: 400 });
    }

    // Get the goal
    const goals = await base44.asServiceRole.entities.Goal.filter({ id: goal_id });

    if (goals.length === 0) {
      return Response.json({ error: 'Goal not found' }, { status: 404 });
    }

    const goal = goals[0];

    // Update goal status
    await base44.asServiceRole.entities.Goal.update(goal_id, {
      status: 'archived',
      progress: 100
    });

    // Award gamification points
    try {
      await base44.asServiceRole.functions.invoke('awardPoints', {
        user_email: goal.created_by,
        points_amount: goal.points_value || 200,
        transaction_type: 'earned_activity',
        reason: `Completed goal: ${goal.title}`,
        related_entity_type: 'Goal',
        related_entity_id: goal_id,
        client_id: goal.client_id
      });
    } catch (gamificationError) {
      console.log('Gamification award failed (non-critical):', gamificationError.message);
    }

    return Response.json({
      success: true,
      goal,
      points_awarded: goal.points_value || 200
    });

  } catch (error) {
    console.error('Error completing goal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});