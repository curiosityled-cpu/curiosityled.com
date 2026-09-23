import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation, quarantineOperation } from "../../shared/successionOperationHelper.ts";
import { acquireOrgRoleLock, reconfirmLockOwnership, releaseOrgRoleLock } from "../../shared/successionLockHelper.ts";
import { quarantineRecords } from "../../shared/successionIntegrityHelper.ts";

/**
 * POST /successionApproveBlueprint
 *
 * Approves a submitted RoleSuccessBlueprint using the OrgRole-level lock protocol:
 *   1. ACQUIRE lock via CAS (equality on null token)
 *   2. VERIFY expected current_blueprint_id + revision
 *   3. PERFORM approval: set blueprint status=approved, is_current=true;
 *      set OrgRole.current_blueprint_id, increment revision
 *   4. VERIFY postcondition: exactly one status=approved AND is_current=true
 *      blueprint matching OrgRole.current_blueprint_id
 *   5. RELEASE lock (match token + operation_id)
 *
 * If postconditions are ambiguous → quarantine OrgRole + affected blueprints.
 * Previously approved CriticalRoleRequirements are marked stale_for_future_snapshots,
 * NOT reset to draft.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, blueprint_id, org_role_id, expected_revision } = body;

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

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // Read the blueprint to get expected current_blueprint_id
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

    const lock_token = lockResult.lock_token!;

    // 3. PERFORM approval — reconfirm ownership before mutation
    const owns = await reconfirmLockOwnership(base44, org_role_id, lock_token, opResult.operation.id);
    if (!owns) {
      await failOperation(base44, opResult.operation.id, "lock_ownership_lost");
      return Response.json({ error: "Lock ownership lost before mutation" }, { status: 409 });
    }

    // Mark any previously current blueprint as superseded
    const priorCurrent = await base44.asServiceRole.entities.RoleSuccessBlueprint.filter({
      org_role_id, is_current: true,
    });
    for (const pb of priorCurrent) {
      if (pb.id !== blueprint_id) {
        await base44.asServiceRole.entities.RoleSuccessBlueprint.update(pb.id, {
          is_current: false, status: "superseded",
        });
      }
    }

    // Approve the new blueprint
    await base44.asServiceRole.entities.RoleSuccessBlueprint.update(blueprint_id, {
      status: "approved", is_current: true,
      approved_at: new Date().toISOString(),
      approved_by_profile_id: auth.profile_id,
      approved_via_operation_id: opResult.operation.id,
      integrity_status: "active",
    });

    // Update OrgRole current_blueprint_id and increment revision
    await base44.asServiceRole.entities.OrgRole.update(org_role_id, {
      current_blueprint_id: blueprint_id,
      blueprint_approval_revision: expected_revision + 1,
    });

    // Mark previously approved CriticalRoleRequirements as stale (NOT reset to draft)
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

    // 4. VERIFY postcondition: exactly one status=approved AND is_current=true blueprint
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
      // AMBIGUOUS — quarantine, do NOT auto-select winner
      await quarantineRecords(base44, "OrgRole", [org_role_id], "ambiguous_blueprint_approval_postcondition", opResult.operation.id);
      await quarantineRecords(base44, "RoleSuccessBlueprint", [blueprint_id, ...priorCurrent.map(p => p.id)], "ambiguous_blueprint_approval_postcondition", opResult.operation.id);
      await quarantineOperation(base44, opResult.operation.id, "ambiguous_postcondition");
      await releaseOrgRoleLock(base44, org_role_id, lock_token, opResult.operation.id);
      return Response.json({ error: "Ambiguous postcondition — quarantined", quarantined: true }, { status: 409 });
    }

    // 5. RELEASE lock
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
    await failOperation(base44, opResult.operation.id, "approve_blueprint_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}