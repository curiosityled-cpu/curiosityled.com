/**
 * successionLockHelper — OrgRole blueprint approval lock via CAS.
 *
 * CAS capability is VERIFIED (spike passed in both app-user and service-role):
 *   updateMany returns { success, updated, has_more }
 *   two concurrent conditional updates yield exactly one updated:1, one updated:0
 *
 * Lock protocol:
 *   1. ACQUIRE via conditional updateMany on OrgRole (lock absent OR expired by SAME op)
 *   2. VERIFY expected current_blueprint_id + revision
 *   3. PERFORM blueprint approval mutation(s)
 *   4. VERIFY postcondition: exactly one status=approved, is_current=true blueprint
 *      matching OrgRole.current_blueprint_id
 *   5. RELEASE via conditional updateMany (match lock_token + operation_id)
 *
 * An expired lock is NOT auto-acquired by a different operation — it enters recovery.
 * Only the same operation may renew/resume it unless an authorized integrity-resolution
 * action clears the lock.
 */

const LOCK_TTL_SECONDS = 60;

export interface LockAcquireInput {
  base44: any;
  org_role_id: string;
  operation_id: string;
  expected_blueprint_id: string | null;
  expected_revision: number;
}

export interface LockAcquireResult {
  acquired: boolean;
  reason?: string;
  lock_token?: string;
  stale_state?: boolean;
  expired_foreign_lock?: boolean;
}

/**
 * Acquire the OrgRole blueprint approval lock.
 * Uses equality-based CAS: lock_token must be null/absent (not a complex $or).
 * An expired lock held by a DIFFERENT operation is NOT acquired — it enters recovery.
 */
export async function acquireOrgRoleLock(
  input: LockAcquireInput
): Promise<LockAcquireResult> {
  const { base44, org_role_id, operation_id } = input;
  const lock_token = crypto.randomUUID();
  const now = new Date();
  const expires_at = new Date(now.getTime() + LOCK_TTL_SECONDS * 1000).toISOString();

  // Read current state
  const roles = await base44.asServiceRole.entities.OrgRole.filter({ id: org_role_id });
  if (roles.length === 0) {
    return { acquired: false, reason: "ORG_ROLE_NOT_FOUND" };
  }
  const role = roles[0];

  // Check if locked by a different operation
  if (role.blueprint_approval_lock_token) {
    const isOurs = role.blueprint_approval_lock_operation_id === operation_id;
    const isExpired = role.blueprint_approval_lock_expires_at
      ? new Date(role.blueprint_approval_lock_expires_at) < now
      : true;

    if (isOurs) {
      // Same operation may renew/resume — extend the lease
      const renewResult = await base44.asServiceRole.entities.OrgRole.updateMany(
        { id: org_role_id, blueprint_approval_lock_operation_id: operation_id },
        {
          $set: {
            blueprint_approval_lock_token: lock_token,
            blueprint_approval_lock_expires_at: expires_at,
          },
        }
      );
      if (renewResult.updated !== 1) {
        return { acquired: false, reason: "RENEW_FAILED" };
      }
    } else if (isExpired) {
      // Expired lock held by a DIFFERENT operation — do NOT auto-acquire. Enter recovery.
      return {
        acquired: false,
        reason: "EXPIRED_FOREIGN_LOCK_REQUIRES_RECOVERY",
        expired_foreign_lock: true,
      };
    } else {
      // Active lock by another operation
      return { acquired: false, reason: "LOCK_HELD_BY_OTHER" };
    }
  } else {
    // Lock is free — acquire via CAS (equality on null/absent token)
    const acquireResult = await base44.asServiceRole.entities.OrgRole.updateMany(
      {
        id: org_role_id,
        blueprint_approval_lock_token: null,
      },
      {
        $set: {
          blueprint_approval_lock_token: lock_token,
          blueprint_approval_lock_expires_at: expires_at,
          blueprint_approval_lock_operation_id: operation_id,
        },
      }
    );

    if (acquireResult.updated !== 1) {
      return { acquired: false, reason: "LOCK_NOT_ACQUIRED" };
    }
  }

  // VERIFY expected state
  const updatedRoles = await base44.asServiceRole.entities.OrgRole.filter({ id: org_role_id });
  if (updatedRoles.length === 0) {
    return { acquired: false, reason: "ORG_ROLE_VANISHED" };
  }
  const updatedRole = updatedRoles[0];
  if (
    updatedRole.current_blueprint_id !== input.expected_blueprint_id ||
    updatedRole.blueprint_approval_revision !== input.expected_revision
  ) {
    // Stale state — release and return
    await releaseOrgRoleLock(base44, org_role_id, lock_token, operation_id);
    return {
      acquired: false,
      reason: "STALE_STATE",
      stale_state: true,
    };
  }

  return { acquired: true, lock_token };
}

/**
 * Reconfirm lock ownership before a mutation. Lock must match token + operation_id.
 */
export async function reconfirmLockOwnership(
  base44: any,
  org_role_id: string,
  lock_token: string,
  operation_id: string
): Promise<boolean> {
  const roles = await base44.asServiceRole.entities.OrgRole.filter({ id: org_role_id });
  if (roles.length === 0) return false;
  const role = roles[0];
  return (
    role.blueprint_approval_lock_token === lock_token &&
    role.blueprint_approval_lock_operation_id === operation_id
  );
}

/**
 * Release the lock. Must match lock_token AND operation_id.
 */
export async function releaseOrgRoleLock(
  base44: any,
  org_role_id: string,
  lock_token: string,
  operation_id: string
): Promise<boolean> {
  const result = await base44.asServiceRole.entities.OrgRole.updateMany(
    {
      id: org_role_id,
      blueprint_approval_lock_token: lock_token,
      blueprint_approval_lock_operation_id: operation_id,
    },
    {
      $unset: {
        blueprint_approval_lock_token: 1,
        blueprint_approval_lock_expires_at: 1,
        blueprint_approval_lock_operation_id: 1,
      },
    }
  );
  return result.updated === 1;
}

/**
 * Force-clear an expired foreign lock — only via authorized integrity resolution.
 */
export async function forceClearExpiredLock(
  base44: any,
  org_role_id: string,
  clearing_operation_id: string
): Promise<boolean> {
  const result = await base44.asServiceRole.entities.OrgRole.updateMany(
    {
      id: org_role_id,
      blueprint_approval_lock_expires_at: { $lt: new Date().toISOString() },
    },
    {
      $unset: {
        blueprint_approval_lock_token: 1,
        blueprint_approval_lock_expires_at: 1,
        blueprint_approval_lock_operation_id: 1,
      },
    }
  );
  return result.updated === 1;
}