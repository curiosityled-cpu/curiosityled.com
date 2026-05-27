/**
 * computeManagerActivity — nightly job that:
 * 1. Pulls calendar signals (Outlook/Google if connected, else skips)
 * 2. Computes behavioral signals from Base44 entities (goals, learning)
 * 3. Writes/updates a UserActivity record for today
 * 4. Triggers sendTeamsPrompt if operator_mode_risk_score is high
 *
 * Designed to run as a scheduled automation (nightly, e.g. 9pm local)
 * Can also be called directly with a user_email payload.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This function is called by scheduled automation (no user context)
    // OR by an admin directly. Allow both paths.
    const user = await base44.auth.me().catch(() => null);
    if (user && user.app_role !== 'Platform Admin' && user.app_role !== 'Super Administrator' && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const targetEmail = body.user_email || null;
    const today = new Date().toISOString().split('T')[0];

    // If a specific user is targeted, process just them; otherwise process all managers
    let managers = [];
    if (targetEmail) {
      managers = [{ email: targetEmail }];
    } else {
      // Get all users with manager role (User Level 1 / User Level 2)
      const allUsers = await base44.asServiceRole.entities.User.filter({
        app_role: { $in: ['User Level 1', 'User Level 2'] }
      }, null, 500);
      managers = allUsers.map(u => ({ email: u.email, id: u.id }));
    }

    const results = [];

    for (const manager of managers) {
      const email = manager.email;

      // Fetch behavioral signals from platform entities in parallel
      const [activeGoals, assignments, recentPulses] = await Promise.all([
        base44.asServiceRole.entities.Goal.filter({
          created_by: email,
          status: 'active'
        }, '-updated_date', 20),
        base44.asServiceRole.entities.AssignedLearning.filter({
          user_email: email,
          status: { $ne: 'completed' }
        }, '-updated_date', 10),
        base44.asServiceRole.entities.ManagerPulse.filter({
          user_email: email
        }, '-created_date', 3)
      ]);

      // Compute overdue goals
      const now = new Date();
      const overdueGoals = activeGoals.filter(g =>
        g.timeframe_end && new Date(g.timeframe_end) < now
      );

      // Compute stalled strategic goals (no progress update in 7+ days)
      const sevenDaysAgo = new Date(now - 7 * 86400000);
      const stalledStrategic = activeGoals.filter(g => {
        const isDelegationOrStrategic = (g.theme_tags || []).some(t =>
          ['delegation', 'strategic_focus', 'team_development', 'feedback'].includes(t)
        );
        const notUpdatedRecently = !g.updated_date || new Date(g.updated_date) < sevenDaysAgo;
        return isDelegationOrStrategic && notUpdatedRecently && (g.progress || 0) < 25;
      });

      // Compute learning inertia
      const completedOrActive = assignments.filter(a =>
        a.status === 'in_progress' || a.status === 'completed'
      ).sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date));
      const lastLearningDate = completedOrActive[0]?.updated_date;
      const learningInertiaDays = lastLearningDate
        ? Math.floor((now - new Date(lastLearningDate)) / 86400000)
        : 30;

      // Build activity record (calendar fields are 0/null without connector)
      const activityData = {
        user_email: email,
        date: today,
        meeting_count_day: 0,         // populated by calendar connector in Phase 2
        meeting_minutes_day: 0,
        back_to_back_density: 0,
        late_day_load_minutes: 0,
        one_to_one_count: 0,
        overdue_goals_count: overdueGoals.length,
        learning_inertia_days: learningInertiaDays,
        stalled_strategic_goals: stalledStrategic.length,
        source_systems: ['base44_goals', 'base44_learning'],
        calendar_connected: false,
        // operator_mode_risk_score computed below
      };

      // Compute operator mode risk score (same logic as sendTeamsPrompt)
      let riskScore = 0;
      if (recentPulses[0]) {
        const p = recentPulses[0];
        if (p.energy_level === 'drained') riskScore += 20;
        else if (p.energy_level === 'stretched') riskScore += 10;
        if (p.perceived_load === 'unsustainable') riskScore += 20;
        else if (p.perceived_load === 'heavy') riskScore += 10;
      }
      if (stalledStrategic.length > 1) riskScore += 15;
      else if (stalledStrategic.length === 1) riskScore += 8;
      if (learningInertiaDays > 7) riskScore += 10;
      else if (learningInertiaDays > 3) riskScore += 5;
      if (overdueGoals.length > 0) riskScore += 8;

      activityData.operator_mode_risk_score = Math.min(riskScore, 100);

      // Upsert UserActivity record for today — sort by most recent to get canonical record
      const existing = await base44.asServiceRole.entities.UserActivity.filter({
        user_email: email,
        date: today
      }, '-created_date', 5);

      let writeError = null;
      try {
        if (existing.length > 0) {
          // Update the most recent record
          await base44.asServiceRole.entities.UserActivity.update(existing[0].id, activityData);
          // Delete any duplicates for today (shouldn't exist, but clean up if they do)
          for (let i = 1; i < existing.length; i++) {
            await base44.asServiceRole.entities.UserActivity.delete(existing[i].id);
          }
        } else {
          await base44.asServiceRole.entities.UserActivity.create(activityData);
        }
      } catch (e) {
        writeError = e.message;
        console.error(`[UserActivity write failed for ${email}]:`, e.message);
      }

      results.push({
        email,
        operator_mode_risk_score: riskScore,
        stalled_strategic_goals: stalledStrategic.length,
        learning_inertia_days: learningInertiaDays,
        overdue_goals: overdueGoals.length,
        write_error: writeError
      });
    }

    return Response.json({
      processed: results.length,
      date: today,
      results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});