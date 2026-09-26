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

    // Security: only admin-level roles may publish into the shared learning
    // catalog. Manager roles (User Level 2/3) may create tenant-private drafts
    // that require admin review before shared publication. Ordinary users are
    // denied entirely.
    // Publication is aligned with ConversationalLearningModule.create RLS, which
    // allows only Admin Level 2, Super Administrator, and Platform Admin to create
    // modules. Admin Level 1 and Partner Business Administrator may still use the
    // function but only as tenant-scoped draft creators (never shared publication).
    const adminRoles = ['Platform Admin', 'Super Administrator', 'Admin Level 2'];
    const managerRoles = ['User Level 2', 'User Level 3', 'Admin Level 1', 'Partner Business Administrator'];
    if (!adminRoles.includes(user.app_role) && !managerRoles.includes(user.app_role)) {
      return Response.json({ error: 'Unauthorized — only managers and admins may generate pattern workouts' }, { status: 403 });
    }
    const canPublish = adminRoles.includes(user.app_role);

    // Managers must have a tenant to scope their draft. Browser-supplied
    // client_id is never trusted — only the authenticated actor's tenant is used.
    const actorClientId = user.client_id;
    if (!canPublish && !actorClientId) {
      return Response.json({ error: 'Unauthorized — manager has no tenant assignment; cannot scope draft' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const brief = body.brief;
    // Reject any browser-supplied client_id — it is never trusted.
    if (body.client_id) {
      return Response.json({ error: 'client_id may not be supplied in the request body' }, { status: 400 });
    }
    if (!brief || !brief.pattern_id || !brief.competency) {
      return Response.json({ error: 'Missing pattern brief (pattern_id, competency required)' }, { status: 400 });
    }

    const svc = base44.asServiceRole;

    // Draft deduplication: if a tenant-scoped draft for this pattern already
    // exists, return it instead of creating a duplicate. Prevents draft
    // proliferation from repeated requests for the same pattern.
    if (!canPublish) {
      const existingDrafts = await svc.entities.ConversationalLearningModule.filter({
        source_pattern_id: brief.pattern_id,
        client_id: actorClientId,
        status: 'draft'
      }).catch(() => []);
      if (existingDrafts.length > 0) {
        const existing = existingDrafts[0];
        return Response.json({
          success: true,
          module_id: existing.id,
          module: existing,
          deduplicated: true,
        });
      }
    }

    const module = await generateWorkoutModule(svc, brief);
    const resourceIds = await attachAssets(svc, brief.competency, true);

    const savedModule = await svc.entities.ConversationalLearningModule.create({
      title: module.title,
      description: module.description,
      status: canPublish ? 'published' : 'draft',
      competencies: module.competencies,
      leadership_level: brief.leadership_level || WORKOUT_DEFAULTS.leadership_level,
      estimated_duration_minutes: module.estimated_duration_minutes || 5,
      conversation_structure: module.conversation_structure,
      related_resource_ids: resourceIds,
      is_active: canPublish,
      client_id: canPublish ? undefined : actorClientId,
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