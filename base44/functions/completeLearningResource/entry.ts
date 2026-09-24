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
    // Security: Verify the AssignedLearning record belongs to the caller
    // before marking it complete (prevent IDOR on other users' learning).
    if (assigned_learning_id) {
      const assignedRecords = await base44.asServiceRole.entities.AssignedLearning.filter({
        id: assigned_learning_id,
        user_email: user.email
      });
      if (assignedRecords.length === 0) {
        return Response.json({ error: 'Assigned learning not found or does not belong to you.' }, { status: 403 });
      }
      // Idempotency: skip if already completed (prevents double-awarding points)
      if (assignedRecords[0].status === 'completed') {
        return Response.json({ success: true, already_completed: true, resource, points_awarded: 0 });
      }
      await base44.asServiceRole.entities.AssignedLearning.update(assigned_learning_id, {
        status: 'completed',
        completion_date: new Date().toISOString()
      });
    } else {
      // Security/Idempotency: Points are only awarded when a valid AssignedLearning
      // record is provided and verified. Without this, any user could farm
      // unlimited points by repeatedly calling this endpoint with a public
      // resource ID and no assignment. Admins are exempted but still checked
      // for an existing PointTransaction to prevent re-awarding.
      const ADMIN_ROLES = ['Platform Admin', 'Super Administrator', 'Admin Level 1', 'Admin Level 2'];
      if (!ADMIN_ROLES.includes(user.app_role)) {
        return Response.json({
          error: 'An assigned learning record is required to earn points for completing a resource.'
        }, { status: 400 });
      }
      // Admins: check for existing point transaction to prevent re-award.
      const existingTx = await base44.asServiceRole.entities.PointTransaction.filter({
        user_email: user.email,
        related_entity_type: 'LearningResource',
        related_entity_id: learning_resource_id
      });
      if (existingTx.length > 0) {
        return Response.json({ success: true, already_completed: true, resource, points_awarded: 0 });
      }
    }

    // Award gamification points
    try {
      await base44.asServiceRole.functions.invoke('awardPoints', {
        internal_secret: Deno.env.get('INTERNAL_FUNCTION_SECRET'),
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
    return Response.json({ error: 'Failed to complete learning resource.' }, { status: 500 });
  }
});