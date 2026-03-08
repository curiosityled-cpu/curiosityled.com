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

    const competitionData = await req.json();

    // Validate required fields
    if (!competitionData.competition_name || !competitionData.competition_type || 
        !competitionData.start_date || !competitionData.end_date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create competition
    const competition = await base44.asServiceRole.entities.Competition.create({
      client_id: user.client_id,
      competition_name: competitionData.competition_name,
      description: competitionData.description,
      competition_type: competitionData.competition_type,
      start_date: competitionData.start_date,
      end_date: competitionData.end_date,
      participant_emails: competitionData.participant_emails || [],
      criteria_config: competitionData.criteria_config || {},
      rewards: competitionData.rewards || [],
      leaderboard_config: competitionData.leaderboard_config || {},
      status: 'upcoming',
      created_by_email: user.email
    });

    // Create notifications for participants (if Notification entity exists)
    if (competitionData.participant_emails?.length) {
      try {
        for (const participantEmail of competitionData.participant_emails) {
          await base44.asServiceRole.entities.Notification.create({
            user_email: participantEmail,
            type: 'milestone',
            title: `New Competition: ${competition.competition_name}`,
            message: competition.description || 'You have been invited to participate in a competition!',
            related_entity_type: 'Competition',
            related_entity_id: competition.id
          });
        }
      } catch (notifError) {
        console.log('Could not create notifications:', notifError.message);
      }
    }

    return Response.json({
      success: true,
      competition
    });

  } catch (error) {
    console.error('Error creating competition:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});