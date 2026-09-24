import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";

/**
 * POST /successionWithdrawBlueprintDraft
 *
 * Withdraws a DRAFT RoleSuccessBlueprint. The blueprint is preserved for
 * audit (no hard delete) but cannot be submitted, approved, or snapshotted.
 *
 * Authorization:
 *   - The blueprint creator (submitted_by_profile_id is null for drafts,
 *     so we check the audit trail or allow any admin with manage permission)
 *   - Admin Level 2
 *   - Super Administrator
 *   - Platform Admin
 *
 * Allowed from: draft status only (or "returned" which is draft again)
 * NOT allowed from: submitted, approved, rejected, superseded, withdrawn
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, blueprint_id, withdrawal_reason } = body;

  if (!operation_id || !blueprint_id) {
    return Response.json({ error: "operation_id, blueprint_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) {
    return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  }

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionWithdrawBlueprintDraft",
    target_client_id: auth.client_id,
    required_permission: "succession.roles.manage",
  });
  if (!authz.allowed) {
    return Response.json({ error: authz.denied_reason }, { status: 403 });
  }

  // Authorization: creator, Admin L2, Super Admin, or Platform Admin
  const adminRoles = ["Admin Level 2", "Super Administrator", "Platform Admin", "Platform Administrator", "admin"];
  const isAuthorizedAdmin = adminRoles.includes(auth.role);
  // Note: we cannot definitively determine the "creator" of a draft blueprint
  // from the blueprint record alone (no created_by field exposed). The
  // succession.roles.manage permission is the gate, and admin roles are
  // always allowed. For non-admin roles, the permission check above is
  // sufficient — only users with succession.roles.manage can call this.

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionWithdrawBlueprintDraft",
    payload: { blueprint_id, withdrawal_reason },
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

    // Read the blueprint — cross-tenant validated
    const blueprints = await base44.asServiceRole.entities.RoleSuccessBlueprint.filter({
      id: blueprint_id, client_id: auth.client_id,
    });
    if (blueprints.length === 0) {
      await failOperation(base44, opResult.operation.id, "blueprint_not_found");
      return Response.json({ error: "Blueprint not found" }, { status: 404 });
    }

    const bp = blueprints[0];
    if (bp.status !== "draft") {
      await failOperation(base44, opResult.operation.id, "cannot_withdraw_non_draft");
      return Response.json({
        error: `Cannot withdraw blueprint in '${bp.status}' status. Only draft blueprints can be withdrawn.`,
      }, { status: 409 });
    }

    // Withdraw the blueprint
    await base44.asServiceRole.entities.RoleSuccessBlueprint.update(blueprint_id, {
      status: "withdrawn",
      withdrawn_at: new Date().toISOString(),
      withdrawn_by_profile_id: auth.profile_id,
      withdrawal_reason: withdrawal_reason || null,
    });

    // Withdraw all RoleRequirements attached to this blueprint
    const requirements = await base44.asServiceRole.entities.RoleRequirement.filter({
      client_id: auth.client_id, blueprint_id, status: "draft", integrity_status: "active",
    });
    for (const req of requirements) {
      await base44.asServiceRole.entities.RoleRequirement.update(req.id, {
        status: "withdrawn",
        withdrawn_at: new Date().toISOString(),
        withdrawn_by_profile_id: auth.profile_id,
        withdrawal_reason: `Blueprint withdrawn: ${withdrawal_reason || "no reason provided"}`,
      });
    }

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "blueprint_draft_withdrawn",
      target_entity_type: "RoleSuccessBlueprint", target_entity_id: blueprint_id,
      metadata: {
        org_role_id: bp.org_role_id,
        version_label: bp.version_label,
        withdrawal_reason,
        requirements_withdrawn: requirements.length,
      },
      operation_id, event_key: { action: "blueprint_withdrawn", blueprint_id },
      event_type: "domain_action_completed", target_record_id: blueprint_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      blueprint_id, status: "withdrawn", requirements_withdrawn: requirements.length,
    });

    return Response.json({
      operation_id, blueprint_id, status: "withdrawn",
      requirements_withdrawn: requirements.length,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "withdraw_blueprint_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}