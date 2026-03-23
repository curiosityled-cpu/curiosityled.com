import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

/**
 * POST /provisioning/cleanup/expired-nonces
 * 
 * PLATFORM ADMIN ONLY: Cleanup expired RequestNonce records (>24h old).
 * Should be run as scheduled automation daily.
 * 
 * No request body required.
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

    // Platform Admin only (scheduled automation)
    if (user.app_role !== 'Platform Admin') {
      console.error(`[${requestId}] Forbidden: role=${user.app_role}`);
      return Response.json({ error: 'Forbidden: Platform Admin access required', requestId }, { status: 403 });
    }

    const startTime = Date.now();
    const now = new Date().toISOString();
    
    // Find all expired nonces
    const expiredNonces = await base44.asServiceRole.entities.RequestNonce.filter({
      expires_at: { $lt: now }
    });

    // Get total nonce count (for storage guardrail)
    const allNonces = await base44.asServiceRole.entities.RequestNonce.filter({});
    const totalNonceCount = allNonces.length;

    console.log(`[${requestId}] Found ${expiredNonces.length} expired nonces, ${totalNonceCount} total`);

    // Storage guardrail - warn if nonce count is growing too large
    const NONCE_WARNING_THRESHOLD = 200000;
    const NONCE_CRITICAL_THRESHOLD = 500000;
    
    let storageWarning = null;
    if (totalNonceCount > NONCE_CRITICAL_THRESHOLD) {
      storageWarning = 'CRITICAL: Nonce count exceeds 500k. Increase cleanup frequency or reduce retention period.';
      console.error(`[${requestId}] ${storageWarning}`);
    } else if (totalNonceCount > NONCE_WARNING_THRESHOLD) {
      storageWarning = 'WARNING: Nonce count exceeds 200k. Monitor storage growth and consider increasing cleanup frequency.';
      console.warn(`[${requestId}] ${storageWarning}`);
    }

    // Delete in batches
    let deleted = 0;
    let deleteFailed = 0;
    for (const nonce of expiredNonces) {
      try {
        await base44.asServiceRole.entities.RequestNonce.delete(nonce.id);
        deleted++;
      } catch (error) {
        console.error(`[${requestId}] Failed to delete nonce ${nonce.id}:`, error.message);
        deleteFailed++;
      }
    }

    const durationMs = Date.now() - startTime;
    const remainingCount = totalNonceCount - deleted;

    console.log(`[${requestId}] Cleanup complete: deleted ${deleted}/${expiredNonces.length} nonces in ${durationMs}ms, ${remainingCount} remaining`);

    // Log to ActivityLog for monitoring
    await base44.asServiceRole.entities.ActivityLog.create({
      timestamp: new Date().toISOString(),
      initiator_user_email: user.email,
      action_type: 'PROVISIONING_NONCE_CLEANUP',
      client_id: 'system',
      metadata: {
        deleted_count: deleted,
        failed_count: deleteFailed,
        remaining_count: remainingCount,
        total_before_cleanup: totalNonceCount,
        duration_ms: durationMs,
        storage_warning: storageWarning,
        result: deleteFailed === 0 ? 'SUCCESS' : 'PARTIAL',
        request_id: requestId
      }
    });

    return Response.json({ 
      deleted,
      failed: deleteFailed,
      found: expiredNonces.length,
      remaining: remainingCount,
      totalBeforeCleanup: totalNonceCount,
      durationMs,
      storageWarning,
      requestId
    });

  } catch (error) {
    console.error(`[${requestId}] Cleanup error:`, error.message);
    console.error(`[${requestId}] Stack:`, error.stack);
    return Response.json({ 
      error: error.message,
      details: error.stack,
      requestId
    }, { status: 500 });
  }
});