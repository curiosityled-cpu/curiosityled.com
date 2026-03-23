import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * GET /provisioning/users/{email}?tenantId=xxx
 * 
 * Gets provisioning status for a specific user
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-only
    const allowedRoles = ['Admin Level 2', 'Super Administrator', 'Platform Admin'];
    if (!allowedRoles.includes(user.app_role)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const email = decodeURIComponent(pathParts[pathParts.indexOf('users') + 1]);
    const requestedTenantId = url.searchParams.get('tenantId');

    if (!email) {
      return Response.json({ error: 'Missing email' }, { status: 400 });
    }

    // Derive tenantId from user context
    let tenantId;
    if (user.app_role === 'Platform Admin' && requestedTenantId) {
      tenantId = requestedTenantId;
    } else {
      tenantId = user.client_id;
      if (!tenantId) {
        return Response.json({ error: 'User has no tenant association' }, { status: 400 });
      }
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Get most recent ProvisioningUser record
    const provUsers = await base44.asServiceRole.entities.ProvisioningUser.filter({
      tenant_id: tenantId,
      email: normalizedEmail
    }, '-created_date', 1);

    if (provUsers.length === 0) {
      return Response.json({ 
        email: normalizedEmail,
        status: 'NOT_FOUND'
      }, { status: 404 });
    }

    const provUser = provUsers[0];

    return Response.json({
      email: provUser.email,
      status: provUser.apply_status,
      lastError: provUser.last_apply_error,
      batchId: provUser.batch_id,
      validationErrors: provUser.validation_errors,
      linkedAt: provUser.linked_at
    });

  } catch (error) {
    console.error('Get user status error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});