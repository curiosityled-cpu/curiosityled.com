import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

/**
 * POST /provisioning/batches
 * 
 * Creates a new provisioning batch from CSV data.
 * Validates records and returns summary.
 */
Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized', requestId }, { status: 401 });
    }

    // ADMIN-ONLY
    const allowedRoles = ['Admin Level 2', 'Super Administrator', 'Platform Admin'];
    if (!allowedRoles.includes(user.app_role)) {
      return Response.json({ error: 'Forbidden: Admin access required', requestId }, { status: 403 });
    }

    const body = await req.json();
    const { sourceSystem = 'MANUAL', fileName, records, strictRoles = false, requireDepartment = false, disallowPublicEmailDomains = true } = body;

    if (!records || !Array.isArray(records)) {
      return Response.json({ error: 'Missing or invalid records array', requestId }, { status: 400 });
    }

    // Derive tenant from user
    const tenantId = user.client_id;
    if (!tenantId) {
      return Response.json({ error: 'User must be associated with a client', requestId }, { status: 400 });
    }

    // Validate records
    const validRecords = [];
    const invalidRecords = [];
    const warnings = [];
    const seenEmails = new Set();
    let newUsers = 0;
    let existingUsers = 0;

    // Public email domains to reject
    const publicDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];

    for (const record of records) {
      const errors = [];
      const recordWarnings = [];

      // Required fields
      if (!record.email || !record.email.trim()) {
        errors.push({ field: 'email', message: 'Email is required' });
      } else {
        const email = record.email.toLowerCase().trim();
        
        // Email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push({ field: 'email', message: 'Invalid email format' });
        }
        
        // Duplicate check
        if (seenEmails.has(email)) {
          errors.push({ field: 'email', message: 'Duplicate email in batch' });
        }
        seenEmails.add(email);

        // Public domain check
        if (disallowPublicEmailDomains) {
          const domain = email.split('@')[1];
          if (publicDomains.includes(domain)) {
            errors.push({ field: 'email', message: 'Public email domains not allowed' });
          }
        }
      }

      if (!record.firstName || !record.firstName.trim()) {
        errors.push({ field: 'firstName', message: 'First name is required' });
      }

      if (!record.lastName || !record.lastName.trim()) {
        errors.push({ field: 'lastName', message: 'Last name is required' });
      }

      if (!record.appRole || !['user', 'admin'].includes(record.appRole.toLowerCase())) {
        errors.push({ field: 'appRole', message: 'appRole must be "user" or "admin"' });
      }

      if (requireDepartment && !record.department) {
        errors.push({ field: 'department', message: 'Department is required' });
      }

      // Manager email validation
      if (record.managerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.managerEmail)) {
        recordWarnings.push({ field: 'managerEmail', message: 'Invalid manager email format' });
      }

      if (errors.length > 0) {
        invalidRecords.push({
          ...record,
          errors
        });
      } else {
        // Check if user exists
        const existingProfiles = await base44.asServiceRole.entities.UserProfile.filter({
          tenant_id: tenantId,
          email: record.email.toLowerCase().trim()
        });

        if (existingProfiles.length > 0) {
          existingUsers++;
          recordWarnings.push({ field: 'email', message: 'User already exists - will be updated' });
        } else {
          newUsers++;
        }

        if (recordWarnings.length > 0) {
          warnings.push({
            ...record,
            warnings: recordWarnings
          });
        }

        validRecords.push({
          email: record.email.toLowerCase().trim(),
          firstName: record.firstName.trim(),
          lastName: record.lastName.trim(),
          appRole: record.appRole.toLowerCase(),
          department: record.department?.trim() || null,
          managerEmail: record.managerEmail?.toLowerCase().trim() || null,
          customRoles: record.customRoles || [],
          rowNumber: record.rowNumber
        });
      }
    }

    // Create batch
    const batch = await base44.asServiceRole.entities.ProvisioningBatch.create({
      tenant_id: tenantId,
      source_system: sourceSystem,
      file_name: fileName || 'manual_upload.csv',
      total_rows: records.length,
      valid_rows: validRecords.length,
      invalid_rows: invalidRecords.length,
      new_users: newUsers,
      existing_users: existingUsers,
      status: validRecords.length > 0 ? 'VALIDATED' : 'FAILED'
    });

    // Create ProvisioningUser records for valid records
    for (const record of validRecords) {
      await base44.asServiceRole.entities.ProvisioningUser.create({
        batch_id: batch.id,
        tenant_id: tenantId,
        email: record.email,
        profile_payload: record,
        validation_status: 'VALID',
        apply_status: 'PENDING',
        apply_attempts: 0
      });
    }

    // Create ProvisioningUser records for invalid records (for tracking)
    for (const record of invalidRecords) {
      await base44.asServiceRole.entities.ProvisioningUser.create({
        batch_id: batch.id,
        tenant_id: tenantId,
        email: record.email || 'invalid',
        profile_payload: record,
        validation_status: 'INVALID',
        validation_errors: record.errors,
        apply_status: 'VALIDATION_FAILED',
        apply_attempts: 0
      });
    }

    // Log to ActivityLog
    await base44.asServiceRole.entities.ActivityLog.create({
      timestamp: new Date().toISOString(),
      initiator_user_email: user.email,
      action_type: 'PROVISIONING_BATCH_CREATED',
      client_id: tenantId,
      metadata: {
        batch_id: batch.id,
        source_system: sourceSystem,
        file_name: fileName,
        total_rows: records.length,
        valid_rows: validRecords.length,
        invalid_rows: invalidRecords.length,
        new_users: newUsers,
        existing_users: existingUsers,
        request_id: requestId
      }
    });

    return Response.json({
      batchId: batch.id,
      status: batch.status,
      totals: {
        total: records.length,
        valid: validRecords.length,
        invalid: invalidRecords.length,
        newUsers,
        existingUsers
      },
      invalidRecords: invalidRecords.slice(0, 50), // Limit to first 50 for response size
      warnings: warnings.slice(0, 50),
      requestId
    });

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