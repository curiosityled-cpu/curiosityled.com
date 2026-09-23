import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation, quarantineOperation, setOperationRecoveryRequired } from "../../shared/successionOperationHelper.ts";
import { acquireOrgRoleLock, reconfirmLockOwnership, releaseOrgRoleLock } from "../../shared/successionLockHelper.ts";
import { quarantineRecords } from "../../shared/successionIntegrityHelper.ts";

/**
 * POST /successionApproveBlueprint
 *
 * Approves a submitted RoleSuccessBlueprint using the OrgRole-level lock protocol
 * with full failure-recovery semantics.
 *
 * Lock-release rules:
 *   - Release requires both matching lock_token AND operation_id.
 *   - Never release another operation's lock.
 *   - If failure occurs BEFORE any domain mutation → safely release the owned lock.
 *   - If failure occurs AFTER any possible domain mutation → do NOT blindly release.
 *     Set the operation to recovery_required. Verify the state. If unambiguous,
 *     complete or safely reverse. If ambiguous, quarantine and require human resolution.
 *
 * Failure-injection points (for testing only, via __fail_at parameter):
 *   1. "after_lock_acquire" — immediately after lock acquisition
 *   2. "after_precondition_verify" — after verifying expected state
 *   3. "after_approve_blueprint" — after approving the submitted blueprint
 *   4. "after_supersede_prior" — after superseding the former current blueprint
 *   5. "before_update_pointer" — before updating OrgRole.current_blueprint_id
 *   6. "after_pointer_before_revision" — after pointer update but before revision increment
 *   7. "after_revision_before_audit" — after revision increment but before audit
 *   8. "during_lock_release" — during lock release
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, blueprint_id, org_role_id, expected_revision, __fail_at } = body;

  if (!operation_id || !blueprint_id || !org_role_id || expected_revision === undefined) {
    return Response.json({ error: "operation_id, blueprint_id, org_role_id, expected_revision required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) {
    return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  }

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionApproveBlueprint",
    target_client_id: auth.client_id,
    required_permission: "succession.roles.manage",
  });
  if (!authz.allowed) {
    return Response.json({ error: authz.denied_reason }, { status: 403 });
  }

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionApproveBlueprint",
    payload: { blueprint_id, org_role_id, expected_revision },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });

  if (opResult.rejected_payload_mismatch) {
    return Response.json({ error: "operation_id payload mismatch" }, { status: 409 });
  }
  if (opResult.is_duplicate) {
    return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate attached" });
  }

  // ── State tracking for failure recovery ──────────────────────────────
  let lock_token: string | null = null;
  let domainMutationStarted = false;
  let priorCurrentIds: string[] = [];
  let blueprintApproved = false;
  let pointerUpdated = false;
  let revisionIncremented = false;

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // Read the blueprint
    const blueprints = await base44.asServiceRole.entities.RoleSuccessBlueprint.filter({ id: blueprint_id });
    if (blueprints.length === 0) {
      await failOperation(base44, opResult.operation.id, "blueprint_not_found");
      return Response.json({ error: "Blueprint not found" }, { status: 404 });
    }

    // Read OrgRole to get expected current_blueprint_id
    const roles = await base44.asServiceRole.entities.OrgRole.filter({ id: org_role_id });
    if (roles.length === 0) {
      await failOperation(base44, opResult.operation.id, "org_role_not_found");
      return Response.json({ error: "OrgRole not found" }, { status: 404 });
    }
    const expected_blueprint_id = roles[0].current_blueprint_id;

    // 1. ACQUIRE lock
    const lockResult = await acquireOrgRoleLock({
      base44, org_role_id, operation_id: opResult.operation.id,
      expected_blueprint_id, expected_revision,
    });

    if (!lockResult.acquired) {
      await failOperation(base44, opResult.operation.id, lockResult.reason || "lock_acquire_failed");
      const status = lockResult.expired_foreign_lock ? 409 : 423;
      return Response.json({ error: lockResult.reason, lock_state: lockResult }, { status });
    }

    lock_token = lockResult.lock_token!;

    // ── FAILURE INJECTION POINT 1: after_lock_acquire ─────────────────
    if (__fail_at === "after_lock_acquire") {
      throw new Error("INJECTED_FAILURE:after_lock_acquire");
    }

    // 2. VERIFY precondition — reconfirm ownership
    const owns = await reconfirmLockOwnership(base44, org_role_id, lock_token, opResult.operation.id);
    if (!owns) {
      // No mutation yet — safe to release
      await releaseOrgRoleLock(base44, org_role_id, lock_token, opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "lock_ownership_lost");
      return Response.json({ error: "Lock ownership lost before mutation" }, { status: 409 });
    }

    // ── FAILURE INJECTION POINT 2: after_precondition_verify ──────────
    if (__fail_at === "after_precondition_verify") {
      throw new Error("INJECTED_FAILURE:after_precondition_verify");
    }

    // ── DOMAIN MUTATIONS BEGIN ─────────────────────────────────────────
    domainMutationStarted = true;

    // 3a. Mark any previously current blueprint as superseded
    const priorCurrent = await base44.asServiceRole.entities.RoleSuccessBlueprint.filter({
      org_role_id, is_current: true,
    });
    priorCurrentIds = priorCurrent.filter(p => p.id !== blueprint_id).map(p => p.id);

    // ── FAILURE INJECTION POINT 4: after_supersede_prior ───────────────
    // (injected BEFORE superseding so we can test the "after" case)
    if (__fail_at === "after_supersede_prior") {
      // Actually supersede first, then fail
      for (const pb of priorCurrent) {
        if (pb.id !== blueprint_id) {
          await base44.asServiceRole.entities.RoleSuccessBlueprint.update(pb.id, {
            is_current: false, status: "superseded",
          });
        }
      }
      throw new Error("INJECTED_FAILURE:after_supersede_prior");
    }

    for (const pb of priorCurrent) {
      if (pb.id !== blueprint_id) {
        await base44.asServiceRole.entities.RoleSuccessBlueprint.update(pb.id, {
          is_current: false, status: "superseded",
        });
      }
    }

    // ── FAILURE INJECTION POINT 5: before_update_pointer ──────────────
    // (after superseding, before approving the new blueprint)
    if (__fail_at === "before_update_pointer") {
      // Approve the blueprint first, then fail before pointer update
      await base44.asServiceRole.entities.RoleSuccessBlueprint.update(blueprint_id, {
        status: "approved", is_current: true,
        approved_at: new Date().toISOString(),
        approved_by_profile_id: auth.profile_id,
        approved_via_operation_id: opResult.operation.id,
        integrity_status: "active",
      });
      blueprintApproved = true;
      throw new Error("INJECTED_FAILURE:before_update_pointer");
    }

    // 3b. Approve the new blueprint
    await base44.asServiceRole.entities.RoleSuccessBlueprint.update(blueprint_id, {
      status: "approved", is_current: true,
      approved_at: new Date().toISOString(),
      approved_by_profile_id: auth.profile_id,
      approved_via_operation_id: opResult.operation.id,
      integrity_status: "active",
    });
    blueprintApproved = true;

    // ── FAILURE INJECTION POINT 3: after_approve_blueprint ────────────
    if (__fail_at === "after_approve_blueprint") {
      throw new Error("INJECTED_FAILURE:after_approve_blueprint");
    }

    // 3c. Update OrgRole.current_blueprint_id
    await base44.asServiceRole.entities.OrgRole.update(org_role_id, {
      current_blueprint_id: blueprint_id,
    });
    pointerUpdated = true;

    // ── FAILURE INJECTION POINT 6: after_pointer_before_revision ───────
    if (__fail_at === "after_pointer_before_revision") {
      throw new Error("INJECTED_FAILURE:after_pointer_before_revision");
    }

    // 3d. Increment revision
    await base44.asServiceRole.entities.OrgRole.update(org_role_id, {
      blueprint_approval_revision: expected_revision + 1,
    });
    revisionIncremented = true;

    // ── FAILURE INJECTION POINT 7: after_revision_before_audit ─────────
    if (__fail_at === "after_revision_before_audit") {
      throw new Error("INJECTED_FAILURE:after_revision_before_audit");
    }

    // 3e. Mark previously approved CriticalRoleRequirements as stale
    const priorRequirements = await base44.asServiceRole.entities.CriticalRoleRequirement.filter({
      org_role_id, status: "approved", applicability_status: "applicable",
    });
    for (const req of priorRequirements) {
      await base44.asServiceRole.entities.CriticalRoleRequirement.update(req.id, {
        applicability_status: "stale_for_future_snapshots",
        stale_since_blueprint_id: blueprint_id,
        stale_marked_at: new Date().toISOString(),
        stale_marked_by_operation_id: opResult.operation.id,
      });
    }

    // 4. VERIFY postcondition
    const approvedCurrent = await base44.asServiceRole.entities.RoleSuccessBlueprint.filter({
      org_role_id, status: "approved", is_current: true,
    });
    const updatedRoles = await base44.asServiceRole.entities.OrgRole.filter({ id: org_role_id });
    const updatedRole = updatedRoles[0];

    const postconditionMet =
      approvedCurrent.length === 1 &&
      approvedCurrent[0].id === blueprint_id &&
      updatedRole.current_blueprint_id === blueprint_id &&
      updatedRole.blueprint_approval_revision === expected_revision + 1;

    if (!postconditionMet) {
      // AMBIGUOUS — quarantine, do NOT auto-select winner, do NOT release lock
      await quarantineRecords(base44, "OrgRole", [org_role_id], "ambiguous_blueprint_approval_postcondition", opResult.operation.id);
      await quarantineRecords(base44, "RoleSuccessBlueprint", [blueprint_id, ...priorCurrentIds], "ambiguous_blueprint_approval_postcondition", opResult.operation.id);
      await quarantineOperation(base44, opResult.operation.id, "ambiguous_postcondition");
      // Lock left in place — will expire and enter recovery
      await writeSuccessionAuditEvent({
        base44, action_type: "blueprint_approval_quarantined",
        target_entity_type: "OrgRole", target_entity_id: org_role_id,
        metadata: { blueprint_id, reason: "ambiguous_postcondition" },
        operation_id, event_key: { action: "approval_quarantined", org_role_id, blueprint_id },
        event_type: "integrity_quarantined", target_record_id: org_role_id, attempt_number: 1,
      });
      return Response.json({ error: "Ambiguous postcondition — quarantined", quarantined: true }, { status: 409 });
    }

    // 5. RELEASE lock — requires matching token AND operation_id
    // ── FAILURE INJECTION POINT 8: during_lock_release ─────────────────
    if (__fail_at === "during_lock_release") {
      throw new Error("INJECTED_FAILURE:during_lock_release");
    }

    const released = await releaseOrgRoleLock(base44, org_role_id, lock_token, opResult.operation.id);

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "blueprint_approved",
      target_entity_type: "RoleSuccessBlueprint", target_entity_id: blueprint_id,
      metadata: { org_role_id, revision: expected_revision + 1, lock_released: released },
      operation_id, event_key: { action: "blueprint_approved", blueprint_id },
      event_type: "domain_action_completed", target_record_id: blueprint_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      blueprint_id, revision: expected_revision + 1, lock_released: released,
    });

    return Response.json({
      operation_id, blueprint_id, status: "approved",
      revision: expected_revision + 1, lock_released: released,
    });

  } catch (error) {
    const errorMsg = (error as Error).message;

    // ── RECOVERY PROTOCOL ───────────────────────────────────────────────
    if (!domainMutationStarted) {
      // Failure BEFORE any domain mutation — safely release the owned lock
      if (lock_token) {
        await releaseOrgRoleLock(base44, org_role_id, lock_token, opResult.operation.id);
      }
      await failOperation(base44, opResult.operation.id, errorMsg);
      await writeSuccessionAuditEvent({
        base44, action_type: "blueprint_approval_failed_pre_mutation",
        target_entity_type: "OrgRole", target_entity_id: org_role_id,
        metadata: { blueprint_id, failure_point: errorMsg, lock_released: true },
        operation_id, event_key: { action: "approval_failed_pre_mutation", org_role_id, blueprint_id, operation_id },
        event_type: "operation_failed", target_record_id: org_role_id, attempt_number: 1,
      });
      return Response.json({ error: errorMsg, recovery: "lock_released_pre_mutation" }, { status: 500 });
    }

    // Failure AFTER domain mutations — do NOT blindly release
    await setOperationRecoveryRequired(base44, opResult.operation.id, errorMsg);

    // Verify the actual state
    const finalBlueprints = await base44.asServiceRole.entities.RoleSuccessBlueprint.filter({
      org_role_id, status: "approved", is_current: true,
    });
    const finalRoles = await base44.asServiceRole.entities.OrgRole.filter({ id: org_role_id });
    const finalRole = finalRoles[0];

    const stateUnambiguous =
      finalBlueprints.length === 1 &&
      finalBlueprints[0].id === blueprint_id &&
      finalRole.current_blueprint_id === blueprint_id &&
      finalRole.blueprint_approval_revision === expected_revision + 1;

    if (stateUnambiguous) {
      // All mutations completed — complete the operation and release the lock
      if (lock_token) {
        await releaseOrgRoleLock(base44, org_role_id, lock_token, opResult.operation.id);
      }
      const auditEvent = await writeSuccessionAuditEvent({
        base44, action_type: "blueprint_approved_via_recovery",
        target_entity_type: "RoleSuccessBlueprint", target_entity_id: blueprint_id,
        metadata: { org_role_id, revision: expected_revision + 1, failure_point: errorMsg, recovered: true },
        operation_id, event_key: { action: "blueprint_approved", blueprint_id },
        event_type: "domain_action_completed", target_record_id: blueprint_id, attempt_number: 1,
      });
      await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
        blueprint_id, revision: expected_revision + 1, recovered: true, failure_point: errorMsg,
      });
      return Response.json({
        operation_id, blueprint_id, status: "approved",
        revision: expected_revision + 1, recovered: true, failure_point: errorMsg,
      });
    }

    // State is AMBIGUOUS — quarantine, do NOT release lock, require human resolution
    await quarantineRecords(base44, "OrgRole", [org_role_id], "recovery_required_ambiguous_state", opResult.operation.id);
    await quarantineRecords(base44, "RoleSuccessBlueprint", [blueprint_id, ...priorCurrentIds], "recovery_required_ambiguous_state", opResult.operation.id);

    await writeSuccessionAuditEvent({
      base44, action_type: "blueprint_approval_recovery_required",
      target_entity_type: "OrgRole", target_entity_id: org_role_id,
      metadata: {
        blueprint_id, failure_point: errorMsg,
        blueprint_approved: blueprintApproved,
        pointer_updated: pointerUpdated,
        revision_incremented: revisionIncremented,
        prior_current_ids: priorCurrentIds,
        state_unambiguous: false,
      },
      operation_id, event_key: { action: "approval_recovery_required", org_role_id, blueprint_id, operation_id },
      event_type: "integrity_quarantined", target_record_id: org_role_id, attempt_number: 1,
    });

    return Response.json({
      error: errorMsg,
      recovery: "recovery_required_ambiguous_state",
      quarantined: true,
      state: { blueprint_approved: blueprintApproved, pointer_updated: pointerUpdated, revision_incremented: revisionIncremented },
    }, { status: 500 });
  }
}