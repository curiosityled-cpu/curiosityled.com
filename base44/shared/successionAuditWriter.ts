/**
 * successionAuditWriter — PRIVATE internal append-only audit writer.
 *
 * - NOT externally callable (it is a shared module, not a backend function).
 * - Does NOT recursively call authorizeSuccessionAction (no infinite recursion).
 * - Derives actor and tenant context SERVER-SIDE from the authenticated user.
 *   It never accepts actor/tenant values from frontend input.
 * - The ONLY SuccessionAuditEvent writer. No other code path may create
 *   audit events (entity RLS denies all app-user creates; only asServiceRole
 *   bypasses RLS, and this module is the sole asServiceRole writer).
 */

import { CONFIDENTIALITY_LEVELS } from "./successionConstants.ts";

export interface AuditEventInput {
  base44: any;
  action_type: string;
  target_entity_type?: string;
  target_entity_id?: string;
  target_user_profile_id?: string;
  metadata?: Record<string, any>;
  confidentiality_level?: string;
  // Optional override for the client_id (e.g. target tenant for a cross-tenant
  // denial). If omitted, derived from the authenticated user.
  client_id_override?: string;
  // Optional context type override (defaults to "tenant" or "platform_operator")
  actor_context_type_override?: string;
  // At-least-once delivery + deduplication fields
  operation_id?: string;
  event_key?: Record<string, any> | string;
  event_type?: string;
  target_record_id?: string;
  attempt_number?: number;
}

export async function writeSuccessionAuditEvent(input: AuditEventInput): Promise<any> {
  const { base44, action_type } = input;

  // Derive actor + tenant context server-side — never from input
  let user: any;
  try {
    user = await base44.auth.me();
  } catch {
    // If we cannot authenticate, we cannot write a meaningful audit event.
    // Do NOT throw — failing silently prevents audit-write failures from
    // crashing the calling function. The denial itself is the security control.
    return null;
  }

  const role = user.app_role || user.data?.app_role || user.role;
  const isPlatformAdmin =
    role === "Platform Admin" ||
    role === "Platform Administrator" ||
    role === "admin";

  const client_id =
    input.client_id_override ||
    user.client_id ||
    user.data?.client_id ||
    null;

  // If we have no client_id at all, we cannot partition the audit event.
  // Skip rather than write an unpartitioned record.
  if (!client_id) {
    return null;
  }

  const actor_context_type =
    input.actor_context_type_override ||
    (isPlatformAdmin ? "platform_operator" : "tenant");

  const record = {
    client_id,
    actor_profile_id: user.id || null,
    actor_email: user.email || null,
    actor_role: role || null,
    actor_context_type,
    action_type,
    target_entity_type: input.target_entity_type || null,
    target_entity_id: input.target_entity_id || null,
    target_user_profile_id: input.target_user_profile_id || null,
    metadata: input.metadata || {},
    timestamp: new Date().toISOString(),
    confidentiality_level: input.confidentiality_level || CONFIDENTIALITY_LEVELS.STANDARD,
    operation_id: input.operation_id || null,
    event_key: input.event_key
      ? (typeof input.event_key === "string" ? input.event_key : JSON.stringify(input.event_key))
      : null,
    event_type: input.event_type || null,
    target_record_id: input.target_record_id || null,
    attempt_number: input.attempt_number ?? 1,
  };

  try {
    return await base44.asServiceRole.entities.SuccessionAuditEvent.create(record);
  } catch {
    // Never throw from the audit writer — a failed audit write must not crash
    // the calling function or expose a denial-of-service vector.
    return null;
  }
}