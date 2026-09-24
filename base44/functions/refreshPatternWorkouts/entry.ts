/**
 * refreshPatternWorkouts — nightly workout refresh loop.
 *
 * For each eligible user (ManagerTrends updated in the last 7 days):
 *   1. Build pattern briefs from their trends + at-risk goals.
 *   2. Diff against their active workout recommendations.
 *   3. Expire stale workouts (pattern quiet or 7-day unstarted).
 *   4. Generate at most 1 new workout per run (cap active at 3).
 *
 * Runs as the service role (no user context from the scheduler). If invoked
 * directly by a logged-in non-admin user, returns 403 to prevent abuse.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { generateWorkoutModule, attachAssets, WORKOUT_DEFAULTS } from '../../shared/workoutGenerator.ts';
import { buildPatternBriefs, diffActiveWorkouts } from '../../shared/patternBriefs.ts';
import { authorizeScheduledTask } from '../../shared/scheduledTaskAuth.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    // Security: Only internal automation or admin may invoke scheduled tasks.
    const _auth = await authorizeScheduledTask(req, base44);
    if (!_auth.authorized) return _auth.response;

    const svc = base44.asServiceRole;
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    // Eligible users: those with a ManagerTrends record updated in the last 7 days
    let allTrends: any[] = [];
    try {
      allTrends = await svc.entities.ManagerTrends.list('-last_trend_computed_at', 500);
    } catch (e) {
      console.error('[refreshPatternWorkouts] Failed to list trends:', e);
      return Response.json({ error: 'Failed to load trends' }, { status: 500 });
    }

    const eligible = allTrends.filter((t) =>
      t.user_email &&
      t.last_trend_computed_at &&
      new Date(t.last_trend_computed_at) >= sevenDaysAgo,
    );

    let created = 0;
    let expired = 0;
    let usersProcessed = 0;

    for (const trends of eligible) {
      try {
        const userEmail = trends.user_email;

        // Fetch the user's active goals (for at-risk / task briefs)
        let goals: any[] = [];
        try {
          goals = await svc.entities.Goal.filter({ created_by: userEmail, status: 'active' }, '-created_date', 20);
        } catch { goals = []; }

        // Load workout preferences (refresh frequency, caps, type filter)
        let workoutPrefs: any = {};
        try {
          const prefs = await svc.entities.UserPreference.filter({ user_email: userEmail }, null, 1);
          workoutPrefs = prefs[0]?.workout_preferences || {};
        } catch { /* defaults */ }

        const refreshFreq = workoutPrefs.refresh_frequency || 'nightly';
        // Respect refresh frequency by day of week (America/New_York)
        const etWeekday = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short' }).format(new Date());
        if (refreshFreq === 'manual') continue;
        if (refreshFreq === 'weekly' && etWeekday !== 'Mon') continue;
        if (refreshFreq === 'twice_weekly' && etWeekday !== 'Mon' && etWeekday !== 'Thu') continue;

        const maxActive = workoutPrefs.max_active_workouts || 3;
        const expiryDays = workoutPrefs.unstarted_expiry_days || 7;
        const prefType = workoutPrefs.preferred_workout_type || 'both';

        const userObj = { email: userEmail, app_role: 'manager' };
        let briefs = await buildPatternBriefs(svc, userObj, trends, goals);
        if (prefType === 'skill') briefs = briefs.filter((b) => b.type === 'skill');
        if (prefType === 'task') briefs = briefs.filter((b) => b.type === 'task');
        if (briefs.length === 0) continue;

        const diff = await diffActiveWorkouts(svc, userEmail, briefs, { maxActive, unstartedExpiryDays: expiryDays });

        // Expire stale workouts
        for (const ex of diff.to_expire) {
          try {
            await svc.entities.LearningRecommendation.update(ex.recommendation_id, { status: 'dismissed' });
            if (ex.module_id) {
              await svc.entities.ConversationalLearningModule.update(ex.module_id, { status: 'archived' });
            }
            expired++;
          } catch { /* best-effort */ }
        }

        // Create at most 1 new workout (curated assets only, to control nightly cost)
        if (diff.to_create.length > 0) {
          const brief = diff.to_create[0];
          try {
            const module = await generateWorkoutModule(svc, brief);
            const resourceIds = await attachAssets(svc, brief.competency, false);

            const savedModule = await svc.entities.ConversationalLearningModule.create({
              title: module.title,
              description: module.description,
              status: 'published',
              competencies: module.competencies,
              leadership_level: WORKOUT_DEFAULTS.leadership_level,
              estimated_duration_minutes: module.estimated_duration_minutes || 5,
              conversation_structure: module.conversation_structure,
              related_resource_ids: resourceIds,
              is_active: true,
              points_value: WORKOUT_DEFAULTS.points_value,
              source_pattern_id: brief.pattern_id,
              workout_type: brief.type || 'skill',
            });

            await svc.entities.LearningRecommendation.create({
              user_email: userEmail,
              resource_type: 'conversational_module',
              resource_id: savedModule.id,
              recommendation_reason: `Generated from pattern: ${brief.label}`,
              relevance_score: brief.strength,
              based_on: ['pattern_engine'],
              target_competencies: module.competencies,
              status: 'pending',
              generated_date: new Date().toISOString(),
            });
            created++;
          } catch (e) {
            console.warn(`[refreshPatternWorkouts] Failed to generate for ${userEmail}:`, e);
          }
        }

        usersProcessed++;
      } catch (e) {
        // skip this user, continue
      }
    }

    return Response.json({
      success: true,
      users_processed: usersProcessed,
      workouts_created: created,
      workouts_expired: expired,
    });
  } catch (error) {
    console.error('[refreshPatternWorkouts] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}