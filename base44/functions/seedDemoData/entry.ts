import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let clientId = user.client_id;

    // If user is a Platform Admin and no client_id provided, create/use demo client
    if (!clientId && user.app_role === 'Platform Admin') {
      const demoClients = await base44.asServiceRole.entities.Client.filter({ slug: 'demo-client' });
      
      if (demoClients.length === 0) {
        const demoClient = await base44.asServiceRole.entities.Client.create({
          name: 'Demo Client Organization',
          slug: 'demo-client',
          type: 'direct_customer',
          status: 'trial',
          industry: 'Technology',
          company_size: '51-200',
          contact_name: 'Demo Contact',
          contact_email: 'demo@example.com',
          license_count: 50,
          settings: {
            allow_custom_competencies: true,
            allow_custom_assessments: true,
            allow_custom_learning: true,
            include_leadership_index: true,
            enable_industry_benchmarks: true,
            default_new_user_role: 'User Level 1'
          }
        });
        clientId = demoClient.id;
      } else {
        clientId = demoClients[0].id;
      }

      // Update current user to be part of demo client if they weren't
      if (!user.client_id) {
        await base44.asServiceRole.entities.User.update(user.id, {
          client_id: clientId
        });
      }
    }

    if (!clientId) {
      return Response.json({ error: 'User must be assigned to a client' }, { status: 400 });
    }

    // Create demo goals
    const demoGoals = [
      {
        client_id: clientId,
        user_email: user.email,
        title: 'Improve Team Communication',
        description: 'Implement weekly team sync meetings and improve documentation',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        completion_percentage: 40,
        category: 'people',
        status: 'active'
      },
      {
        client_id: clientId,
        user_email: user.email,
        title: 'Complete Leadership Training',
        description: 'Finish the advanced leadership certification program',
        due_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        completion_percentage: 65,
        category: 'development',
        status: 'active'
      },
      {
        client_id: clientId,
        user_email: user.email,
        title: 'Q4 Revenue Target',
        description: 'Achieve $2M in quarterly revenue',
        due_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        completion_percentage: 75,
        category: 'strategic',
        status: 'active'
      }
    ];

    const createdGoals = [];
    for (const goalData of demoGoals) {
      const goal = await base44.entities.Goal.create(goalData);
      createdGoals.push(goal);
    }

    // Create demo assigned learning
    const learningResources = await base44.entities.LearningResource.list();
    const demoLearning = [];

    if (learningResources.length > 0) {
      for (let i = 0; i < Math.min(3, learningResources.length); i++) {
        const resource = learningResources[i];
        const learning = await base44.entities.AssignedLearning.create({
          client_id: clientId,
          user_email: user.email,
          learning_resource_id: resource.id,
          assigned_by: user.email,
          title: resource.title,
          description: `Complete this learning resource to enhance your leadership skills`,
          priority: ['high', 'medium', 'low'][i % 3],
          status: ['assigned', 'started', 'in_progress'][i % 3]
        });
        demoLearning.push(learning);
      }
    }

    // Create demo onboarding plan
    const onboardingPlan = await base44.entities.OnboardingPlan.create({
      client_id: clientId,
      title: 'Leadership Onboarding - First 90 Days',
      assigned_to_email: user.email,
      assigned_by: user.email,
      status: 'in_progress',
      target_role: user.current_role || 'Team Leader',
      duration_days: 90,
      description: 'Comprehensive onboarding plan for new leaders',
      ai_generated: false,
      completion_percentage: 33,
      milestones: [
        {
          title: 'Complete Initial Orientation',
          description: 'Meet with HR and complete all required paperwork',
          due_day: 7,
          status: 'completed',
          phase: 'first_30',
          phase_label: 'Learn & Listen',
          type: 'orientation'
        },
        {
          title: 'One-on-Ones with Direct Reports',
          description: 'Schedule and complete introductory meetings with each team member',
          due_day: 14,
          status: 'completed',
          phase: 'first_30',
          phase_label: 'Learn & Listen',
          type: 'team_intro'
        },
        {
          title: 'Establish Team Goals',
          description: 'Work with team to define and document quarterly objectives',
          due_day: 30,
          status: 'in_progress',
          phase: 'first_30',
          phase_label: 'Learn & Listen',
          type: 'priority'
        },
        {
          title: 'Implement Weekly Team Meetings',
          description: 'Establish regular cadence for team synchronization',
          due_day: 45,
          status: 'not_started',
          phase: 'next_30',
          phase_label: 'Contribute & Collaborate',
          type: 'priority'
        },
        {
          title: 'Complete First Performance Reviews',
          description: 'Conduct performance discussions with all direct reports',
          due_day: 60,
          status: 'not_started',
          phase: 'next_30',
          phase_label: 'Contribute & Collaborate',
          type: 'project'
        },
        {
          title: 'Leadership Development Plan',
          description: 'Create personalized development plan based on assessment results',
          due_day: 90,
          status: 'not_started',
          phase: 'final_30',
          phase_label: 'Lead & Optimize',
          type: 'learning'
        }
      ]
    });

    return Response.json({
      message: 'Demo data created successfully',
      client_id: clientId,
      goals_created: createdGoals.length,
      learning_assigned: demoLearning.length,
      onboarding_plan_created: true,
      data: {
        goals: createdGoals.map(g => ({ id: g.id, title: g.title })),
        learning: demoLearning.map(l => ({ id: l.id, title: l.title })),
        onboarding_plan: { id: onboardingPlan.id, title: onboardingPlan.title }
      }
    });

  } catch (error) {
    console.error('Error seeding demo data:', error);
    return Response.json({
      error: error.message || 'Failed to seed demo data',
      details: error.stack
    }, { status: 500 });
  }
});