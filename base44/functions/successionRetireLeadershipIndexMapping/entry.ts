import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";

/**
 * POST /successionRetireLeadershipIndexMapping
 *
 * Retires an approved mapping. Requires a reason. Retiring does NOT delete
 * or alter evidence previously created from the mapping. The retired mapping
 * is preserved as historical governance configuration.
 */

export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, mapping_id, retirement_reason } = body;

  if (!operation_id || !mapping_id) return Response.json({ error: "operation_id and mapping_id required" }, { status: 400 });
  if (!retirement_reason || !retirement_reason.trim()) return Response.json({ error: "retirement_reason required" }, { status: 400 });

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionRetireLeadershipIndexMapping",
    target_client_id: auth.client_id,
    required_permission: "succession.evidence.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionRetireLeadershipIndexMapping",
    payload: { mapping_id, retirement_reason },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);
    const cid = auth.client_id;
    const now = new Date().toISOString();

    // Load mapping
    const mappings = await base44.asServiceRole.entities.LeadershipIndexRequirementMapping.filter({ id: mapping_id, client_id: cid });
    if (mappings.length === 0) { await failOperation(base44, opResult.operation.id, "mapping_not_found"); return Response.json({ error: "Mapping not found" }, { status: 404 }); }
    const mapping = mappings[0];

    // Only approved mappings can be retired
    if (mapping.status !== "approved") { await failOperation(base44, opResult.operation.id, "mapping_not_approved"); return Response.json({ error: "Only approved mappings can be retired" }, { status: 400 }); }

    // Retire the mapping — do NOT delete or alter any evidence
    await base44.asServiceRole.entities.LeadershipIndexRequirementMapping.update(mapping_id, {
      status: "retired",
      is_current: false,
      retired_by_profile_id: auth.profile_id,
      retired_at: now,
      retirement_reason,
    });

    // Audit — no raw assessment content
    await writeSuccessionAuditEvent({
      base44, action_type: "li_mapping_retired",
      target_entity_type: "LeadershipIndexRequirementMapping",
      target_entity_id: mapping_id,
      metadata: {
        mapping_id,
        version_number: mapping.version_number,
        retirement_reason,
        note: "Retiring does not alter historical evidence created from this mapping",
      },
      operation_id,
    });

    await completeOperation(base44, opResult.operation.id, null, { mapping_id, status: "retired" });

    return Response.json({ operation_id, mapping_id, status: "retired", retirement_reason });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "retire_mapping_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}