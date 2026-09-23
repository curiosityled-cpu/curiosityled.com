/**
 * successionOperationHelper — SuccessionOperation lifecycle management.
 *
 * Idempotency is BEST-EFFORT: there is no unique constraint on
 * (client_id, function_name, operation_id). Duplicate operations may be
 * created; they are detected and quarantined with their affected domain results.
 *
 * Operation identity = client_id + function_name + operation_id.
 * payload_hash validates a retry; it does NOT replace operation_id.
 * Same operation_id with a different payload_hash → REJECTED.
 * Different operation_ids with the same payload → separate requests.
 */

import { computePayloadHash } from "./successionPayloadCanonical.ts";

export interface OperationCreateInput {
  base44: any;
  client_id: string;
  operation_id: string;
  function_name: string;
  payload: any;
  actor_profile_id: string;
  actor_email: string;
  actor_context_type: string;
  lease_ttl_seconds?: number;
}

export interface OperationCreateResult {
  operation: any;
  is_duplicate: boolean;
  duplicate_of_operation_id?: string;
  rejected_payload_mismatch?: boolean;
}

const DEFAULT_LEASE_TTL = 120; // seconds

/**
 * Create or attach to an existing SuccessionOperation.
 * Returns is_duplicate=true if an operation with the same identity already exists.
 * Rejects same operation_id with a different payload_hash.
 */
export async function createOrAttachOperation(
  input: OperationCreateInput
): Promise<OperationCreateResult> {
  const { base44, client_id, operation_id, function_name } = input;
  const payload_hash = await computePayloadHash(input.payload);
  const now = new Date();
  const lease_expires_at = new Date(
    now.getTime() + (input.lease_ttl_seconds || DEFAULT_LEASE_TTL) * 1000
  ).toISOString();
  const lease_token = crypto.randomUUID();

  // Check for existing operation with same identity
  const existing = await base44.asServiceRole.entities.SuccessionOperation.filter({
    client_id,
    operation_id,
    function_name,
  });

  if (existing.length > 0) {
    const op = existing[0];
    // Same operation_id + different payload → REJECT
    if (op.payload_hash && op.payload_hash !== payload_hash) {
      return {
        operation: op,
        is_duplicate: false,
        rejected_payload_mismatch: true,
      };
    }
    // Same operation_id + same payload → legitimate retry / attach
    return {
      operation: op,
      is_duplicate: true,
      duplicate_of_operation_id: op.id,
    };
  }

  // Create new operation
  const operation = await base44.asServiceRole.entities.SuccessionOperation.create({
    client_id,
    operation_id,
    function_name,
    status: "pending",
    integrity_status: "pending_validation",
    payload_hash,
    actor_profile_id: input.actor_profile_id,
    actor_email: input.actor_email,
    actor_context_type: input.actor_context_type,
    lease_token,
    lease_expires_at,
    attempt_count: 0,
    last_heartbeat_at: now.toISOString(),
  });

  return { operation, is_duplicate: false };
}

/**
 * Mark an operation as in_progress and increment attempt_count.
 */
export async function beginOperationExecution(
  base44: any,
  operation_id: string
): Promise<void> {
  const ops = await base44.asServiceRole.entities.SuccessionOperation.filter({
    id: operation_id,
  });
  if (ops.length === 0) return;
  const op = ops[0];
  await base44.asServiceRole.entities.SuccessionOperation.update(operation_id, {
    status: "in_progress",
    attempt_count: (op.attempt_count || 0) + 1,
    last_heartbeat_at: new Date().toISOString(),
    integrity_status: "active",
  });
}

/**
 * Heartbeat — update last_heartbeat_at to keep the lease alive.
 */
export async function heartbeatOperation(
  base44: any,
  operation_id: string
): Promise<void> {
  await base44.asServiceRole.entities.SuccessionOperation.update(operation_id, {
    last_heartbeat_at: new Date().toISOString(),
  });
}

/**
 * Complete an operation successfully. Sets status=completed, integrity_status=active.
 * Binds the audit_event_id.
 */
export async function completeOperation(
  base44: any,
  operation_id: string,
  audit_event_id: string,
  result_summary: Record<string, any>
): Promise<void> {
  await base44.asServiceRole.entities.SuccessionOperation.update(operation_id, {
    status: "completed",
    integrity_status: "active",
    audit_event_id,
    result_summary,
  });
}

/**
 * Fail an operation.
 */
export async function failOperation(
  base44: any,
  operation_id: string,
  error_code: string
): Promise<void> {
  await base44.asServiceRole.entities.SuccessionOperation.update(operation_id, {
    status: "failed",
    error_code,
  });
}

/**
 * Quarantine an operation (duplicate detected, ambiguous result, etc.).
 */
export async function quarantineOperation(
  base44: any,
  operation_id: string,
  reason: string
): Promise<void> {
  await base44.asServiceRole.entities.SuccessionOperation.update(operation_id, {
    integrity_status: "quarantined",
    error_code: reason,
  });
}

/**
 * Get operational status — minimum-necessary non-sensitive fields only.
 */
export async function getOperationStatus(
  base44: any,
  operation_id: string
): Promise<Record<string, any> | null> {
  const ops = await base44.asServiceRole.entities.SuccessionOperation.filter({
    id: operation_id,
  });
  if (ops.length === 0) return null;
  const op = ops[0];
  return {
    operation_id: op.operation_id,
    function_name: op.function_name,
    status: op.status,
    integrity_status: op.integrity_status,
    attempt_count: op.attempt_count,
    last_heartbeat_at: op.last_heartbeat_at,
    error_code: op.error_code,
    lease_expires_at: op.lease_expires_at,
  };
}

/**
 * Check if a lease has expired (for recovery decisions).
 */
export function isLeaseExpired(operation: any): boolean {
  if (!operation.lease_expires_at) return true;
  return new Date(operation.lease_expires_at) < new Date();
}