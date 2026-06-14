/**
 * scheduleWeeklyReflection
 *
 * Scheduled automation that runs every Friday at 4pm (user's timezone)
 * Sends a notification to prompt weekly reflection
 * Also captures intent/actuals gap analysis
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create Friday reflection notification
    const notification = await base44.asServiceRole.entities.Notification.create({
      user_email: user.email,
      type: 'atreus_checkin',
      title: 'Weekly Focus Reflection',
      message: 'Take 5 minutes to reflect on this week: What went well? What surprised you? What did you learn?',
      scheduled_for: new Date().toISOString(),
      status: 'pending',
      priority: 'medium'
    });

    // Compute focus outcome (intent vs. actuals)
    const pulses = await base44.asServiceRole.entities.ManagerPulse.filter(
      { user_email: user.email },
      '-created_date',
      28
    );

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weekPulses = pulses.filter(p => new Date(p.created_date) >= sevenDaysAgo);

    const intentions = weekPulses.filter(p => p.prompt_type === 'morning_intent').length;
    const actuals = weekPulses.filter(p => p.prompt_type === 'evening_actuals').length;
    const gaps = weekPulses.filter(p => p.intent_actuals_gap && p.intent_actuals_gap !== 'no_gap_detected').length;

    return Response.json({
      success: true,
      notification_id: notification.id,
      week_summary: {
        intentions_logged: intentions,
        actuals_logged: actuals,
        gaps_detected: gaps,
        message: `This week: ${intentions} intentions, ${actuals} actuals, ${gaps} gaps`
      }
    });

  } catch (error) {
    console.error('Error scheduling weekly reflection:', error);
    return Response.json(
      { error: error.message, success: false },
      { status: 500 }
    );
  }
});