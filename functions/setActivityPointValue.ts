import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin check
    const adminRoles = ['Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Platform Admin', 'Partner Business Administrator'];
    if (!adminRoles.includes(user.app_role)) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { entity_type, entity_id, points_value } = await req.json();

    if (!entity_type || !entity_id || points_value === undefined) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update the entity's points_value field
    const entityMap = {
      'LearningResource': 'LearningResource',
      'Goal': 'Goal',
      'Assessment': 'Assessment',
      'CoachingSession': 'CoachingSession',
      'AssignedLearning': 'AssignedLearning',
      'ConversationalLearningModule': 'ConversationalLearningModule',
      'LearningJourney': 'LearningJourney',
      'Program': 'Program',
      'Cohort': 'Cohort',
      'Class': 'Class',
      'OnboardingPlan': 'OnboardingPlan',
      'Certification': 'Certification'
    };

    const entityName = entityMap[entity_type];
    if (!entityName) {
      return Response.json({ error: 'Invalid entity_type' }, { status: 400 });
    }

    // Update the entity
    await base44.asServiceRole.entities[entityName].update(entity_id, {
      points_value
    });

    return Response.json({
      success: true,
      entity_type,
      entity_id,
      points_value
    });

  } catch (error) {
    console.error('Error setting activity point value:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});