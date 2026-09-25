import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { filterByConfidentiality } from "../../shared/confidentialityFilter.ts";

/**
 * POST /successionListLeadershipIndexMappings
 *
 * Lists LeadershipIndexRequirementMapping records with filters.
 * Tenant-scoped, confidentiality-filtered. Administrator-only.
 */
const PAGE_LIMIT = 50;
const MAX_LIMIT = 200;

export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { assessment_definition_id, framework_version, leadership_level, effective_blueprint_snapshot_id, critical_role_id, status, limit, offset } = body;

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionListLeadershipIndexMappings",
    target_client_id: auth.client_id,
    required_permission: "succession.evidence.view",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  try {
    const cid = auth.client_id;
    const callerClearance = auth.isPlatformAdmin ? "legally_restricted" : "highly_confidential";
    const pageLimit = Math.min(Math.max(limit || PAGE_LIMIT, 1), MAX_LIMIT);
    const pageOffset = Math.max(offset || 0, 0);

    const filter: any = { client_id: cid, integrity_status: "active" };
    if (assessment_definition_id) filter.assessment_definition_id = assessment_definition_id;
    if (framework_version) filter.assessment_framework_version = framework_version;
    if (leadership_level) filter.assessment_leadership_level = leadership_level;
    if (effective_blueprint_snapshot_id) filter.effective_blueprint_snapshot_id = effective_blueprint_snapshot_id;
    if (status) filter.status = status;

    let mappings = await base44.asServiceRole.entities.LeadershipIndexRequirementMapping.filter(filter, "-created_at", MAX_LIMIT);

    // If critical_role_id filter is provided, we need to resolve via snapshot
    if (critical_role_id) {
      const snapshots = await base44.asServiceRole.entities.EffectiveBlueprintSnapshot.filter({
        client_id: cid, critical_role_id,
      });
      const snapshotIds = new Set(snapshots.map((s: any) => s.id));
      mappings = mappings.filter((m: any) => snapshotIds.has(m.effective_blueprint_snapshot_id));
    }

    // Confidentiality filter
    mappings = filterByConfidentiality(mappings, callerClearance);

    const total = mappings.length;
    const paged = mappings.slice(pageOffset, pageOffset + pageLimit);

    // Resolve competency names and critical role IDs for display
    const summaries = [];
    for (const m of paged) {
      let competencyName = m.competency_key;
      try {
        const comps = await base44.asServiceRole.entities.Competency.filter({ id: m.competency_id });
        if (comps.length > 0) competencyName = comps[0].name;
      } catch { /* skip */ }

      let criticalRoleId = null;
      try {
        const snapshots = await base44.asServiceRole.entities.EffectiveBlueprintSnapshot.filter({ id: m.effective_blueprint_snapshot_id });
        if (snapshots.length > 0) criticalRoleId = snapshots[0].critical_role_id;
      } catch { /* skip */ }

      summaries.push({
        mapping_id: m.id,
        assessment_definition_id: m.assessment_definition_id,
        assessment_framework_version: m.assessment_framework_version,
        assessment_leadership_level: m.assessment_leadership_level,
        competency_id: m.competency_id,
        competency_key: m.competency_key,
        competency_name: competencyName,
        effective_blueprint_snapshot_id: m.effective_blueprint_snapshot_id,
        effective_requirement_snapshot_id: m.effective_requirement_snapshot_id,
        critical_role_id: criticalRoleId,
        version_number: m.version_number,
        status: m.status,
        is_current: m.is_current,
        mapping_rationale: m.mapping_rationale,
        created_by_profile_id: m.created_by_profile_id,
        created_at: m.created_at,
        submitted_by_profile_id: m.submitted_by_profile_id || null,
        submitted_at: m.submitted_at || null,
        approved_by_profile_id: m.approved_by_profile_id || null,
        approved_at: m.approved_at || null,
        retired_by_profile_id: m.retired_by_profile_id || null,
        retired_at: m.retired_at || null,
        retirement_reason: m.retirement_reason || null,
      });
    }

    return Response.json({
      mappings: summaries,
      total,
      limit: pageLimit,
      offset: pageOffset,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}