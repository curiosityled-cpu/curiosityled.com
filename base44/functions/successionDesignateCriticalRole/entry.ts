import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";
import { validateUniqueness } from "../../shared/successionIntegrityHelper.ts";

/**
 * POST /successionDesignateCriticalRole
 * Designates an OrgPosition as a CriticalRole within a cycle.
 * Enforces one non-removed CriticalRole per client_id + cycle_id + org_position_id.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, cycle_id, org_position_id, criticality_level, governance_tier, continuity_urgency, designation_reason } = body;

  if (!operation_id || !cycle_id || !org_position_id || !designation_reason) {
    return Response.json({ error: "operation_id, cycle_id, org_position_id, designation_reason required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionDesignateCriticalRole", target_client_id: auth.client_id, required_permission: "succession.roles.manage" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({ base44, client_id: auth.client_id, operation_id, function_name: "successionDesignateCriticalRole", payload: { cycle_id, org_position_id, criticality_level, governance_tier, continuity_urgency, designation_reason }, actor_profile_id: auth.profile_id, actor_email: auth.email, actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant" });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // Cross-tenant validation: cycle + position must belong to caller's tenant
    const cycle = await validateSameTenantReference(base44, "SuccessionCycle", cycle_id, auth.client_id);
    if (!cycle) { await writeDeniedReferenceEvent(base44, auth, "SuccessionCycle", cycle_id, "cross_tenant_or_not_found"); await failOperation(base44, opResult.operation.id, "cycle_not_found"); return Response.json({ error: "Cycle not found" }, { status: 404 }); }

    const position = await validateSameTenantReference(base44, "OrgPosition", org_position_id, auth.client_id);
    if (!position) { await writeDeniedReferenceEvent(base44, auth, "OrgPosition", org_position_id, "cross_tenant_or_not_found"); await failOperation(base44, opResult.operation.id, "position_not_found"); return Response.json({ error: "OrgPosition not found" }, { status: 404 }); }

    // Enforce one non-removed CriticalRole per client_id + cycle_id + org_position_id
    const existing = await base44.asServiceRole.entities.CriticalRole.filter({
      client_id: auth.client_id, cycle_id, org_position_id, status: { $ne: "removed" }, integrity_status: "active",
    });
    if (existing.length > 0) {
      await failOperation(base44, opResult.operation.id, "duplicate_designation");
      return Response.json({ error: "A non-removed CriticalRole already exists for this cycle + position. Remove the existing designation first.", existing_critical_role_id: existing[0].id }, { status: 409 });
    }

    const now = new Date().toISOString();
    const criticalRole = await base44.asServiceRole.entities.CriticalRole.create({
      client_id: auth.client_id, cycle_id, org_position_id,
      criticality_level: criticality_level || "high",
      governance_tier: governance_tier || "senior",
      continuity_urgency: continuity_urgency || "short_term",
      designation_reason,
      status: "designated",
      designated_by_profile_id: auth.profile_id,
      designated_at: now,
      status_changed_at: now,
      status_changed_by_profile_id: auth.profile_id,
      confidentiality_level: "confidential",
      integrity_status: "pending_validation",
    });

    // Uniqueness validation (active non-removed per cycle+position)
    const uniqueness = await validateUniqueness(base44, "CriticalRole", criticalRole.id, {
      client_id: auth.client_id, cycle_id, org_position_id, status: { $ne: "removed" }, integrity_status: "active",
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "critical_role_designated", target_entity_type: "CriticalRole", target_entity_id: criticalRole.id,
      metadata: { cycle_id, org_position_id, criticality_level, governance_tier, continuity_urgency, is_unique: uniqueness.is_unique },
      operation_id, event_key: { action: "critical_role_designated", critical_role_id: criticalRole.id },
      event_type: "domain_action_completed", target_record_id: criticalRole.id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, { critical_role_id: criticalRole.id, integrity_status: uniqueness.is_unique ? "active" : "quarantined" });
    return Response.json({ operation_id, critical_role_id: criticalRole.id, status: "designated", integrity_status: uniqueness.is_unique ? "active" : "quarantined" });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "designate_critical_role_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}