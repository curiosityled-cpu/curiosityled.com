/**
 * triggerPostMeetingDebrief
 *
 * Called after a calendar meeting ends (via calendar webhook).
 * Triggers a brief reflection prompt: "How did it go? Any shifts in how you felt?"
 * Captures meeting outcome + emotional state delta to track intervention effectiveness.
 *
 * Automation trigger: Google Calendar / Outlook webhook on event.end
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// deno-lint-ignore no-undef
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_data, meeting_title, meeting_duration_minutes } = await req.json();

    // Skip debrief for meetings under 15 minutes
    if (meeting_duration_minutes < 15) {
      return Response.json({ message: 'Meeting too short for debrief' });
    }

    // Skip if meeting is auto-generated or system event
    const skipPatterns = ['reminder', 'sync', 'standup', 'all-hands'];
    const isSystemEvent = skipPatterns.some(p =>
      meeting_title?.toLowerCase().includes(p)
    );

    if (isSystemEvent) {
      return Response.json({ message: 'System event, skipping debrief' });
    }

    // Get tone preference for tone-aware debrief prompt
    const tonePrefs = await base44.entities.TonePreference.filter(
      { user_email: user.email },
      null,
      1
    ).catch(() => []);

    const tonePref = tonePrefs[0]?.tone_mode || 'warm_candid';

    // Create notification for debrief
    const now = new Date();
    // Schedule debrief 2 minutes after meeting end
    const debrief_time = new Date(now.getTime() + 2 * 60000);

    await base44.entities.Notification.create({
      user_email: user.email,
      type: 'nudge',
      priority: 'medium',
      title: 'Quick Debrief',
      message: `That meeting with "${meeting_title}" just wrapped. What shifted? Did you feel more energized, drained, or uncertain?`,
      scheduled_for: debrief_time.toISOString(),
      related_entity_type: 'ManagerPulse',
      metadata: {
        debrief_type: 'post_meeting',
        meeting_title,
        meeting_duration: meeting_duration_minutes,
        tone_mode: tonePref,
      },
    }).catch(() => {});

    // Also log this meeting context for later trend analysis
    await base44.entities.UserActivity.filter(
      { user_email: user.email, date: new Date().toISOString().split('T')[0] },
      null,
      1
    ).then(async records => {
      if (records.length > 0) {
        // Update existing activity record with meeting metadata
        await base44.entities.UserActivity.update(records[0].id, {
          source_systems: [...(records[0].source_systems || []), 'post_meeting_debrief'],
        }).catch(() => {});
      }
    }).catch(() => {});

    return Response.json({
      status: 'debrief_scheduled',
      scheduled_for: debrief_time.toISOString(),
      meeting_title,
      tone_mode: tonePref,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});