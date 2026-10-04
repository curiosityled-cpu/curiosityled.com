import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const adminRoles = ['Platform Admin', 'Super Administrator', 'Admin Level 2'];
    if (!adminRoles.includes(user.role) && !adminRoles.includes(user.app_role)) {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const service = base44.asServiceRole;

    // Idempotency: find already-migrated records
    const existing = await service.entities.Journey.filter({});
    const migratedKeys = new Set(
      existing.map((j) => (j.source_entity && j.source_id ? `${j.source_entity}:${j.source_id}` : ''))
    );

    const report = {
      learning_journeys: { total: 0, migrated: 0, skipped: 0, errors: [] },
      development_plans: { total: 0, migrated: 0, skipped: 0, errors: [] },
      total_created: 0,
      started_at: new Date().toISOString(),
    };

    // ── Migrate LearningJourney → Journey (mode: catalog) ──
    const learningJourneys = await service.entities.LearningJourney.list();
    report.learning_journeys.total = learningJourneys.length;

    for (const lj of learningJourneys) {
      const key = `LearningJourney:${lj.id}`;
      if (migratedKeys.has(key)) {
        report.learning_journeys.skipped++;
        continue;
      }
      try {
        await service.entities.Journey.create({
          mode: 'catalog',
          title: lj.title,
          description: lj.description,
          thumbnail_url: lj.thumbnail_url,
          author_email: lj.author_email || lj.created_by,
          client_id: lj.client_id,
          partner_id: lj.partner_id,
          status: lj.status || 'draft',
          type: lj.type,
          is_template: lj.is_template || false,
          template_category: lj.template_category,
          template_tags: lj.template_tags || [],
          use_count: lj.use_count || 0,
          last_used_date: lj.last_used_date,
          content_structure: lj.content_structure || [],
          estimated_duration_days: lj.estimated_duration_days,
          target_audiences: lj.target_audiences || [],
          assigned_to_emails: lj.assigned_to_emails || [],
          assigned_to_cohort_ids: lj.assigned_to_cohort_ids || [],
          shared_admin_emails: lj.shared_admin_emails || [],
          last_modified_by: lj.last_modified_by,
          tags: lj.tags || [],
          completion_criteria: lj.completion_criteria,
          points_value: lj.points_value,
          completion_badge_id: lj.completion_badge_id,
          source_entity: 'LearningJourney',
          source_id: lj.id,
        });
        report.learning_journeys.migrated++;
        report.total_created++;
      } catch (err) {
        report.learning_journeys.errors.push({ id: lj.id, title: lj.title, error: err.message });
      }
    }

    // ── Migrate DevelopmentPlan → Journey (mode: assigned) ──
    const devPlans = await service.entities.DevelopmentPlan.list();
    report.development_plans.total = devPlans.length;

    for (const dp of devPlans) {
      const key = `DevelopmentPlan:${dp.id}`;
      if (migratedKeys.has(key)) {
        report.development_plans.skipped++;
        continue;
      }
      try {
        await service.entities.Journey.create({
          mode: 'assigned',
          title: dp.title,
          description: dp.description,
          thumbnail_url: dp.thumbnail_url,
          user_email: dp.user_email,
          client_id: dp.client_id,
          status: dp.status || 'active',
          target_competencies: dp.target_competencies || [],
          target_date: dp.target_date,
          experiences: dp.experiences || [],
          learning_items: dp.learning_items || [],
          tags: [],
          source_entity: 'DevelopmentPlan',
          source_id: dp.id,
        });
        report.development_plans.migrated++;
        report.total_created++;
      } catch (err) {
        report.development_plans.errors.push({ id: dp.id, title: dp.title, error: err.message });
      }
    }

    report.finished_at = new Date().toISOString();
    return Response.json({ success: true, report });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}