import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const adminUser = await base44.auth.me();

    // Only Platform Admins, Partner Business Administrators, and Super Administrators can impersonate
    const canImpersonate = adminUser && (
      adminUser.app_role === 'Platform Admin' ||
      adminUser.app_role === 'Partner Business Administrator' ||
      adminUser.app_role === 'Super Administrator'
    );

    if (!canImpersonate) {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const { user_id } = await req.json();

    if (!user_id) {
      return Response.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Get target user
    const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];

    // Validate impersonation scope
    if (adminUser.app_role === 'Super Administrator') {
      // Super Admins can only impersonate within their organization
      if (targetUser.organization_id !== adminUser.organization_id) {
        return Response.json({ error: 'Cannot impersonate user from different organization' }, { status: 403 });
      }
    } else if (adminUser.app_role === 'Partner Business Administrator') {
      // Partner Admins can impersonate users in their client organizations
      if (!targetUser.organization_id) {
        return Response.json({ error: 'Target user has no organization' }, { status: 403 });
      }
      
      const orgs = await base44.asServiceRole.entities.Organization.filter({ id: targetUser.organization_id });
      if (orgs.length === 0 || orgs[0].partner_id !== adminUser.partner_id) {
        return Response.json({ error: 'Cannot impersonate user from non-client organization' }, { status: 403 });
      }
    }
    // Platform Admins have no restrictions

    // Log impersonation event
    try {
      await base44.asServiceRole.entities.ImpersonationLog.create({
        admin_email: adminUser.email,
        target_user_email: targetUser.email,
        started_at: new Date().toISOString(),
        reason: 'Administrative access',
        client_id: targetUser.client_id
      });
    } catch (logError) {
      console.warn('Failed to log impersonation:', logError.message);
    }

    return Response.json({
      success: true,
      impersonation: {
        admin_user_id: adminUser.id,
        admin_email: adminUser.email,
        admin_name: adminUser.full_name,
        target_user_id: targetUser.id,
        target_email: targetUser.email,
        target_name: targetUser.full_name,
        target_role: targetUser.app_role,
        started_at: new Date().toISOString()
      },
      message: `Impersonating ${targetUser.email}`
    });

  } catch (error) {
    console.error('Error setting up impersonation:', error);
    return Response.json({ 
      error: error.message || 'Failed to impersonate user' 
    }, { status: 500 });
  }
});