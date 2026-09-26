import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

/**
 * clearSuccessionDemoData — Deletes all synthetic succession demo data from the
 * HealthCo synthetic demo tenant. Requires settings.succession_demo === true.
 *
 * Platform Admin only. Audit events are preserved (append-only).
 */

const DEMO_CLIENT_SLUG = 'healthco';

// Entities to clear — operational records only. Audit events are NOT deleted.
const ENTITY_NAMES = [
  'SuccessionMonitorAlert',
  'SuccessionReviewRecord',
  'KnowledgeTransferPlan',
  'TransitionPlan',
  'TransitionInitiation',
  'DevelopmentAction',
  'DevelopmentPlanLink',
  'GovernanceApproval',
  'CalibrationJudgment',
  'CalibrationCase',
  'CalibrationSession',
  'ReadinessEvidenceCitation',
  'ReadinessCondition',
  'ReadinessConclusion',
  'EvidenceReviewDecision',
  'EvidenceRecord',
  'SuccessorCandidacy',
  'TalentPoolMembership',
  'TalentPool',
  'EffectiveRequirementSnapshot',
  'EffectiveBlueprintSnapshot',
  'CriticalRoleRequirement',
  'RoleRequirement',
  'RoleSuccessBlueprint',
  'CriticalRole',
  'OrgPosition',
  'OrgRole',
  'SuccessionCycle',
  'UserProfile',
  'SuccessionOperation',
  'SnapshotIntegrityIncident',
];

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const role = user.app_role || 'User Level 1';
    const isPlatformAdmin = role === 'Platform Admin' || role === 'Platform Administrator' || role === 'admin';
    if (!isPlatformAdmin) {
      return Response.json({ error: 'Only Platform Admin can clear demo data' }, { status: 403 });
    }

    // Resolve the synthetic demo tenant by slug
    const clients = await base44.asServiceRole.entities.Client.filter({ slug: DEMO_CLIENT_SLUG }, '-created_date', 1);
    if (clients.length === 0) {
      return Response.json({ error: `Synthetic demo tenant "${DEMO_CLIENT_SLUG}" not found.` }, { status: 404 });
    }
    const demoClient = clients[0];
    const DEMO_CLIENT_ID = demoClient.id;

    // Verify the authoritative synthetic marker
    if (!demoClient.settings?.succession_demo) {
      return Response.json({
        error: `Tenant "${demoClient.name}" is not marked as synthetic (settings.succession_demo is false). Refusing to clear non-synthetic tenant data.`,
      }, { status: 403 });
    }

    const deletedCounts: any = {};

    // Delete all demo operational records from each entity type
    // UserProfile uses tenant_id; all other succession entities use client_id
    for (const entityName of ENTITY_NAMES) {
      try {
        const filterKey = entityName === 'UserProfile' ? { tenant_id: DEMO_CLIENT_ID } : { client_id: DEMO_CLIENT_ID };
        const result = await base44.asServiceRole.entities[entityName].deleteMany(filterKey);
        deletedCounts[entityName] = result?.deleted_count ?? 'done';
      } catch (e) {
        deletedCounts[entityName] = 'none or error';
      }
    }

    // Audit events are preserved (append-only history)

    return Response.json({
      status: 'cleared',
      client_id: DEMO_CLIENT_ID,
      tenant_name: demoClient.name,
      synthetic: true,
      deleted: deletedCounts,
      audit_preserved: true,
      message: 'Synthetic demo operational records cleared. Audit history preserved.',
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}