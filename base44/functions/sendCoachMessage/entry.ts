import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * sendCoachMessage
 * A coach sends a message to a coachee from within an engagement.
 * Delivers three ways: (1) CoachMessage thread record, (2) Notification to coachee,
 * (3) Email via SendEmail integration.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { engagement_id, body } = await req.json();
    if (!engagement_id || !body) {
      return Response.json({ error: 'engagement_id and body are required' }, { status: 400 });
    }

    // Look up the engagement to get the coachee email
    const engagement = await base44.asServiceRole.entities.CoachingEngagement.get(engagement_id)
      .catch(() => null);
    if (!engagement) {
      return Response.json({ error: 'Engagement not found' }, { status: 404 });
    }
    if (engagement.coach_email !== user.email) {
      return Response.json({ error: 'Only the engagement coach can send messages' }, { status: 403 });
    }

    const coacheeEmail = engagement.coachee_email;
    if (!coacheeEmail) {
      return Response.json({ error: 'Engagement has no coachee email' }, { status: 400 });
    }

    const coachName = user.full_name || user.display_name || user.email;
    const subject = `Message from your coach: ${coachName}`;

    // 1. Create CoachMessage thread record
    const message = await base44.entities.CoachMessage.create({
      engagement_id,
      sender_email: user.email,
      recipient_email: coacheeEmail,
      body,
      channel: 'app',
      subject,
    });

    // 2. Create Notification for the coachee
    await base44.asServiceRole.entities.Notification.create({
      user_email: coacheeEmail,
      type: 'coaching_message',
      title: subject,
      message: body.length > 200 ? body.substring(0, 200) + '...' : body,
      is_read: false,
      scheduled_for: new Date().toISOString(),
      action_url: '/coaching',
      related_entity_type: 'CoachMessage',
      related_entity_id: message.id,
      priority: 'medium',
    }).catch(e => console.warn('Notification create failed:', e?.message));

    // 3. Send email via SendEmail integration
    await base44.integrations.Core.SendEmail({
      to: coacheeEmail,
      subject,
      body: `Hi,\n\n${body}\n\n— ${coachName}\n\nReply to this email to respond to your coach.`,
    }).catch(e => console.warn('Email send failed:', e?.message));

    return Response.json({ success: true, message_id: message.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}