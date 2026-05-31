// deno-lint-ignore-file no-undef
/**
 * triggerPostMeetingDebrief
 * Called after a calendar meeting ends via calendar webhook.
 * Triggers a brief reflection prompt.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meeting_title, meeting_duration_minutes } = await req.json();

    if (meeting_duration_minutes < 15) {
      return Response.json({ message: 'Meeting too short for debrief' });
    }

    const skipPatterns = ['reminder', 'sync', 'standup', 'all-hands'];
    if (skipPatterns.some(p => meeting_title?.toLowerCase().includes(p))) {
      return Response.json({ message: 'System event, skipping debrief' });
    }

    const tonePrefs = await base44.entities.TonePreference.filter({ user_email: user.email }, null, 1).catch(() => []);
    const tonePref = tonePrefs[0]?.tone_mode || 'warm_candid';

    const now = new Date();
    const debrief_time = new Date(now.getTime() + 2 * 60000);

    await base44.entities.Notification.create({
      user_email: user.email,
      type: 'nudge',
      priority: 'medium',
      title: 'Quick Debrief',
      message: `That meeting "${meeting_title}" just wrapped. What shifted? Did you feel more energized, drained, or uncertain?`,
      scheduled_for: debrief_time.toISOString(),
      related_entity_type: 'ManagerPulse',
    }).catch(() => {});

    await base44.entities.UserActivity.filter(
      { user_email: user.email, date: now.toISOString().split('T')[0] }, null, 1
    ).then(async records => {
      if (records.length > 0) {
        await base44.entities.UserActivity.update(records[0].id, {
          source_systems: [...(records[0].source_systems || []), 'post_meeting_debrief'],
        }).catch(() => {});
      }
    }).catch(() => {});

    return Response.json({ status: 'debrief_scheduled', scheduled_for: debrief_time.toISOString(), meeting_title, tone_mode: tonePref });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});