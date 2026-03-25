import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = user.client_id;

    if (!clientId) {
      return Response.json({ error: 'User must be assigned to a client' }, { status: 400 });
    }

    let deletedCount = 0;

    // Delete demo goals
    const goals = await base44.entities.Goal.filter({ 
      client_id: clientId,
      user_email: user.email 
    });
    for (const goal of goals) {
      await base44.entities.Goal.delete(goal.id);
      deletedCount++;
    }

    // Delete demo assigned learning
    const learning = await base44.entities.AssignedLearning.filter({ 
      client_id: clientId,
      user_email: user.email 
    });
    for (const item of learning) {
      await base44.entities.AssignedLearning.delete(item.id);
      deletedCount++;
    }

    // Delete demo onboarding plans
    const plans = await base44.entities.OnboardingPlan.filter({ 
      client_id: clientId,
      assigned_to_email: user.email 
    });
    for (const plan of plans) {
      await base44.entities.OnboardingPlan.delete(plan.id);
      deletedCount++;
    }

    // Delete demo notifications
    const notifications = await base44.entities.Notification.filter({ 
      user_email: user.email 
    });
    for (const notification of notifications) {
      await base44.entities.Notification.delete(notification.id);
      deletedCount++;
    }

    return Response.json({
      message: 'Demo data cleaned up successfully',
      items_deleted: deletedCount
    });

  } catch (error) {
    console.error('Error cleaning up demo data:', error);
    return Response.json({
      error: error.message || 'Failed to cleanup demo data',
      details: error.stack
    }, { status: 500 });
  }
});