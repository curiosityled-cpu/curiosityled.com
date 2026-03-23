import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

/**
 * POST /provisioning/batches
 * 
 * Creates a new provisioning batch and validates user records.
 * 
 * Headers:
 * - Authorization: Bearer <PROVISIONING_API_KEY>
 * - X-Timestamp: ISO8601 timestamp
 * - X-Nonce: UUID
 * - X-Idempotency-Key: UUID (optional, different from nonce)
 * 
 * Request body:
 * {
 *   sourceSystem: "WIX" | "MANUAL" | "IAM" | "SCIM",
 *   fileName: string,
 *   records: Array<{...}>
 * }
 */
Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const ENDPOINT_KEY = 'provisioningCreateBatch';
  
  try {
    const base44 = createClientFromRequest(req);
    
    // Try to authenticate and check if Platform Admin
    let user = null;
    let isPlatformAdmin = false;
    let isExternalCaller = false;
    let resolvedTenantId = null;
    
    try {
      user = await base44.auth.me();
      isPlatformAdmin = user?.app_role === 'Platform Admin';
    } catch (e) {
      // Not authenticated - external caller must use API key
      isExternalCaller = true;
    }

    // API Key Authentication for external callers (Wix)
    if (!isPlatformAdmin) {
      const authHeader = req.headers.get('authorization');
      const timestamp = req.headers.get('x-timestamp');
      const nonce = req.headers.get('x-nonce');
      
      if (!authHeader || !timestamp || !nonce) {
        console.error(`[${requestId}] Missing auth headers`);

        // Log rejection
        await base44.asServiceRole.entities.ActivityLog.create({
          timestamp: new Date().toISOString(),
          initiator_user_email: 'external@api',
          action_type: 'PROVISIONING_EXTERNAL_REQUEST_REJECTED',
          client_id: 'unknown',
          metadata: {
            reason: 'MISSING_HEADERS',
            endpoint_key: ENDPOINT_KEY,
            request_id: requestId
          }
        });

        return Response.json(
          { error: 'Unauthorized: Missing required headers (Authorization, X-Timestamp, X-Nonce)', requestId },
          { status: 401 }
        );
      }

      // Extract API key
      const apiKey = authHeader.replace('Bearer ', '');
      if (!apiKey) {
        console.error(`[${requestId}] Invalid auth header format`);
        return Response.json(
          { error: 'Unauthorized: Invalid Authorization header format', requestId },
          { status: 401 }
        );
      }

      // Hash the provided key
      const encoder = new TextEncoder();
      const keyData = encoder.encode(apiKey);
      const hashBuffer = await crypto.subtle.digest("SHA-256", keyData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Look up API key record
      const apiKeyRecords = await base44.asServiceRole.entities.ProvisioningApiKey.filter({
        key_hash: keyHash,
        status: 'ACTIVE'
      });

      if (apiKeyRecords.length === 0) {
        console.error(`[${requestId}] Invalid API key hash`);

        // Log rejection
        await base44.asServiceRole.entities.ActivityLog.create({
          timestamp: new Date().toISOString(),
          initiator_user_email: 'external@api',
          action_type: 'PROVISIONING_EXTERNAL_REQUEST_REJECTED',
          client_id: 'unknown',
          metadata: {
            reason: 'INVALID_KEY',
            endpoint_key: ENDPOINT_KEY,
            api_key_prefix: apiKey.substring(0, 12),
            request_id: requestId
          }
        });

        return Response.json(
          { error: 'Unauthorized: Invalid API key', requestId },
          { status: 401 }
        );
      }

      const apiKeyRecord = apiKeyRecords[0];
      resolvedTenantId = apiKeyRecord.tenant_id;

      // Timestamp validation (±5 min skew)
      const requestTime = new Date(timestamp);
      const now = new Date();
      const skewMs = Math.abs(now - requestTime);
      const maxSkewMs = 5 * 60 * 1000; // 5 minutes

      if (skewMs > maxSkewMs) {
        console.error(`[${requestId}] Timestamp skew too large: ${skewMs}ms`);

        // Log rejection
        await base44.asServiceRole.entities.ActivityLog.create({
          timestamp: new Date().toISOString(),
          initiator_user_email: 'external@api',
          action_type: 'PROVISIONING_EXTERNAL_REQUEST_REJECTED',
          client_id: resolvedTenantId || 'unknown',
          metadata: {
            reason: 'BAD_TIMESTAMP',
            endpoint_key: ENDPOINT_KEY,
            api_key_prefix: apiKey.substring(0, 12),
            skew_ms: skewMs,
            request_id: requestId
          }
        });

        return Response.json(
          { error: 'Unauthorized: Request timestamp out of acceptable range', requestId },
          { status: 401 }
        );
      }

      // Calculate request body hash for integrity check
      const bodyText = await req.clone().text();
      const bodyData = encoder.encode(bodyText);
      const bodyHashBuffer = await crypto.subtle.digest("SHA-256", bodyData);
      const bodyHashArray = Array.from(new Uint8Array(bodyHashBuffer));
      const requestHash = bodyHashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Nonce replay protection - scoped to (tenant, endpoint, nonce)
      const existingNonce = await base44.asServiceRole.entities.RequestNonce.filter({
        tenant_id: resolvedTenantId,
        endpoint: ENDPOINT_KEY,
        nonce: nonce
      });

      if (existingNonce.length > 0) {
        // Check if replayed with different body
        const existing = existingNonce[0];
        if (existing.request_hash && existing.request_hash !== requestHash) {
          console.error(`[${requestId}] Nonce reused with different body: ${nonce}`);

          // Log tampering attempt
          await base44.asServiceRole.entities.ActivityLog.create({
            timestamp: new Date().toISOString(),
            initiator_user_email: 'external@api',
            action_type: 'PROVISIONING_EXTERNAL_REQUEST_REJECTED',
            client_id: resolvedTenantId,
            metadata: {
              reason: 'NONCE_REPLAY_TAMPERED',
              endpoint_key: ENDPOINT_KEY,
              api_key_prefix: apiKey.substring(0, 12),
              nonce: nonce,
              request_id: requestId
            }
          });

          return Response.json(
            { error: 'Conflict: Request nonce reused with different payload (potential tampering)', requestId },
            { status: 409 }
          );
        }

        console.error(`[${requestId}] Nonce replay detected: ${nonce}`);

        // Log replay attempt
        await base44.asServiceRole.entities.ActivityLog.create({
          timestamp: new Date().toISOString(),
          initiator_user_email: 'external@api',
          action_type: 'PROVISIONING_EXTERNAL_REQUEST_REJECTED',
          client_id: resolvedTenantId,
          metadata: {
            reason: 'NONCE_REPLAY',
            endpoint_key: ENDPOINT_KEY,
            api_key_prefix: apiKey.substring(0, 12),
            nonce: nonce,
            request_id: requestId
          }
        });

        return Response.json(
          { error: 'Conflict: Request nonce already used (replay attack detected)', requestId },
          { status: 409 }
        );
      }

      // Store nonce (24h TTL) - scoped to endpoint
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await base44.asServiceRole.entities.RequestNonce.create({
        tenant_id: resolvedTenantId,
        endpoint: ENDPOINT_KEY,
        nonce: nonce,
        timestamp: timestamp,
        request_hash: requestHash,
        api_key_prefix: apiKey.substring(0, 12),
        expires_at: expiresAt
      });

      // Update API key usage stats
      await base44.asServiceRole.entities.ProvisioningApiKey.update(apiKeyRecord.id, {
        last_used_at: new Date().toISOString(),
        usage_count: apiKeyRecord.usage_count + 1
      });

      console.log(`[${requestId}] External caller authenticated, tenant: ${resolvedTenantId}`);
    }

    const bodyText = await req.text();
    const body = JSON.parse(bodyText);
    const { 
      sourceSystem, 
      fileName, 
      records, 
      sourceBatchRef,
      strictRoles = false,
      requireDepartment = false,
      disallowPublicEmailDomains = false
    } = body;

    // Validate payload size (prevent abuse)
    const MAX_RECORDS_PER_BATCH = 1000;
    if (!records || !Array.isArray(records)) {
      console.error(`[${requestId}] Records must be an array`);
      return Response.json({ 
        error: 'Invalid request: records must be an array',
        requestId
      }, { status: 400 });
    }

    if (records.length > MAX_RECORDS_PER_BATCH) {
      console.error(`[${requestId}] Batch too large: ${records.length} records`);
      return Response.json({ 
        error: `Batch size exceeds limit: ${records.length} > ${MAX_RECORDS_PER_BATCH}. Split into smaller batches.`,
        requestId,
        maxRecords: MAX_RECORDS_PER_BATCH
      }, { status: 413 });
    }

    // Validate JSON payload size (50MB limit)
    const bodySizeBytes = new TextEncoder().encode(bodyText).length;
    const MAX_PAYLOAD_SIZE_MB = 50;
    const MAX_PAYLOAD_SIZE_BYTES = MAX_PAYLOAD_SIZE_MB * 1024 * 1024;

    if (bodySizeBytes > MAX_PAYLOAD_SIZE_BYTES) {
      console.error(`[${requestId}] Payload too large: ${(bodySizeBytes / 1024 / 1024).toFixed(2)}MB`);
      return Response.json({ 
        error: `Request payload too large: ${(bodySizeBytes / 1024 / 1024).toFixed(2)}MB exceeds ${MAX_PAYLOAD_SIZE_MB}MB limit`,
        requestId
      }, { status: 413 });
    }

    // Derive tenantId - NEVER trust client input for external callers
    let tenantId;
    if (resolvedTenantId) {
      // External caller - tenant bound to API key
      tenantId = resolvedTenantId;
      console.log(`[${requestId}] Using API key scoped tenant: ${tenantId}`);
    } else if (isPlatformAdmin && body.tenantId) {
      // Platform Admin override for debugging
      tenantId = body.tenantId;
      console.log(`[${requestId}] Platform Admin override tenant: ${tenantId}`);
    } else if (user && user.client_id) {
      // Authenticated admin user - use their tenant
      tenantId = user.client_id;
    } else {
      console.error(`[${requestId}] Cannot derive tenantId`);
      return Response.json({ error: 'Cannot determine tenant', requestId }, { status: 400 });
    }

    if (!sourceSystem || !fileName || !records || !Array.isArray(records)) {
      console.error(`[${requestId}] Missing required fields`);
      return Response.json({ 
        error: 'Missing required fields: sourceSystem, fileName, records',
        requestId
      }, { status: 400 });
    }

    console.log(`[${requestId}] Creating batch: tenant=${tenantId}, source=${sourceSystem}, records=${records.length}`);

    // TODO: Check idempotency key
    const idempotencyKey = req.headers.get('X-Idempotency-Key');
    if (idempotencyKey) {
      // Check if this request was already processed
      const existing = await base44.asServiceRole.entities.IdempotencyKey.filter({
        tenant_id: tenantId,
        endpoint: ENDPOINT_KEY,
        key: idempotencyKey
      });
      
      if (existing.length > 0) {
        const record = existing[0];
        if (record.status === 'SUCCEEDED') {
          console.log(`[${requestId}] Idempotency key hit: ${idempotencyKey}`);
        return Response.json(record.response_body);
        }
        if (record.status === 'IN_PROGRESS') {
          console.warn(`[${requestId}] Idempotency key in progress: ${idempotencyKey}`);
          return Response.json({ error: 'Request already in progress', requestId }, { status: 409 });
        }
      }
    }

    // Load known roles for this tenant
    const knownRoles = await base44.asServiceRole.entities.ProvisioningRole.filter({
      tenant_id: tenantId
    });
    const knownRoleSlugs = new Set(knownRoles.map(r => r.name));

    // Calculate file hash
    const fileContent = JSON.stringify(records);
    const encoder = new TextEncoder();
    const data = encoder.encode(fileContent);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Public email domains to warn about
    const publicDomains = new Set(['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com']);

    // Validate and normalize records
    const validRecords = [];
    const invalidRecords = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const seenEmails = new Set();

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const errors = [];
      const warnings = [];

      // Normalize email
      const normalizedEmail = record.email ? record.email.toLowerCase().trim() : '';
      
      // Required fields
      if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
        errors.push({ field: 'email', code: 'INVALID_EMAIL', message: 'Invalid email format' });
      }
      if (!record.firstName || record.firstName.trim().length < 1) {
        errors.push({ field: 'firstName', code: 'REQUIRED', message: 'First name is required' });
      }
      if (!record.lastName || record.lastName.trim().length < 1) {
        errors.push({ field: 'lastName', code: 'REQUIRED', message: 'Last name is required' });
      }
      if (!record.appRole || !['user', 'admin'].includes(record.appRole)) {
        errors.push({ field: 'appRole', code: 'INVALID', message: 'appRole must be "user" or "admin"' });
      }

      // Duplicate email check
      if (normalizedEmail && seenEmails.has(normalizedEmail)) {
        errors.push({ field: 'email', code: 'DUPLICATE_IN_BATCH', message: 'Duplicate email in this batch' });
      } else if (normalizedEmail) {
        seenEmails.add(normalizedEmail);
      }

      // Optional validations
      if (requireDepartment && (!record.department || record.department.trim().length < 1)) {
        errors.push({ field: 'department', code: 'REQUIRED', message: 'Department is required' });
      }

      // Manager email validation
      if (record.managerEmail) {
        const normManagerEmail = record.managerEmail.toLowerCase().trim();
        if (!emailRegex.test(normManagerEmail)) {
          errors.push({ field: 'managerEmail', code: 'INVALID_EMAIL', message: 'Invalid manager email format' });
        }
        if (normManagerEmail === normalizedEmail) {
          errors.push({ field: 'managerEmail', code: 'SELF_MANAGER', message: 'Manager cannot be self' });
        }
      }

      // Public email domain warning
      if (disallowPublicEmailDomains && normalizedEmail) {
        const domain = normalizedEmail.split('@')[1];
        if (publicDomains.has(domain)) {
          warnings.push({ field: 'email', code: 'PUBLIC_DOMAIN', message: 'Public email domain detected' });
        }
      }

      // Role validation
      const normalizedRoles = [];
      if (record.customRoles && Array.isArray(record.customRoles)) {
        for (const role of record.customRoles) {
          const normalized = role.toLowerCase().trim().replace(/\s+/g, '_');
          if (!normalizedRoles.includes(normalized)) {
            normalizedRoles.push(normalized);
          }
          
          if (!knownRoleSlugs.has(normalized)) {
            const msg = `Unknown role: ${role}`;
            if (strictRoles) {
              errors.push({ field: 'customRoles', code: 'UNKNOWN_ROLE', message: msg });
            } else {
              warnings.push({ field: 'customRoles', code: 'UNKNOWN_ROLE', message: msg });
            }
          }
        }
      }
      normalizedRoles.sort();

      // Build normalized payload
      const normalizedRecord = {
        email: normalizedEmail,
        firstName: record.firstName.trim(),
        lastName: record.lastName.trim(),
        department: record.department ? record.department.trim() : null,
        managerEmail: record.managerEmail ? record.managerEmail.toLowerCase().trim() : null,
        customRoles: normalizedRoles,
        appRole: record.appRole,
        externalUserRef: record.externalUserRef || null,
        rowNumber: record.rowNumber || i + 1
      };

      if (errors.length > 0) {
        invalidRecords.push({ 
          ...normalizedRecord, 
          errors,
          warnings: warnings.length > 0 ? warnings : undefined
        });
      } else {
        validRecords.push({ 
          ...normalizedRecord,
          warnings: warnings.length > 0 ? warnings : undefined
        });
      }
    }

    // Check for existing users
    let newUsers = 0;
    let existingUsers = 0;
    
    // TODO: Optimize - batch query existing profiles
    for (const record of validRecords) {
      const existing = await base44.asServiceRole.entities.UserProfile.filter({
        tenant_id: tenantId,
        email: record.email.toLowerCase().trim()
      });
      
      if (existing.length > 0) {
        existingUsers++;
      } else {
        newUsers++;
      }
    }

    // Create batch
    const batch = await base44.asServiceRole.entities.ProvisioningBatch.create({
      tenant_id: tenantId,
      source_system: sourceSystem,
      source_batch_ref: sourceBatchRef || null,
      uploaded_by_base44_user_id: user?.id || 'api_key',
      uploaded_by_email: user?.email || 'api@system',
      file_name: fileName,
      file_hash: fileHash,
      total_rows: records.length,
      valid_rows: validRecords.length,
      invalid_rows: invalidRecords.length,
      new_users: newUsers,
      existing_users: existingUsers,
      status: 'VALIDATED'
    });

    // Create ProvisioningUser records in bulk
    const userRecords = [
      ...validRecords.map(record => ({
        tenant_id: tenantId,
        batch_id: batch.id,
        email: record.email,
        first_name: record.firstName,
        last_name: record.lastName,
        external_user_ref: record.externalUserRef || null,
        profile_payload: record,
        validation_status: 'VALID',
        validation_errors: [],
        apply_status: 'NOT_APPLIED'
      })),
      ...invalidRecords.map(record => ({
        tenant_id: tenantId,
        batch_id: batch.id,
        email: record.email || 'invalid',
        first_name: record.firstName || '',
        last_name: record.lastName || '',
        external_user_ref: record.externalUserRef || null,
        profile_payload: record,
        validation_status: 'INVALID',
        validation_errors: record.errors,
        apply_status: 'NOT_APPLIED'
      }))
    ];

    // Create in chunks to avoid overload
    const chunkSize = 50;
    for (let i = 0; i < userRecords.length; i += chunkSize) {
      const chunk = userRecords.slice(i, i + chunkSize);
      await Promise.all(chunk.map(rec => 
        base44.asServiceRole.entities.ProvisioningUser.create(rec)
      ));
    }

    const response = {
      batchId: batch.id,
      status: batch.status,
      totals: {
        total: records.length,
        valid: validRecords.length,
        invalid: invalidRecords.length,
        newUsers,
        existingUsers
      },
      invalidRecords: invalidRecords.map(r => ({
        email: r.email,
        rowNumber: r.rowNumber,
        errors: r.errors,
        warnings: r.warnings
      })),
      warnings: validRecords.filter(r => r.warnings).map(r => ({
        email: r.email,
        rowNumber: r.rowNumber,
        warnings: r.warnings
      })),
      requestId
    };

    console.log(`[${requestId}] Batch created successfully: ${batch.id}`);

    // Log batch creation to ActivityLog
    await base44.asServiceRole.entities.ActivityLog.create({
      timestamp: new Date().toISOString(),
      initiator_user_email: user?.email || 'api@system',
      action_type: 'PROVISIONING_BATCH_CREATED',
      client_id: tenantId,
      metadata: {
        batch_id: batch.id,
        tenant_id: tenantId,
        source_system: sourceSystem,
        source_batch_ref: sourceBatchRef || null,
        file_name: fileName,
        totals: {
          total_rows: records.length,
          valid_rows: validRecords.length,
          invalid_rows: invalidRecords.length,
          new_users: newUsers,
          existing_users: existingUsers
        },
        validation: {
          strict_roles: strictRoles,
          require_department: requireDepartment,
          disallow_public_domains: disallowPublicEmailDomains
        },
        request: {
          request_id: requestId,
          endpoint_key: ENDPOINT_KEY,
          api_key_prefix: resolvedTenantId ? apiKey.substring(0, 12) : null,
          idempotency_key: idempotencyKey || null
        }
      }
    });

    // Store idempotency record
    if (idempotencyKey) {
      await base44.asServiceRole.entities.IdempotencyKey.create({
        tenant_id: tenantId,
        endpoint: ENDPOINT_KEY,
        key: idempotencyKey,
        request_hash: fileHash,
        status: 'SUCCEEDED',
        response_body: response,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    }

    return Response.json(response);

  } catch (error) {
    console.error(`[${requestId}] Create batch error:`, error.message);
    console.error(`[${requestId}] Stack:`, error.stack);
    
    return Response.json({ 
      error: error.message,
      requestId,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});