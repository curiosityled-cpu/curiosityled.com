import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { learning_resource_id, assigned_learning_id } = await req.json();

    if (!learning_resource_id) {
      return Response.json({ error: 'learning_resource_id is required' }, { status: 400 });
    }

    // Get the learning resource
    const resources = await base44.asServiceRole.entities.LearningResource.filter({
      id: learning_resource_id
    });

    if (resources.length === 0) {
      return Response.json({ error: 'Learning resource not found' }, { status: 404 });
    }

    const resource = resources[0];

    // Update assigned learning status if provided
    if (assigned_learning_id) {
      await base44.asServiceRole.entities.AssignedLearning.update(assigned_learning_id, {
        status: 'completed',
        completion_date: new Date().toISOString()
      });
    }

    // Award gamification points
    try {
      await base44.asServiceRole.functions.invoke('awardPoints', {
        user_email: user.email,
        points_amount: resource.points_value || 50,
        transaction_type: 'earned_activity',
        reason: `Completed learning resource: ${resource.title}`,
        related_entity_type: 'LearningResource',
        related_entity_id: learning_resource_id,
        client_id: user.client_id
      });
    } catch (gamificationError) {
      console.log('Gamification award failed (non-critical):', gamificationError.message);
    }

    // Create notification
    try {
      await base44.asServiceRole.entities.Notification.create({
        user_email: user.email,
        type: 'milestone',
        title: `✅ Learning Completed: ${resource.title}`,
        message: `You've completed "${resource.title}" and earned ${resource.points_value || 50} points!`,
        related_entity_type: 'LearningResource',
        related_entity_id: learning_resource_id
      });
    } catch (notifError) {
      console.log('Notification creation failed (non-critical):', notifError.message);
    }

    return Response.json({
      success: true,
      resource,
      points_awarded: resource.points_value || 50
    });

  } catch (error) {
    console.error('Error completing learning resource:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});