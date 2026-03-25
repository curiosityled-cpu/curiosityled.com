import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

/**
 * GET /provisioning/batches/{batchId}?includeUsers=true
 * 
 * ADMIN-ONLY: Gets batch details with optional user list.
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

    // Admin-only
    const allowedRoles = ['Admin Level 2', 'Super Administrator', 'Platform Admin'];
    if (!allowedRoles.includes(user.app_role)) {
      console.error(`[${requestId}] Forbidden: role=${user.app_role}`);
      return Response.json({ error: 'Forbidden: Admin access required', requestId }, { status: 403 });
    }

    const isPlatformAdmin = user.app_role === 'Platform Admin';

    const url = new URL(req.url);
    const batchId = url.searchParams.get('batchId');
    const includeUsers = url.searchParams.get('includeUsers') === 'true';

    if (!batchId) {
      console.error(`[${requestId}] Missing batchId`);
      return Response.json({ error: 'Missing batchId', requestId }, { status: 400 });
    }

    // Fetch batch (derive tenant from batch, not request)
    const batches = await base44.asServiceRole.entities.ProvisioningBatch.filter({ id: batchId });

    if (batches.length === 0) {
      console.error(`[${requestId}] Batch not found: ${batchId}`);
      return Response.json({ error: 'Batch not found', requestId }, { status: 404 });
    }
    const batch = batches[0];
    const tenantId = batch.tenant_id;

    // Verify tenant boundary
    if (!isPlatformAdmin && user.client_id !== tenantId) {
      console.error(`[${requestId}] Tenant mismatch: batch=${tenantId}, user=${user.client_id}`);
      return Response.json({ error: 'Forbidden: Cannot access batch from different tenant', requestId }, { status: 403 });
    }

    console.log(`[${requestId}] Get batch detail: batchId=${batchId}, includeUsers=${includeUsers}`);

    const response = { batch };

    if (includeUsers) {
      const users = await base44.asServiceRole.entities.ProvisioningUser.filter({
        batch_id: batchId
      });
      response.users = users;

      // Calculate counts by apply_status
      const countsByStatus = {};
      for (const user of users) {
        const status = user.apply_status || 'NOT_APPLIED';
        countsByStatus[status] = (countsByStatus[status] || 0) + 1;
      }
      response.countsByApplyStatus = countsByStatus;
    }

    return Response.json({ ...response, requestId });

  } catch (error) {
    console.error(`[${requestId}] Get batch detail error:`, error.message);
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