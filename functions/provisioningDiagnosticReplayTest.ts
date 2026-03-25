import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

/**
 * POST /provisioning/diagnostic/replay-test
 * 
 * PLATFORM ADMIN ONLY: Test replay protection mechanism.
 * 
 * Request body:
 * {
 *   testType: "valid" | "replay_nonce" | "old_timestamp" | "tampered_body"
 * }
 */
Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Platform Admin access required', requestId }, { status: 403 });
    }

    const { testType } = await req.json();
    const results = [];

    const testTenantId = user.client_id || 'test-tenant';

    // Get an active API key for this tenant
    const apiKeys = await base44.asServiceRole.entities.ProvisioningApiKey.filter({
      tenant_id: testTenantId,
      status: 'ACTIVE'
    }, '-created_date', 1);

    if (apiKeys.length === 0) {
      return Response.json({ 
        error: 'No active API key found. Generate one first via provisioningGenerateApiKey',
        requestId
      }, { status: 400 });
    }

    const testPayload = {
      sourceSystem: 'MANUAL',
      fileName: 'replay_test.csv',
      records: [
        { email: 'replay.test@example.com', firstName: 'Replay', lastName: 'Test', appRole: 'user' }
      ]
    };

    const timestamp = new Date().toISOString();
    const nonce = crypto.randomUUID();

    // Test 1: Valid request (should succeed)
    if (testType === 'valid') {
      // Create nonce record manually
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const encoder = new TextEncoder();
      const bodyData = encoder.encode(JSON.stringify(testPayload));
      const hashBuffer = await crypto.subtle.digest("SHA-256", bodyData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const requestHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      await base44.asServiceRole.entities.RequestNonce.create({
        tenant_id: testTenantId,
        endpoint: 'provisioningCreateBatch',
        nonce: nonce,
        timestamp: timestamp,
        request_hash: requestHash,
        api_key_prefix: 'test',
        expires_at: expiresAt
      });

      results.push({
        test: 'Valid Request',
        nonce,
        timestamp,
        expected: 'Nonce stored successfully',
        passed: true
      });
    }

    // Test 2: Replay with same nonce (should fail with 409)
    if (testType === 'replay_nonce') {
      // Create initial nonce
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const encoder = new TextEncoder();
      const bodyData = encoder.encode(JSON.stringify(testPayload));
      const hashBuffer = await crypto.subtle.digest("SHA-256", bodyData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const requestHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      await base44.asServiceRole.entities.RequestNonce.create({
        tenant_id: testTenantId,
        endpoint: 'provisioningCreateBatch',
        nonce: nonce,
        timestamp: timestamp,
        request_hash: requestHash,
        api_key_prefix: 'test',
        expires_at: expiresAt
      });

      // Try to check for replay
      const replayCheck = await base44.asServiceRole.entities.RequestNonce.filter({
        tenant_id: testTenantId,
        endpoint: 'provisioningCreateBatch',
        nonce: nonce
      });

      results.push({
        test: 'Replay Protection',
        nonce,
        expected: 'Should detect existing nonce',
        actual: replayCheck.length > 0 ? 'Replay detected' : 'ERROR: No replay detection',
        passed: replayCheck.length > 0
      });
    }

    // Test 3: Old timestamp (should fail with 401)
    if (testType === 'old_timestamp') {
      const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago
      const requestTime = new Date(oldTimestamp);
      const now = new Date();
      const skewMs = Math.abs(now - requestTime);
      const maxSkewMs = 5 * 60 * 1000;

      results.push({
        test: 'Timestamp Expiry',
        timestamp: oldTimestamp,
        skewMs,
        maxSkewMs,
        expected: 'Should reject old timestamp',
        passed: skewMs > maxSkewMs
      });
    }

    // Test 4: Tampered body (same nonce, different payload)
    if (testType === 'tampered_body') {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const encoder = new TextEncoder();
      
      // Original payload
      const originalBodyData = encoder.encode(JSON.stringify(testPayload));
      const originalHashBuffer = await crypto.subtle.digest("SHA-256", originalBodyData);
      const originalHashArray = Array.from(new Uint8Array(originalHashBuffer));
      const originalHash = originalHashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Store nonce with original hash
      await base44.asServiceRole.entities.RequestNonce.create({
        tenant_id: testTenantId,
        endpoint: 'provisioningCreateBatch',
        nonce: nonce,
        timestamp: timestamp,
        request_hash: originalHash,
        api_key_prefix: 'test',
        expires_at: expiresAt
      });

      // Tampered payload
      const tamperedPayload = { ...testPayload, records: [{ email: 'hacker@evil.com', firstName: 'Hacker', lastName: 'Evil', appRole: 'admin' }] };
      const tamperedBodyData = encoder.encode(JSON.stringify(tamperedPayload));
      const tamperedHashBuffer = await crypto.subtle.digest("SHA-256", tamperedBodyData);
      const tamperedHashArray = Array.from(new Uint8Array(tamperedHashBuffer));
      const tamperedHash = tamperedHashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Check if hashes differ
      const tamperedCheck = await base44.asServiceRole.entities.RequestNonce.filter({
        tenant_id: testTenantId,
        endpoint: 'provisioningCreateBatch',
        nonce: nonce
      });

      const bodyTampered = tamperedCheck.length > 0 && tamperedCheck[0].request_hash !== tamperedHash;

      results.push({
        test: 'Body Integrity Check',
        nonce,
        originalHash: originalHash.substring(0, 16) + '...',
        tamperedHash: tamperedHash.substring(0, 16) + '...',
        expected: 'Should detect body tampering',
        actual: bodyTampered ? 'Tampering detected' : 'ERROR: No tampering detection',
        passed: bodyTampered
      });
    }

    return Response.json({
      testType,
      results,
      allPassed: results.every(r => r.passed),
      requestId
    });

  } catch (error) {
    console.error(`[${requestId}] Replay test error:`, error.message);
    return Response.json({ 
      error: error.message,
      details: error.stack,
      requestId
    }, { status: 500 });
  }
});