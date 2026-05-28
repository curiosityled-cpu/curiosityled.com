/**
 * trackFollowThrough — closed-loop reinforcement: observe when manager acts on recommendations.
 *
 * Compare intent vs actuals, then score whether manager followed through on earlier coaching.
 * Example: "Last week you said you'd delegate. Did you actually delegate this week?"
 *
 * Triggered by computeEveningActuals or manual check-in review.
 * Creates FollowThroughRecord to track coaching effectiveness over time.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { manager_email, recommendation_from_pulse_id, current_activity } = body;

    if (!manager_email || !recommendation_from_pulse_id) {
      return Response.json({ error: 'manager_email and recommendation_from_pulse_id required' }, { status: 400 });
    }

    // Fetch the original recommendation pulse
    const origPulse = await base44.asServiceRole.entities.ManagerPulse.filter(
      { id: recommendation_from_pulse_id }, null, 1
    );

    if (!origPulse.length) {
      return Response.json({ error: 'Recommendation pulse not found' }, { status: 404 });
    }

    const rec = origPulse[0];
    const recommendationType = rec.prompt_type; // e.g., 'overload_check', 'morning_intent'
    const recommendedAction = rec.focus_category; // e.g., 'delegation', 'strategic_work'

    // Fetch current activity to assess if manager followed through
    const activity = current_activity || await base44.asServiceRole.entities.UserActivity.filter(
      { user_email: manager_email }, '-date', 1
    ).then(a => a[0]);

    let followThroughScore = 0;
    let followThroughStatus = 'no_action';

    // Score based on recommendation type and activity signals
    if (recommendedAction === 'delegation') {
      // Delegation follow-through: check if operator mode risk decreased
      const currentRisk = activity?.operator_mode_risk_score || 0;
      if (currentRisk < 40) {
        followThroughStatus = 'completed';
        followThroughScore = 100;
      } else if (currentRisk < 60) {
        followThroughStatus = 'partial';
        followThroughScore = 60;
      } else {
        followThroughStatus = 'no_action';
        followThroughScore = 0;
      }
    } else if (recommendedAction === 'strategic_work') {
      // Strategic work: check if manager had protected focus time (meeting minutes down, goals moved)
      const meetingMinutes = activity?.meeting_minutes_day || 0;
      const stalledGoals = activity?.stalled_strategic_goals || 0;
      if (meetingMinutes < 180 && stalledGoals === 0) {
        followThroughStatus = 'completed';
        followThroughScore = 100;
      } else if (meetingMinutes < 240) {
        followThroughStatus = 'partial';
        followThroughScore = 50;
      } else {
        followThroughStatus = 'no_action';
        followThroughScore = 0;
      }
    } else if (recommendedAction === 'team_support') {
      // Team support: check if 1:1 happened
      const daysSince1on1 = activity?.days_since_last_1on1 || 999;
      if (daysSince1on1 <= 7) {
        followThroughStatus = 'completed';
        followThroughScore = 100;
      } else if (daysSince1on1 <= 14) {
        followThroughStatus = 'partial';
        followThroughScore = 50;
      } else {
        followThroughStatus = 'no_action';
        followThroughScore = 0;
      }
    }

    // Create follow-through record (if entity exists)
    try {
      await base44.asServiceRole.entities.FollowThroughRecord?.create({
        manager_email,
        recommendation_pulse_id: recommendation_from_pulse_id,
        recommendation_type: recommendationType,
        recommended_action: recommendedAction,
        follow_through_status: followThroughStatus,
        follow_through_score: followThroughScore,
        observed_at: new Date().toISOString()
      });
    } catch (e) {
      // Entity doesn't exist yet — will be created in schema
    }

    return Response.json({
      success: true,
      manager_email,
      recommendation_type: recommendationType,
      recommended_action: recommendedAction,
      follow_through_status: followThroughStatus,
      follow_through_score: followThroughScore,
      message: `Manager ${followThroughStatus === 'completed' ? 'completed' : followThroughStatus === 'partial' ? 'partially acted on' : 'did not act on'} recommendation for ${recommendedAction}`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});