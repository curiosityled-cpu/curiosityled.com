import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

/**
 * GET /provisioning/health
 * 
 * Public health check endpoint (no auth required).
 * Returns basic system status for uptime monitoring.
 */
Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  
  try {
    const base44 = createClientFromRequest(req);
    
    // Quick DB check - just verify we can query
    await base44.asServiceRole.entities.ProvisioningBatch.filter({}, '', 1);
    
    return Response.json({
      ok: true,
      timestamp: new Date().toISOString(),
      requestId
    });
    
  } catch (error) {
    console.error(`[${requestId}] Health check failed:`, error.message);
    return Response.json({
      ok: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      requestId
    }, { status: 503 });
  }
});