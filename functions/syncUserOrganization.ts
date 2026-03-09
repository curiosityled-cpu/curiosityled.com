import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_id } = await req.json();

    // Determine target user
    let targetUserId = user_id || user.id;
    
    // Only Super Admins can sync other users
    if (user_id && user.app_role !== 'Admin Level 3') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with organization_id
    const users = await base44.asServiceRole.entities.User.filter({ id: targetUserId });
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];
    const orgId = targetUser.organization_id;

    if (!orgId) {
      return Response.json({ 
        message: 'User not assigned to any organization',
        synced: 0
      });
    }

    let synced = 0;

    // Sync Goals
    const goals = await base44.asServiceRole.entities.Goal.filter({ user_email: targetUser.email });
    for (const goal of goals) {
      if (goal.organization_id !== orgId) {
        await base44.asServiceRole.entities.Goal.update(goal.id, { organization_id: orgId });
        synced++;
      }
    }

    // Sync Assigned Learning
    const learning = await base44.asServiceRole.entities.AssignedLearning.filter({ user_email: targetUser.email });
    for (const item of learning) {
      if (item.organization_id !== orgId) {
        await base44.asServiceRole.entities.AssignedLearning.update(item.id, { organization_id: orgId });
        synced++;
      }
    }

    // Sync Onboarding Plans
    const plans = await base44.asServiceRole.entities.OnboardingPlan.filter({ assigned_to_email: targetUser.email });
    for (const plan of plans) {
      if (plan.organization_id !== orgId) {
        await base44.asServiceRole.entities.OnboardingPlan.update(plan.id, { organization_id: orgId });
        synced++;
      }
    }

    // Sync Assessments
    const assessments = await base44.asServiceRole.entities.Assessment.filter({ email: targetUser.email });
    for (const assessment of assessments) {
      if (assessment.organization_id !== orgId) {
        await base44.asServiceRole.entities.Assessment.update(assessment.id, { organization_id: orgId });
        synced++;
      }
    }

    return Response.json({ 
      message: `Synced ${synced} records to organization`,
      synced,
      organization_id: orgId
    });

  } catch (error) {
    console.error('Error syncing user organization:', error);
    return Response.json({ 
      error: error.message || 'Failed to sync user organization' 
    }, { status: 500 });
  }
});