import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";
import { validateUniqueness } from "../../shared/successionIntegrityHelper.ts";

/**
 * POST /successionCreateCandidacy
 * Creates a new SuccessorCandidacy linking a user to a critical role,
 * bound to a specific EffectiveBlueprintSnapshot at creation time.
 *
 * Enforces one active candidacy per client_id + critical_role_id + user_profile_id.
 * No scoring, ranking, readiness, evidence, or recommendations.
 *
 * Snapshot binding: the snapshot must be status=generated, integrity_status=active,
 * belong to the same CriticalRole, have valid count/hash, and have no open blocking
 * SnapshotIntegrityIncident. The candidacy is never silently migrated to a later snapshot.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, cycle_id, critical_role_id, user_profile_id, effective_blueprint_snapshot_id, discovery_source, origin_pool_membership_id } = body;

  if (!operation_id || !cycle_id || !critical_role_id || !user_profile_id || !effective_blueprint_snapshot_id || !discovery_source) {
    return Response.json({ error: "operation_id, cycle_id, critical_role_id, user_profile_id, effective_blueprint_snapshot_id, discovery_source required" }, { status: 400 });
  }

  const validSources = ["pool_nomination", "manager_nomination", "self_nomination", "hr_nomination"];
  if (!validSources.includes(discovery_source)) {
    return Response.json({ error: "Invalid discovery_source" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionCreateCandidacy",
    target_client_id: auth.client_id,
    required_permission: "succession.discovery.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionCreateCandidacy",
    payload: { cycle_id, critical_role_id, user_profile_id, effective_blueprint_snapshot_id, discovery_source, origin_pool_membership_id },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // ── 1. Cycle must be active and belong to caller's tenant ──
    const cycle = await validateSameTenantReference(base44, "SuccessionCycle", cycle_id, auth.client_id);
    if (!cycle) {
      await writeDeniedReferenceEvent(base44, auth, "SuccessionCycle", cycle_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "cycle_not_found");
      return Response.json({ error: "Cycle not found" }, { status: 404 });
    }
    if (cycle.status !== "active") {
      await failOperation(base44, opResult.operation.id, "cycle_not_active");
      return Response.json({ error: "Cycle must be active to create candidacies" }, { status: 409 });
    }

    // ── 2. CriticalRole must be active and belong to the cycle ──
    const criticalRole = await validateSameTenantReference(base44, "CriticalRole", critical_role_id, auth.client_id);
    if (!criticalRole) {
      await writeDeniedReferenceEvent(base44, auth, "CriticalRole", critical_role_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "critical_role_not_found");
      return Response.json({ error: "Critical role not found" }, { status: 404 });
    }
    if (criticalRole.cycle_id !== cycle_id) {
      await failOperation(base44, opResult.operation.id, "critical_role_not_in_cycle");
      return Response.json({ error: "Critical role does not belong to the specified cycle" }, { status: 409 });
    }
    if (criticalRole.status !== "active") {
      await failOperation(base44, opResult.operation.id, "critical_role_not_active");
      return Response.json({ error: "Critical role must be active to create candidacies" }, { status: 409 });
    }

    // ── 3. Candidate profile must belong to the tenant ──
    const candidateProfile = await validateSameTenantReference(base44, "UserProfile", user_profile_id, auth.client_id);
    if (!candidateProfile) {
      await writeDeniedReferenceEvent(base44, auth, "UserProfile", user_profile_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "candidate_profile_not_found");
      return Response.json({ error: "Candidate profile not found in tenant" }, { status: 404 });
    }

    // ── 4. Validate origin pool membership if provided ──
    if (origin_pool_membership_id) {
      const poolMembership = await validateSameTenantReference(base44, "TalentPoolMembership", origin_pool_membership_id, auth.client_id);
      if (!poolMembership) {
        await writeDeniedReferenceEvent(base44, auth, "TalentPoolMembership", origin_pool_membership_id, "cross_tenant_or_not_found", opResult.operation.id);
        await failOperation(base44, opResult.operation.id, "pool_membership_not_found");
        return Response.json({ error: "Pool membership not found" }, { status: 404 });
      }
      if (poolMembership.user_profile_id !== user_profile_id) {
        await failOperation(base44, opResult.operation.id, "pool_membership_user_mismatch");
        return Response.json({ error: "Pool membership does not belong to the specified candidate" }, { status: 409 });
      }
    }

    // ── 5. Snapshot must belong to the CriticalRole, be generated, active, and valid ──
    const snapshot = await validateSameTenantReference(base44, "EffectiveBlueprintSnapshot", effective_blueprint_snapshot_id, auth.client_id);
    if (!snapshot) {
      await writeDeniedReferenceEvent(base44, auth, "EffectiveBlueprintSnapshot", effective_blueprint_snapshot_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "snapshot_not_found");
      return Response.json({ error: "Effective blueprint snapshot not found" }, { status: 404 });
    }
    if (snapshot.critical_role_id !== critical_role_id) {
      await failOperation(base44, opResult.operation.id, "snapshot_role_mismatch");
      return Response.json({ error: "Snapshot does not belong to the specified critical role" }, { status: 409 });
    }
    if (snapshot.status !== "generated") {
      await failOperation(base44, opResult.operation.id, "snapshot_not_generated");
      return Response.json({ error: "Snapshot must be in 'generated' status" }, { status: 409 });
    }
    if (snapshot.integrity_status !== "active") {
      await failOperation(base44, opResult.operation.id, "snapshot_not_active_integrity");
      return Response.json({ error: "Snapshot integrity_status must be 'active'" }, { status: 409 });
    }
    // Validate persisted requirement count and hash
    if (!snapshot.requirements_content_hash || snapshot.expected_requirement_count !== snapshot.generated_requirement_count) {
      await failOperation(base44, opResult.operation.id, "snapshot_count_hash_invalid");
      return Response.json({ error: "Snapshot has invalid requirement count or hash" }, { status: 409 });
    }

    // ── 6. No open blocking SnapshotIntegrityIncident ──
    const blockingIncidents = await base44.asServiceRole.entities.SnapshotIntegrityIncident.filter({
      client_id: auth.client_id,
      snapshot_id: effective_blueprint_snapshot_id,
      operational_use_blocked: true,
      status: { $in: ["open", "under_review"] },
    });
    if (blockingIncidents.length > 0) {
      await failOperation(base44, opResult.operation.id, "snapshot_blocked_by_incident");
      return Response.json({ error: "Snapshot is blocked by an open SnapshotIntegrityIncident", incident_ids: blockingIncidents.map(i => i.id) }, { status: 409 });
    }

    // ── 7. Enforce one active candidacy per client_id + critical_role_id + user_profile_id ──
    const existing = await base44.asServiceRole.entities.SuccessorCandidacy.filter({
      client_id: auth.client_id, critical_role_id, user_profile_id, status: "active", integrity_status: "active",
    });
    if (existing.length > 0) {
      await failOperation(base44, opResult.operation.id, "duplicate_candidacy");
      return Response.json({ error: "An active candidacy already exists for this critical role and user", existing_candidacy_id: existing[0].id }, { status: 409 });
    }

    const now = new Date().toISOString();
    const candidacy = await base44.asServiceRole.entities.SuccessorCandidacy.create({
      client_id: auth.client_id,
      cycle_id,
      critical_role_id,
      user_profile_id,
      effective_blueprint_snapshot_id,
      origin_pool_membership_id: origin_pool_membership_id || null,
      discovery_source,
      nominated_by_profile_id: auth.profile_id,
      nominated_at: now,
      status: "active",
      confidentiality_level: "confidential",
      integrity_status: "pending_validation",
    });

    // Uniqueness validation
    const uniqueness = await validateUniqueness(base44, "SuccessorCandidacy", candidacy.id, {
      client_id: auth.client_id, critical_role_id, user_profile_id, status: "active", integrity_status: "active",
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "candidacy_created",
      target_entity_type: "SuccessorCandidacy", target_entity_id: candidacy.id,
      target_user_profile_id: user_profile_id,
      metadata: { cycle_id, critical_role_id, user_profile_id, effective_blueprint_snapshot_id, discovery_source, is_unique: uniqueness.is_unique },
      operation_id, event_key: { action: "candidacy_created", candidacy_id: candidacy.id },
      event_type: "domain_action_completed", target_record_id: candidacy.id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      candidacy_id: candidacy.id, integrity_status: uniqueness.is_unique ? "active" : "quarantined",
    });

    return Response.json({
      operation_id, candidacy_id: candidacy.id,
      integrity_status: uniqueness.is_unique ? "active" : "quarantined",
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "create_candidacy_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}