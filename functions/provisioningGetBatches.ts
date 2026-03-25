import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

/**
 * GET /provisioning/batches?status=VALIDATED
 * 
 * ADMIN-ONLY: List provisioning batches for current tenant.
 * 
 * Query params:
 * - status: Filter by batch status (optional)
 * - limit: Max records to return (default 50, max 200)
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
    const status = url.searchParams.get('status');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);

    // Build query
    const query = {};
    
    // Tenant scoping (Platform Admin can see all)
    if (!isPlatformAdmin) {
      query.tenant_id = user.client_id;
    }
    
    if (status) {
      query.status = status;
    }

    const batches = await base44.asServiceRole.entities.ProvisioningBatch.filter(
      query,
      '-created_date',
      limit
    );

    console.log(`[${requestId}] List batches: tenant=${query.tenant_id || 'all'}, count=${batches.length}`);

    return Response.json({ 
      batches,
      count: batches.length,
      requestId
    });

  } catch (error) {
    console.error(`[${requestId}] List batches error:`, error.message);
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