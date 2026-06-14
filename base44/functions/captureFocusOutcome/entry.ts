/**
 * captureFocusOutcome
 *
 * End-of-week reflection on:
 * - What you intended (from morning intents throughout the week)
 * - What actually happened (from evening actuals)
 * - Gap analysis (where intention met reality vs. diverged)
 * - Insights on behavioral patterns
 *
 * Creates a narrative summary for the week + flags recurring gaps.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch last 7 days of pulses
    const pulses = await base44.asServiceRole.entities.ManagerPulse.filter(
      { user_email: user.email },
      '-created_date',
      28
    );

    // Filter to last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weekPulses = pulses.filter(p => new Date(p.created_date) >= sevenDaysAgo);

    // Extract intentions and outcomes
    const intentions = weekPulses.filter(p => p.prompt_type === 'morning_intent');
    const actuals = weekPulses.filter(p => p.prompt_type === 'evening_actuals');
    const gaps = weekPulses.filter(p => p.intent_actuals_gap && p.intent_actuals_gap !== 'no_gap_detected');

    // Build summary
    let summary = '';
    const insights = [];

    if (intentions.length === 0) {
      summary = 'You didn\'t log morning intentions this week. Starting next week, try declaring one focus area each morning.';
    } else if (actuals.length === 0) {
      summary = 'You set intentions but didn\'t capture how the day actually went. Evening reflections help close the loop.';
    } else {
      const intentionRate = Math.round((actuals.length / intentions.length) * 100);
      const gapRate = Math.round((gaps.length / Math.max(actuals.length, 1)) * 100);

      summary = `This week: ${intentions.length} morning intentions, ${actuals.length} evening reflections, ${gaps.length} gaps detected.`;

      if (gapRate > 50) {
        insights.push('Your declared intentions often diverged from what actually happened — explore why.');
      } else if (gapRate > 0) {
        insights.push('You hit most of your intentions, but some days didn\'t go as planned. Notice the pattern.');
      } else {
        insights.push('Strong alignment between intention and action this week.');
      }

      // Analyze gap types
      const delegationGaps = gaps.filter(g => g.intent_actuals_gap === 'declared_delegation_operator_mode_detected').length;
      const tacticalgaps = gaps.filter(g => g.intent_actuals_gap === 'declared_strategic_tactical_overload_detected').length;

      if (delegationGaps > 0) {
        insights.push(`You intended to delegate but ended up hands-on ${delegationGaps} times. Worth exploring why.`);
      }
      if (tacticalgaps > 0) {
        insights.push(`You got pulled into tactical work ${tacticalgaps} times when you wanted to stay strategic.`);
      }
    }

    // Create a weekly reflection record
    const reflection = {
      user_email: user.email,
      week_ending: new Date().toISOString().split('T')[0],
      summary,
      insights,
      intentions_count: intentions.length,
      actuals_count: actuals.length,
      gaps_count: gaps.length,
      gap_rate: intentions.length > 0 ? Math.round((gaps.length / intentions.length) * 100) : 0
    };

    // Store as a notification for user visibility
    await base44.asServiceRole.entities.Notification.create({
      user_email: user.email,
      type: 'atreus_checkin',
      title: 'Weekly Focus Reflection',
      message: `${summary} ${insights.length > 0 ? insights[0] : ''}`,
      scheduled_for: new Date().toISOString(),
      status: 'pending',
      priority: 'medium'
    });

    return Response.json({
      success: true,
      reflection,
      data_points: weekPulses.length
    });

  } catch (error) {
    console.error('Error capturing focus outcome:', error);
    return Response.json(
      { error: error.message, success: false },
      { status: 500 }
    );
  }
});