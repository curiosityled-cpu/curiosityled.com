import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

/**
 * clearSuccessionDemoData — Deletes all demo succession data from the demo
 * tenant and restores the calling user's original client_id.
 *
 * Platform Admin only.
 */

const DEMO_CLIENT_ID = 'demo-acme-corp';

const ENTITY_NAMES = [
  'SuccessionAuditEvent',
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

    const deletedCounts: any = {};

    // Delete all demo data from each entity type
    for (const entityName of ENTITY_NAMES) {
      try {
        const result = await base44.asServiceRole.entities[entityName].deleteMany({ client_id: DEMO_CLIENT_ID });
        deletedCounts[entityName] = result?.deleted_count ?? 'done';
      } catch (e) {
        // Some entities may not have any demo records — skip silently
        deletedCounts[entityName] = 'none or error';
      }
    }

    // Delete the demo Client (tenant) itself
    try {
      await base44.asServiceRole.entities.Client.deleteMany({ slug: 'demo-acme-corp' });
      deletedCounts['Client'] = 'deleted';
    } catch (e) {
      deletedCounts['Client'] = 'error: ' + (e as Error).message;
    }

    // Restore the user's original client_id
    const originalClientId = user.data?.original_client_id || null;
    const updateData: any = { client_id: originalClientId || '' };
    updateData.original_client_id = '';
    await base44.auth.updateMe(updateData);

    return Response.json({
      status: 'cleared',
      client_id_restored: originalClientId || null,
      deleted: deletedCounts,
      message: 'Demo data cleared and your view restored to your original tenant',
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}