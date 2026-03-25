import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

/**
 * POST /provisioning/api-keys/generate
 * 
 * PLATFORM ADMIN ONLY: Generates a new API key scoped to a tenant.
 * 
 * Request body:
 * {
 *   tenantId: string,
 *   metadata?: object
 * }
 * 
 * Returns:
 * {
 *   apiKey: string (ONLY returned once - must be saved by caller),
 *   keyId: string,
 *   tenantId: string
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

    // Platform Admin only
    if (user.app_role !== 'Platform Admin') {
      console.error(`[${requestId}] Forbidden: role=${user.app_role}`);
      return Response.json({ error: 'Forbidden: Platform Admin access required', requestId }, { status: 403 });
    }

    const { tenantId, metadata } = await req.json();

    if (!tenantId) {
      console.error(`[${requestId}] Missing tenantId`);
      return Response.json({ error: 'Missing tenantId', requestId }, { status: 400 });
    }

    // Verify tenant exists
    const tenants = await base44.asServiceRole.entities.Tenant.filter({ id: tenantId });
    if (tenants.length === 0) {
      console.error(`[${requestId}] Tenant not found: ${tenantId}`);
      return Response.json({ error: 'Tenant not found', requestId }, { status: 404 });
    }

    // Generate random API key (32 bytes = 64 hex chars)
    const keyBytes = new Uint8Array(32);
    crypto.getRandomValues(keyBytes);
    const keyHex = Array.from(keyBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const apiKey = `sk_prov_${keyHex}`;

    // Hash the key for storage
    const encoder = new TextEncoder();
    const keyData = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", keyData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Store key record
    const keyRecord = await base44.asServiceRole.entities.ProvisioningApiKey.create({
      tenant_id: tenantId,
      key_hash: keyHash,
      key_prefix: apiKey.substring(0, 12),
      status: 'ACTIVE',
      created_by_email: user.email,
      usage_count: 0,
      metadata: metadata || {}
    });

    console.log(`[${requestId}] API key generated: keyId=${keyRecord.id}, tenant=${tenantId}`);

    // CRITICAL: Only return the plain API key ONCE
    return Response.json({
      apiKey,  // Plain key - save this immediately!
      keyId: keyRecord.id,
      tenantId,
      keyPrefix: apiKey.substring(0, 12),
      warning: 'Save this API key now. It will not be shown again.',
      requestId
    });

  } catch (error) {
    console.error(`[${requestId}] Generate API key error:`, error.message);
    console.error(`[${requestId}] Stack:`, error.stack);
    return Response.json({ 
      error: error.message,
      details: error.stack,
      requestId
    }, { status: 500 });
  }
});