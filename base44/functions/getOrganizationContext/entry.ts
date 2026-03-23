import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    let organization = null;
    if (user.organization_id) {
      const orgs = await base44.asServiceRole.entities.Organization.filter({ id: user.organization_id });
      if (orgs.length > 0) {
        organization = orgs[0];
      }
    }

    // Get organization stats
    let stats = {
      total_users: 0,
      total_goals: 0,
      total_assessments: 0,
      total_learning_assigned: 0,
      total_onboarding_plans: 0
    };

    if (organization) {
      const [users, goals, assessments, learning, plans] = await Promise.all([
        base44.asServiceRole.entities.User.filter({ organization_id: organization.id }),
        base44.asServiceRole.entities.Goal.filter({ organization_id: organization.id }),
        base44.asServiceRole.entities.Assessment.filter({ organization_id: organization.id }),
        base44.asServiceRole.entities.AssignedLearning.filter({ organization_id: organization.id }),
        base44.asServiceRole.entities.OnboardingPlan.filter({ organization_id: organization.id })
      ]);

      stats = {
        total_users: users.length,
        total_goals: goals.length,
        total_assessments: assessments.length,
        total_learning_assigned: learning.length,
        total_onboarding_plans: plans.length
      };
    }

    return Response.json({ 
      organization,
      stats,
      user_role: user.app_role
    });

  } catch (error) {
    console.error('Error getting organization context:', error);
    return Response.json({ 
      error: error.message || 'Failed to get organization context' 
    }, { status: 500 });
  }
});