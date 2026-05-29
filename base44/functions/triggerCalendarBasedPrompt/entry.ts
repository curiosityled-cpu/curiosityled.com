/**
 * triggerCalendarBasedPrompt
 *
 * Triggered by calendar automation (Outlook/Google Calendar webhooks).
 * Detects patterns:
 * - Pre-difficult meeting: high-stakes 1:1, performance review, reorg announcement
 * - Post-skipped-1:1: manager canceled recurring 1:1
 * - Post-back-to-back: heavy meeting day detected
 *
 * Creates proactive prompts via Teams/notifications.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const {
      event_type = 'meeting_detected', // 'difficult_meeting_upcoming', '1:1_skipped', 'heavy_day_detected'
      event_data = {}
    } = payload;

    let prompt = '';
    let notificationTitle = '';

    if (event_type === 'difficult_meeting_upcoming') {
      // 30 min before high-stakes meeting
      const meetingTitle = event_data.title || 'this meeting';
      notificationTitle = `Prep for ${meetingTitle}`;
      prompt = `You have ${meetingTitle} coming up in about 30 minutes. How are you feeling? Any concerns you want to work through beforehand?`;
    } else if (event_type === '1:1_skipped') {
      // Your manager just canceled your recurring 1:1
      notificationTitle = 'Your 1:1 was cancelled';
      prompt = `Your 1:1 with your manager just got cancelled. How does that land? Any topics you wanted to cover, or is it a relief?`;
    } else if (event_type === 'heavy_day_detected') {
      // End of heavy meeting day
      notificationTitle = 'Heavy meeting day';
      prompt = `You have back-to-back meetings most of the day. Check in at end of day: how's your energy? Any decisions that felt rushed?`;
    }

    // Create a proactive notification
    const notification = await base44.asServiceRole.entities.Notification.create({
      user_email: user.email,
      type: 'atreus_checkin',
      title: notificationTitle,
      message: prompt,
      scheduled_for: new Date().toISOString(),
      status: 'pending',
      priority: event_type === 'difficult_meeting_upcoming' ? 'high' : 'medium'
    });

    return Response.json({
      success: true,
      notification_id: notification.id,
      prompt,
      event_type
    });

  } catch (error) {
    console.error('Error triggering calendar prompt:', error);
    return Response.json(
      { error: error.message, success: false },
      { status: 500 }
    );
  }
});