/**
 * workoutUtils — helpers for building workout coaching-flow context and
 * completing workouts. Shared by WorkoutsSection and PracticeHubTab.
 */
import { base44 } from "@/api/base44Client";

/**
 * Build a coaching_flow context object from a ConversationalLearningModule,
 * consumed by AtreusCoach via the system prompt's coaching-flow formatter.
 */
export function buildWorkoutCoachingFlow(module) {
  const steps = module.conversation_structure || [];
  return {
    flow: 'workout',
    title: module.title,
    workout_type: module.workout_type || 'skill',
    competency: (module.competencies || [])[0] || '',
    steps,
    related_resource_ids: module.related_resource_ids || [],
    practice_eligible: steps.some((s) => s.step_type === 'scenario'),
  };
}

/**
 * Build the starter message Atreus sends when a workout begins.
 */
export function buildWorkoutStarterMessage(module) {
  const steps = module.conversation_structure || [];
  const intro = steps.find((s) => s.step_type === 'intro') || steps[0];
  const typeLabel = module.workout_type === 'task' ? 'work through a real situation' : 'build a skill';
  return `I'm starting a leadership workout to ${typeLabel}: "${module.title}". ${(intro?.content || '').slice(0, 280)}`;
}

/**
 * Mark a workout complete: update LearnerProgress + LearningRecommendation,
 * write the commitment to ManagerPulse, and award points. Best-effort.
 */
export async function completeWorkout({ user, module, recommendationId, commitment }) {
  const promises = [];

  // 1. Write commitment to ManagerPulse
  if (commitment?.trim()) {
    promises.push(
      base44.entities.ManagerPulse.create({
        user_email: user?.email,
        prompt_type: 'follow_up',
        source: 'web',
        focus_intention: `Workout commitment: ${module.title}`.slice(0, 500),
        description: `Commitment from workout "${module.title}" (${module.workout_type || 'skill'}):\n${commitment}`.slice(0, 1000),
      }).catch(() => {}),
    );
  }

  // 2. Log the practice session
  promises.push(
    base44.entities.ManagerPulse.create({
      user_email: user?.email,
      prompt_type: 'follow_up',
      source: 'web',
      focus_intention: `Workout completed: ${module.title}`.slice(0, 500),
    }).catch(() => {}),
  );

  // 3. Update LearnerProgress to completed
  promises.push(
    (async () => {
      try {
        const existing = await base44.entities.LearnerProgress.filter({
          user_email: user.email,
          conversational_learning_module_id: module.id,
        });
        if (existing.length > 0) {
          await base44.entities.LearnerProgress.update(existing[0].id, {
            status: 'completed',
            progress_percentage: 100,
            completed_date: new Date().toISOString(),
            last_accessed_date: new Date().toISOString(),
          });
        } else {
          await base44.entities.LearnerProgress.create({
            user_email: user.email,
            conversational_learning_module_id: module.id,
            status: 'completed',
            progress_percentage: 100,
            completed_date: new Date().toISOString(),
            last_accessed_date: new Date().toISOString(),
          });
        }
      } catch {}
    })(),
  );

  // 4. Mark recommendation accepted
  if (recommendationId) {
    promises.push(
      base44.entities.LearningRecommendation.update(recommendationId, { status: 'accepted' }).catch(() => {}),
    );
  }

  // 5. Award points
  promises.push(
    base44.functions.invoke('awardPoints', {
      user_email: user?.email,
      points: module.points_value || 50,
      reason: `Completed workout: ${module.title}`,
    }).catch(() => {}),
  );

  await Promise.all(promises);
}

/**
 * Load a user's active workout recommendations + linked modules.
 * Returns { workouts, loading } where workouts is an array of
 * { recommendation, module } pairs, sorted by relevance.
 */
export async function loadActiveWorkouts(userEmail) {
  const recs = await base44.entities.LearningRecommendation.filter({
    user_email: userEmail,
    resource_type: 'conversational_module',
    status: 'pending',
  }, '-generated_date', 10);

  const moduleIds = recs.map((r) => r.resource_id).filter(Boolean);
  if (moduleIds.length === 0) return [];

  const modules = await base44.entities.ConversationalLearningModule.filter({ id: { $in: moduleIds } });
  const modulesById = {};
  modules.forEach((m) => { modulesById[m.id] = m; });

  return recs
    .map((r) => ({ recommendation: r, module: modulesById[r.resource_id] }))
    .filter((w) => w.module && w.module.status === 'published');
}

/**
 * Load in-progress workouts (LearnerProgress status in_progress).
 */
export async function loadInProgressWorkouts(userEmail) {
  const progress = await base44.entities.LearnerProgress.filter({
    user_email: userEmail,
    status: 'in_progress',
  }, '-last_accessed_date', 10);

  const moduleIds = progress.map((p) => p.conversational_learning_module_id).filter(Boolean);
  if (moduleIds.length === 0) return [];

  const modules = await base44.entities.ConversationalLearningModule.filter({ id: { $in: moduleIds } });
  const modulesById = {};
  modules.forEach((m) => { modulesById[m.id] = m; });

  return progress
    .map((p) => ({ progress: p, module: modulesById[p.conversational_learning_module_id] }))
    .filter((w) => w.module);
}

/**
 * Load completed workout history (LearnerProgress status completed).
 */
export async function loadCompletedWorkouts(userEmail) {
  const progress = await base44.entities.LearnerProgress.filter({
    user_email: userEmail,
    status: 'completed',
  }, '-completed_date', 20);

  const moduleIds = progress.map((p) => p.conversational_learning_module_id).filter(Boolean);
  if (moduleIds.length === 0) return [];

  const modules = await base44.entities.ConversationalLearningModule.filter({ id: { $in: moduleIds } });
  const modulesById = {};
  modules.forEach((m) => { modulesById[m.id] = m; });

  return progress
    .map((p) => ({ progress: p, module: modulesById[p.conversational_learning_module_id] }))
    .filter((w) => w.module);
}