/**
 * generatePatternWorkout — on-demand workout generation (user-triggered).
 *
 * Takes a normalized pattern brief and produces a ConversationalLearningModule
 * via InvokeLLM, attaches curated (or web-found) assets, saves the module as
 * published, and creates a LearningRecommendation for the requesting user.
 *
 * Uses the service role for module/recommendation creation (the module create
 * RLS is admin-gated), but authenticates the caller to know who they are.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { generateWorkoutModule, attachAssets, WORKOUT_DEFAULTS } from '../../shared/workoutGenerator.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Security: restrict on-demand module publication to manager/admin roles.
    // Regular users must not bypass the admin-gated module-create RLS via
    // the service role to publish content into the shared learning catalog.
    const allowedRoles = ['Platform Admin', 'Super Administrator', 'Partner Business Administrator', 'Admin Level 1', 'Admin Level 2', 'User Level 2', 'User Level 3'];
    if (!allowedRoles.includes(user.app_role)) {
      return Response.json({ error: 'Unauthorized — only managers and admins may publish pattern workouts' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const brief = body.brief;
    if (!brief || !brief.pattern_id || !brief.competency) {
      return Response.json({ error: 'Missing pattern brief (pattern_id, competency required)' }, { status: 400 });
    }

    const svc = base44.asServiceRole;
    const module = await generateWorkoutModule(svc, brief);
    const resourceIds = await attachAssets(svc, brief.competency, true);

    const savedModule = await svc.entities.ConversationalLearningModule.create({
      title: module.title,
      description: module.description,
      status: 'published',
      competencies: module.competencies,
      leadership_level: brief.leadership_level || WORKOUT_DEFAULTS.leadership_level,
      estimated_duration_minutes: module.estimated_duration_minutes || 5,
      conversation_structure: module.conversation_structure,
      related_resource_ids: resourceIds,
      is_active: true,
      points_value: WORKOUT_DEFAULTS.points_value,
      source_pattern_id: brief.pattern_id,
      workout_type: brief.type || 'skill',
    });

    const rec = await svc.entities.LearningRecommendation.create({
      user_email: user.email,
      resource_type: 'conversational_module',
      resource_id: savedModule.id,
      recommendation_reason: `Generated from pattern: ${brief.label || brief.pattern_id}`,
      relevance_score: brief.strength || 50,
      based_on: ['pattern_engine'],
      target_competencies: module.competencies,
      status: 'pending',
      generated_date: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      module_id: savedModule.id,
      recommendation_id: rec.id,
      module: savedModule,
    });
  } catch (error) {
    console.error('[generatePatternWorkout] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}