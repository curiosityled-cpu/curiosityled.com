// deno-lint-ignore-file no-undef
/**
 * wirePostMeetingDebrief
 * Automation setup to subscribe to calendar webhooks for post-meeting debriefs.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await base44.asServiceRole.entities.Automation.filter(
      { name: 'Post-Meeting Debrief', user_email: user.email }, null, 1
    ).catch(() => []);

    if (existing.length > 0) {
      return Response.json({ status: 'already_wired', automation_id: existing[0].id });
    }

    const automation = await base44.asServiceRole.entities.Automation.create({
      name: 'Post-Meeting Debrief',
      description: 'Prompts brief reflection after calendar meetings end',
      trigger_type: 'calendar_event',
      trigger_config: { providers: ['google_calendar', 'outlook'], event_type: 'end', min_duration_minutes: 15 },
      actions: [{ action_type: 'invoke_function', action_config: { function_name: 'triggerPostMeetingDebrief', pass_event_data: true } }],
      status: 'active',
      user_email: user.email,
    }).catch(() => null);

    if (!automation) {
      return Response.json({ status: 'wiring_attempted', message: 'Automation may not be supported in this version' });
    }

    return Response.json({ status: 'wired', automation_id: automation.id, automation_name: automation.name, message: 'Post-meeting debrief is now active for calendar events' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});