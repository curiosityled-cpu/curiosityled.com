import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

/**
 * GET /provisioning/batches/{batchId}/exports/status.csv
 * 
 * ADMIN-ONLY: Exports all users with status as CSV
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

    if (!batchId) {
      console.error(`[${requestId}] Missing batchId`);
      return Response.json({ error: 'Missing batchId', requestId }, { status: 400 });
    }

    // Get batch to derive tenantId (server-side authority)
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

    console.log(`[${requestId}] Exporting status CSV: batchId=${batchId}`);

    // Get all users
    const users = await base44.asServiceRole.entities.ProvisioningUser.filter({
      batch_id: batchId
    });

    // Build CSV
    const headers = ['Row', 'Email', 'First Name', 'Last Name', 'Validation Status', 'Apply Status', 'Attempts', 'Last Error'];
    const rows = users.map(u => {
      const row = u.profile_payload?.rowNumber || '';
      const lastError = u.last_apply_error ? u.last_apply_error.message : '';
      return [
        row, 
        u.email, 
        u.first_name, 
        u.last_name, 
        u.validation_status, 
        u.apply_status,
        u.apply_attempts,
        lastError
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="status-batch-${batchId}.csv"`
      }
    });

  } catch (error) {
    console.error(`[${requestId}] Export status CSV error:`, error.message);
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