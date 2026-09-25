import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";
import { validateUniqueness } from "../../shared/successionIntegrityHelper.ts";
import { validateOperationalSnapshot } from "../../shared/successionSnapshotValidator.ts";

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

    // ── 1. Validate the bound snapshot (cycle, critical role, snapshot integrity, incidents) ──
    const snapshotValidation = await validateOperationalSnapshot(
      base44, auth.client_id, effective_blueprint_snapshot_id, critical_role_id, cycle_id
    );
    if (!snapshotValidation.valid) {
      await writeDeniedReferenceEvent(base44, auth, "EffectiveBlueprintSnapshot", effective_blueprint_snapshot_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, snapshotValidation.error_code);
      return Response.json({ error: snapshotValidation.error_message }, { status: 409 });
    }
    const { snapshot, critical_role: criticalRole, cycle } = snapshotValidation;

    // ── 2. Candidate profile must belong to the tenant ──
    const candidateProfile = await validateSameTenantReference(base44, "UserProfile", user_profile_id, auth.client_id);
    if (!candidateProfile) {
      await writeDeniedReferenceEvent(base44, auth, "UserProfile", user_profile_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "candidate_profile_not_found");
      return Response.json({ error: "Candidate profile not found in tenant" }, { status: 404 });
    }

    // ── 3. Validate origin pool membership if provided ──
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

    // ── 4. Enforce one active candidacy per client_id + critical_role_id + user_profile_id ──
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