import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { onboarding_plan_id, milestone_index } = await req.json();

    if (!onboarding_plan_id || milestone_index === undefined) {
      return Response.json({ error: 'onboarding_plan_id and milestone_index are required' }, { status: 400 });
    }

    // Get the onboarding plan
    const plans = await base44.asServiceRole.entities.OnboardingPlan.filter({ id: onboarding_plan_id });

    if (plans.length === 0) {
      return Response.json({ error: 'Onboarding plan not found' }, { status: 404 });
    }

    const plan = plans[0];

    // Security: Only the assigned user, their manager, or an admin can complete milestones.
    // Derive manager relationship server-side — never trust self-editable subordinate_emails.
    const isAssignee = plan.assigned_to_email === user.email;
    const isAdmin = ['Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Platform Admin'].includes(user.app_role);
    let isManager = false;
    if (!isAssignee && !isAdmin && ['User Level 2', 'User Level 3'].includes(user.app_role)) {
      const directReports = await base44.asServiceRole.entities.User.filter({ manager_email: user.email });
      const subordinateEmails = new Set(directReports.map(u => (u.email || '').toLowerCase()));
      isManager = subordinateEmails.has((plan.assigned_to_email || '').toLowerCase());
    }
    if (!isAssignee && !isAdmin && !isManager) {
      return Response.json({ error: 'You do not have permission to complete milestones for this plan.' }, { status: 403 });
    }

    const milestones = plan.milestones || [];
    
    if (milestone_index >= milestones.length) {
      return Response.json({ error: 'Invalid milestone index' }, { status: 400 });
    }

    const milestone = milestones[milestone_index];

    // Idempotency: skip if the milestone is already completed (prevents
    // re-awarding points on repeated calls).
    if (milestone.status === 'completed') {
      const completedCount = milestones.filter(m => m.status === 'completed').length;
      const completionPercentage = Math.round((completedCount / milestones.length) * 100);
      return Response.json({
        success: true,
        milestone,
        already_completed: true,
        points_awarded: 0,
        completion_percentage: completionPercentage
      });
    }

    // Update milestone status
    milestones[milestone_index] = {
      ...milestone,
      status: 'completed'
    };

    // Calculate completion percentage
    const completedCount = milestones.filter(m => m.status === 'completed').length;
    const completionPercentage = Math.round((completedCount / milestones.length) * 100);

    await base44.asServiceRole.entities.OnboardingPlan.update(onboarding_plan_id, {
      milestones,
      completion_percentage: completionPercentage
    });

    // Award gamification points
    const pointsConfig = plan.milestone_points_config || {};
    const milestonePoints = pointsConfig[milestone.type] || 100;

    try {
      await base44.asServiceRole.functions.invoke('awardPoints', {
        internal_secret: Deno.env.get('INTERNAL_FUNCTION_SECRET'),
        user_email: plan.assigned_to_email,
        points_amount: milestonePoints,
        transaction_type: 'earned_activity',
        reason: `Completed onboarding milestone: ${milestone.title}`,
        related_entity_type: 'OnboardingPlan',
        related_entity_id: onboarding_plan_id,
        client_id: plan.client_id
      });
    } catch (gamificationError) {
      console.log('Gamification award failed (non-critical):', gamificationError.message);
    }

    return Response.json({
      success: true,
      milestone,
      points_awarded: milestonePoints,
      completion_percentage: completionPercentage
    });

  } catch (error) {
    console.error('Error completing milestone:', error);
    return Response.json({ error: 'Failed to complete milestone.' }, { status: 500 });
  }
});