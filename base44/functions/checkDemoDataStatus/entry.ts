import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for demo data across key entities
    const [demoUsers, demoAssessments, demoGoals, demoLearning, demoCohorts, demoPlans] = await Promise.all([
      base44.asServiceRole.entities.User.filter({ is_demo: true }, '', 1),
      base44.asServiceRole.entities.Assessment.filter({ is_demo: true }, '', 1),
      base44.asServiceRole.entities.Goal.filter({ is_demo: true }, '', 1),
      base44.asServiceRole.entities.AssignedLearning.filter({ is_demo: true }, '', 1),
      base44.asServiceRole.entities.Cohort.filter({ is_demo: true }, '', 1),
      base44.asServiceRole.entities.OnboardingPlan.filter({ is_demo: true }, '', 1)
    ]);

    const hasDemoData = 
      demoUsers.length > 0 ||
      demoAssessments.length > 0 ||
      demoGoals.length > 0 ||
      demoLearning.length > 0 ||
      demoCohorts.length > 0 ||
      demoPlans.length > 0;

    // Count total demo records
    let totalDemoRecords = 0;
    if (hasDemoData) {
      const [allDemoUsers, allDemoAssessments, allDemoGoals, allDemoLearning, allDemoCohorts, allDemoPlans, allDemoNotifications, allDemoLogs] = await Promise.all([
        base44.asServiceRole.entities.User.filter({ is_demo: true }),
        base44.asServiceRole.entities.Assessment.filter({ is_demo: true }),
        base44.asServiceRole.entities.Goal.filter({ is_demo: true }),
        base44.asServiceRole.entities.AssignedLearning.filter({ is_demo: true }),
        base44.asServiceRole.entities.Cohort.filter({ is_demo: true }),
        base44.asServiceRole.entities.OnboardingPlan.filter({ is_demo: true }),
        base44.asServiceRole.entities.Notification.filter({ is_demo: true }),
        base44.asServiceRole.entities.ActivityLog.filter({ is_demo: true })
      ]);

      totalDemoRecords = 
        allDemoUsers.length +
        allDemoAssessments.length +
        allDemoGoals.length +
        allDemoLearning.length +
        allDemoCohorts.length +
        allDemoPlans.length +
        allDemoNotifications.length +
        allDemoLogs.length;
    }

    return Response.json({
      has_demo_data: hasDemoData,
      total_demo_records: totalDemoRecords,
      breakdown: hasDemoData ? {
        users: demoUsers.length > 0,
        assessments: demoAssessments.length > 0,
        goals: demoGoals.length > 0,
        learning: demoLearning.length > 0,
        cohorts: demoCohorts.length > 0,
        plans: demoPlans.length > 0
      } : null
    });

  } catch (error) {
    console.error('Error checking demo data status:', error);
    return Response.json({
      error: error.message || 'Failed to check demo data status',
      details: error.stack
    }, { status: 500 });
  }
});