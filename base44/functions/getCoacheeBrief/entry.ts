import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * getCoacheeBrief
 * Assembles a 360 brief for a coachee from existing entities, scoped to the
 * calling coach's active engagement with that coachee. Read-only aggregation.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { coachee_email } = await req.json();
    if (!coachee_email) return Response.json({ error: 'coachee_email is required' }, { status: 400 });

    // Verify the coach has an active engagement with this coachee
    const engagements = await base44.asServiceRole.entities.CoachingEngagement.filter(
      { coach_email: user.email },
      '-created_date',
      200
    );
    const hasAccess = engagements.some(e =>
      e.coachee_email === coachee_email ||
      (e.team_member_emails || []).includes(coachee_email)
    );
    if (!hasAccess) {
      return Response.json({ error: 'No active engagement with this coachee' }, { status: 403 });
    }

    const coacheeEmail = coachee_email;

    // Fetch coachee data in parallel (service role — coachee data is RLS-locked to coachee)
    const [checkIns, trends, goals, decisions, sessions] = await Promise.all([
      base44.asServiceRole.entities.DailyCheckIn.filter(
        { user_email: coacheeEmail }, '-check_in_date', 14
      ).catch(() => []),
      base44.asServiceRole.entities.ManagerTrends.filter(
        { user_email: coacheeEmail }, '-last_trend_computed_at', 1
      ).catch(() => []),
      base44.asServiceRole.entities.Goal.list('-updated_date', 50).catch(() => []),
      base44.asServiceRole.entities.DecisionJournal.filter(
        { user_email: coacheeEmail }, '-created_date', 5
      ).catch(() => []),
      base44.asServiceRole.entities.CoachingSession.filter(
        { coach_email: user.email, coachee_email: coacheeEmail, status: 'completed' },
        '-scheduled_date',
        1
      ).catch(() => []),
    ]);

    // Filter goals to those assigned to or created by the coachee
    const coacheeGoals = goals.filter(g =>
      g.assigned_to_emails?.includes(coacheeEmail) ||
      g.coach_email === user.email && g.assigned_to_emails?.includes(coacheeEmail)
    ).slice(0, 10);

    // Compute pulse summary from recent check-ins
    const pulseSummary = checkIns.length > 0 ? {
      data_points: checkIns.length,
      avg_energy: avg(checkIns.map(c => c.energy_score).filter(Boolean)),
      avg_confidence: avg(checkIns.map(c => c.confidence_score).filter(Boolean)),
      avg_load: avg(checkIns.map(c => c.load_score).filter(Boolean)),
      avg_growth: avg(checkIns.map(c => c.growth_score).filter(Boolean)),
      latest_date: checkIns[0]?.check_in_date,
    } : null;

    const brief = {
      coachee_email: coacheeEmail,
      pulse: pulseSummary,
      trends: trends[0] || null,
      goals: coacheeGoals.map(g => ({
        id: g.id,
        title: g.title,
        status: g.status,
        progress: g.progress,
        goal_type: g.goal_type,
      })),
      decisions: decisions.map(d => ({
        id: d.id,
        decision_text: d.decision_text,
        status: d.status,
        confidence: d.confidence,
        created_date: d.created_date,
      })),
      last_session: sessions[0] ? {
        id: sessions[0].id,
        title: sessions[0].title,
        scheduled_date: sessions[0].scheduled_date,
        session_notes: sessions[0].session_notes,
        progress_rating: sessions[0].progress_rating,
        engagement_rating: sessions[0].engagement_rating,
      } : null,
    };

    return Response.json({ brief });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function avg(arr) {
  if (!arr || arr.length === 0) return null;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
}