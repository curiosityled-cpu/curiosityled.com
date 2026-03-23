import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { journey_id, user_email } = await req.json();
    const targetUserEmail = user_email || user.email;

    if (!journey_id) {
      return Response.json({ error: 'journey_id is required' }, { status: 400 });
    }

    // Get the journey
    const journeys = await base44.asServiceRole.entities.LearningJourney.filter({ id: journey_id });

    if (journeys.length === 0) {
      return Response.json({ error: 'Journey not found' }, { status: 404 });
    }

    const journey = journeys[0];

    // Award gamification points
    try {
      await base44.asServiceRole.functions.invoke('awardPoints', {
        user_email: targetUserEmail,
        points_amount: journey.points_value || 300,
        transaction_type: 'earned_activity',
        reason: `Completed learning journey: ${journey.title}`,
        related_entity_type: 'LearningJourney',
        related_entity_id: journey_id,
        client_id: journey.client_id
      });
    } catch (gamificationError) {
      console.log('Gamification award failed (non-critical):', gamificationError.message);
    }

    // Award completion badge if configured
    if (journey.completion_badge_id) {
      try {
        await base44.asServiceRole.functions.invoke('awardBadge', {
          user_email: targetUserEmail,
          badge_template_id: journey.completion_badge_id,
          awarded_by_email: 'system'
        });
      } catch (badgeError) {
        console.log('Badge award failed (non-critical):', badgeError.message);
      }
    }

    return Response.json({
      success: true,
      journey,
      points_awarded: journey.points_value || 300,
      badge_awarded: !!journey.completion_badge_id
    });

  } catch (error) {
    console.error('Error completing journey:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});