/**
 * successionCrossTenantValidation — shared cross-tenant reference validation.
 *
 * Every Phase 1 function accepting a record ID must verify the referenced
 * record belongs to the authenticated user's tenant before using it.
 *
 * This helper loads a record by ID + client_id and returns null if the
 * record doesn't exist or belongs to a different tenant. The caller
 * returns a generic not-found (404) without revealing whether a
 * cross-tenant record exists, and writes a denied-action audit event.
 *
 * Usage:
 *   const record = await validateSameTenantReference(base44, "OrgRole", org_role_id, auth.client_id);
 *   if (!record) {
 *     await writeDeniedReferenceEvent(base44, auth, entityName, record_id, "cross_tenant_or_not_found");
 *     return Response.json({ error: "Record not found" }, { status: 404 });
 *   }
 */

import { writeSuccessionAuditEvent } from "./successionAuditWriter.ts";

export async function validateSameTenantReference(
  base44: any,
  entityName: string,
  record_id: string,
  client_id: string
): Promise<any | null> {
  if (!record_id || !client_id) return null;
  try {
    const records = await base44.asServiceRole.entities[entityName].filter({
      id: record_id,
      client_id,
    });
    return records.length > 0 ? records[0] : null;
  } catch {
    return null;
  }
}

export async function writeDeniedReferenceEvent(
  base44: any,
  auth: any,
  target_entity_type: string,
  target_entity_id: string,
  reason: string
): Promise<void> {
  try {
    await writeSuccessionAuditEvent({
      base44,
      action_type: "denied_cross_tenant_reference",
      target_entity_type,
      target_entity_id,
      metadata: { reason, actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant" },
      event_key: { action: "denied_cross_tenant_reference", target_entity_type, target_entity_id },
      event_type: "denied_action",
      target_record_id: target_entity_id,
      attempt_number: 1,
    });
  } catch {
    // best-effort audit — never block on audit failure
  }
}