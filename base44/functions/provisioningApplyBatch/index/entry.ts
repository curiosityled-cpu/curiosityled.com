import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

/**
 * POST /provisioning/batches/{batchId}/apply
 * 
 * POLICY: ADMIN-ONLY (Wix CANNOT call this endpoint)
 * Base44 admin triggers apply via UI after reviewing batch.
 * 
 * Applies a validated batch by upserting UserProfile and creating UserRoleAssignments.
 * Idempotent and resumable.
 * 
 * Request body:
 * {
 *   batchId: string,
 *   mode?: "RESUME",
 *   dryRun?: boolean,
 *   concurrency?: number,
 *   chunkSize?: number
 * }
 */
Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      console.error(`[${requestId}] No authenticated user`);
      return Response.json({ error: 'Unauthorized', requestId }, { status: 401 });
    }

    // ADMIN-ONLY: Wix cannot call this endpoint
    const allowedRoles = ['Admin Level 2', 'Super Administrator', 'Platform Admin'];
    if (!allowedRoles.includes(user.app_role)) {
      console.error(`[${requestId}] Forbidden: role=${user.app_role}`);
      return Response.json({ error: 'Forbidden: Admin access required', requestId }, { status: 403 });
    }

    const isPlatformAdmin = user.app_role === 'Platform Admin';

    const body = await req.json();
    const { batchId } = body;

    if (!batchId) {
      console.error(`[${requestId}] Missing batchId`);
      return Response.json({ error: 'Missing batchId', requestId }, { status: 400 });
    }

    console.log(`[${requestId}] Apply batch request: batchId=${batchId}, user=${user.email}`);
    const { 
      mode = 'RESUME', 
      dryRun = false, 
      concurrency = 3, 
      chunkSize = 25,
      maxAttempts = 6
    } = body;

    // Validate limits
    const safeConcurrency = Math.min(Math.max(1, concurrency), 5);
    const safeChunkSize = Math.min(Math.max(1, chunkSize), 200);
    const safeMaxAttempts = Math.min(Math.max(1, maxAttempts), 10);

    // Get batch
    const batches = await base44.asServiceRole.entities.ProvisioningBatch.filter({ id: batchId });
    if (batches.length === 0) {
      console.error(`[${requestId}] Batch not found: ${batchId}`);
      return Response.json({ error: 'Batch not found', requestId }, { status: 404 });
    }
    const batch = batches[0];

    // Verify tenant boundary
    const userTenantId = user.client_id;
    if (!isPlatformAdmin && batch.tenant_id !== userTenantId) {
      console.error(`[${requestId}] Tenant mismatch: batch=${batch.tenant_id}, user=${userTenantId}`);
      return Response.json({ error: 'Forbidden: Cannot access batch from different tenant', requestId }, { status: 403 });
    }

    console.log(`[${requestId}] Applying batch: tenant=${batch.tenant_id}, valid_rows=${batch.valid_rows}`);

    // Get VALID users that need applying based on mode
    const skipStatuses = ['READY_TO_INVITE', 'INVITE_SENT', 'AWAITING_LOGIN', 'LINKED', 'ACTIVE'];
    
    const allUsers = await base44.asServiceRole.entities.ProvisioningUser.filter({
      batch_id: batchId,
      validation_status: 'VALID'
    });

    // Filter based on mode
    let users = allUsers;
    if (mode !== 'RESUME') {
      users = allUsers.filter(u => !skipStatuses.includes(u.apply_status) && u.apply_status !== 'APPLY_FAILED');
    } else {
      users = allUsers.filter(u => !skipStatuses.includes(u.apply_status));
    }

    let profileUpserted = 0;
    let entitlementsApplied = 0;
    let failed = 0;
    let skipped = 0;
    let consecutiveFailures = 0;
    const circuitBreakerThreshold = 20;

    // Exponential backoff helper
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const exponentialBackoff = (attempt) => {
      const baseDelay = 100;
      const maxDelay = 10000;
      const jitter = Math.random() * 100;
      return Math.min(maxDelay, baseDelay * Math.pow(2, attempt) + jitter);
    };

    // Apply engine with retries
    const applyUserWithRetry = async (provUser) => {
      // Skip if already applied
      if (skipStatuses.includes(provUser.apply_status)) {
        return { success: true, skipped: true };
      }

      if (dryRun) {
        return { success: true, dryRun: true };
      }

      // Check max attempts
      if (provUser.apply_attempts >= safeMaxAttempts) {
        return { success: false, error: 'Max attempts reached', maxed: true };
      }

      let lastError = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const payload = provUser.profile_payload;
          const email = provUser.email.toLowerCase().trim();

          // Step 1: Upsert UserProfile
          const existingProfiles = await base44.asServiceRole.entities.UserProfile.filter({
            tenant_id: batch.tenant_id,
            email: email
          });

          if (existingProfiles.length > 0) {
            // Update existing (never downgrade from ACTIVE)
            const current = existingProfiles[0];
            await base44.asServiceRole.entities.UserProfile.update(current.id, {
              first_name: payload.firstName,
              last_name: payload.lastName,
              department: payload.department || null,
              manager_email: payload.managerEmail || null,
              custom_role_ids: payload.customRoles || [],
              status: current.status === 'ACTIVE' ? 'ACTIVE' : 'PROVISIONED',
              source_system: batch.source_system,
              source_user_ref: payload.externalUserRef || null,
              last_synced_at: new Date().toISOString()
            });
          } else {
            // Create new
            await base44.asServiceRole.entities.UserProfile.create({
              tenant_id: batch.tenant_id,
              email: email,
              first_name: payload.firstName,
              last_name: payload.lastName,
              department: payload.department || null,
              manager_email: payload.managerEmail || null,
              custom_role_ids: payload.customRoles || [],
              status: 'PROVISIONED',
              source_system: batch.source_system,
              source_user_ref: payload.externalUserRef || null,
              last_synced_at: new Date().toISOString()
            });
          }

          // Step 2: Upsert UserRoleAssignments (email-keyed, idempotent)
          if (payload.customRoles && payload.customRoles.length > 0) {
            // Get roles once per apply call (cache)
            const roles = await base44.asServiceRole.entities.ProvisioningRole.filter({
              tenant_id: batch.tenant_id
            });
            const roleMap = new Map(roles.map(r => [r.name, r.id]));

            // Get existing assignments for this user
            const existingAssignments = await base44.asServiceRole.entities.UserRoleAssignment.filter({
              tenant_id: batch.tenant_id,
              email: email
            });
            const existingRoleIds = new Set(existingAssignments.map(a => a.role_id));

            for (const roleName of payload.customRoles) {
              const roleId = roleMap.get(roleName);
              if (roleId && !existingRoleIds.has(roleId)) {
                await base44.asServiceRole.entities.UserRoleAssignment.create({
                  tenant_id: batch.tenant_id,
                  role_id: roleId,
                  email: email,
                  source_system: batch.source_system
                });
              }
            }
          }

          // Step 3: Update ProvisioningUser status
          await base44.asServiceRole.entities.ProvisioningUser.update(provUser.id, {
            apply_status: 'READY_TO_INVITE',
            apply_attempts: provUser.apply_attempts + 1
          });

          return { success: true };

        } catch (error) {
          lastError = error;
          
          // Check if retryable (429, 5xx)
          const isRetryable = error.status === 429 || (error.status >= 500 && error.status < 600);
          
          if (isRetryable && attempt < 2) {
            const delay = exponentialBackoff(attempt);
            await sleep(delay);
            continue;
          }
          
          break;
        }
      }

      // All retries failed
      await base44.asServiceRole.entities.ProvisioningUser.update(provUser.id, {
        apply_status: 'APPLY_FAILED',
        apply_attempts: provUser.apply_attempts + 1,
        last_apply_error: {
          message: lastError?.message || 'Unknown error',
          step: 'apply',
          attempt: provUser.apply_attempts + 1,
          timestamp: new Date().toISOString()
        }
      });

      return { success: false, error: lastError?.message };
    };

    // Process in chunks with circuit breaker
    for (let i = 0; i < users.length; i += safeChunkSize) {
      // Circuit breaker check
      if (consecutiveFailures >= circuitBreakerThreshold) {
        console.error(`[${requestId}] Circuit breaker tripped: ${consecutiveFailures} consecutive failures`);
        
        // Log to ActivityLog
        await base44.asServiceRole.entities.ActivityLog.create({
          timestamp: new Date().toISOString(),
          initiator_user_email: user.email,
          action_type: 'PROVISIONING_BATCH_APPLIED',
          client_id: batch.tenant_id,
          metadata: {
            batch_id: batchId,
            source_system: batch.source_system,
            result: 'FAILED',
            circuit_breaker_tripped: true,
            consecutive_failures: consecutiveFailures,
            processed: i,
            total: users.length,
            request_id: requestId
          }
        });
        
        break;
      }

      const chunk = users.slice(i, i + safeChunkSize);
      const results = await Promise.all(chunk.map(applyUserWithRetry));

      let chunkFailures = 0;
      for (const result of results) {
        if (result.skipped) {
          skipped++;
        } else if (result.dryRun) {
          // Count as success for dry run
        } else if (result.success) {
          profileUpserted++;
          entitlementsApplied++;
          consecutiveFailures = 0;
        } else {
          failed++;
          chunkFailures++;
          consecutiveFailures++;
        }
      }

      // Small delay between chunks
      if (i + safeChunkSize < users.length) {
        await sleep(100);
      }
    }

    // Update batch status
    const finalStatus = failed === 0 ? 'APPLIED' : (profileUpserted > 0 ? 'PARTIALLY_APPLIED' : 'FAILED');
    await base44.asServiceRole.entities.ProvisioningBatch.update(batch.id, {
      status: finalStatus,
      applied_at: new Date().toISOString()
    });

    // Log to ActivityLog
    await base44.asServiceRole.entities.ActivityLog.create({
      timestamp: new Date().toISOString(),
      initiator_user_email: user.email,
      action_type: 'PROVISIONING_BATCH_APPLIED',
      client_id: batch.tenant_id,
      metadata: {
        batch_id: batchId,
        source_system: batch.source_system,
        status: finalStatus,
        result: failed === 0 ? 'SUCCESS' : (profileUpserted > 0 ? 'PARTIAL' : 'FAILED'),
        profile_upserted: profileUpserted,
        entitlements_applied: entitlementsApplied,
        failed,
        skipped,
        circuit_breaker_tripped: consecutiveFailures >= circuitBreakerThreshold,
        request_id: requestId
      }
    });

    console.log(`[${requestId}] Apply complete: status=${finalStatus}, upserted=${profileUpserted}, failed=${failed}`);

    return Response.json({
      batchId: batch.id,
      status: finalStatus,
      appliedAt: new Date().toISOString(),
      results: {
        profileUpserted,
        entitlementsApplied,
        failed,
        skipped
      },
      circuitBreakerTripped: consecutiveFailures >= circuitBreakerThreshold,
      requestId
    });

  } catch (error) {
    console.error(`[${requestId}] Apply batch error:`, error.message);
    console.error(`[${requestId}] Stack:`, error.stack);
    
    // Only include stack traces for Platform Admin
    const errorResponse = {
      error: error.message,
      requestId,
      timestamp: new Date().toISOString()
    };
    
    if (isPlatformAdmin) {
      errorResponse.details = error.stack;
    }
    
    return Response.json(errorResponse, { status: 500 });
  }
});