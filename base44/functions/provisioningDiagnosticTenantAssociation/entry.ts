import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

/**
 * GET /provisioning/diagnostic/tenant-association
 * 
 * ADMIN-ONLY: Diagnostic endpoint to validate tenant association for current user.
 * Shows how tenantId will be resolved during linking.
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

    console.log(`[${requestId}] Tenant association diagnostic for ${user.email}`);

    const normalizedEmail = user.email.toLowerCase().trim();

    // Check user.client_id
    const hasClientId = !!user.client_id;

    // Look up UserProfile by email across all tenants
    const allProfiles = await base44.asServiceRole.entities.UserProfile.filter({
      email: normalizedEmail
    });

    // Determine resolution strategy
    let resolutionStrategy;
    let resolvedTenantId;
    let warnings = [];

    if (hasClientId) {
      resolutionStrategy = 'user.client_id';
      resolvedTenantId = user.client_id;
      
      // Check if profile exists in that tenant
      const profileInTenant = allProfiles.find(p => p.tenant_id === user.client_id);
      if (!profileInTenant && allProfiles.length > 0) {
        warnings.push('user.client_id is set but no UserProfile exists in that tenant');
      }
    } else {
      if (allProfiles.length === 0) {
        resolutionStrategy = 'lookup_failed';
        resolvedTenantId = null;
        warnings.push('No UserProfile found for this email');
      } else if (allProfiles.length === 1) {
        resolutionStrategy = 'email_lookup_single_match';
        resolvedTenantId = allProfiles[0].tenant_id;
      } else {
        resolutionStrategy = 'email_lookup_ambiguous';
        resolvedTenantId = null;
        warnings.push(`Multiple profiles found across ${allProfiles.length} tenants`);
      }
    }

    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        app_role: user.app_role,
        client_id: user.client_id
      },
      resolution: {
        strategy: resolutionStrategy,
        resolved_tenant_id: resolvedTenantId,
        has_client_id: hasClientId
      },
      profiles: {
        count: allProfiles.length,
        tenants: allProfiles.map(p => ({
          tenant_id: p.tenant_id,
          status: p.status,
          base44_user_id: p.base44_user_id,
          created_date: p.created_date
        }))
      },
      warnings,
      ready_for_linking: resolvedTenantId !== null && warnings.length === 0,
      requestId
    });

  } catch (error) {
    console.error(`[${requestId}] Tenant association diagnostic error:`, error.message);
    console.error(`[${requestId}] Stack:`, error.stack);
    return Response.json({ 
      error: error.message,
      details: error.stack,
      requestId
    }, { status: 500 });
  }
});