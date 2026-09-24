import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check authorization
    const allowedRoles = ['Platform Admin', 'Super Administrator', 'Partner Business Administrator', 'Admin Level 2'];
    if (!allowedRoles.includes(currentUser.app_role)) {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { userId, roleId } = await req.json();

    if (!userId || !roleId) {
      return Response.json({ error: 'userId and roleId are required' }, { status: 400 });
    }

    // Get the target user first to check permissions
    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];

    // Verify the role exists
    const roles = await base44.entities.CustomRole.filter({ id: roleId });
    if (roles.length === 0) {
      return Response.json({ error: 'Role not found' }, { status: 404 });
    }

    const role = roles[0];

    // Security: Role-rank restriction — prevent lower-tier admins from
    // assigning high-privilege custom roles (e.g. 'Platform Administrator
    // Add-on' with impersonation/billing permissions). Only Platform Admin
    // may assign roles whose permissions include platform-level privileges.
    // Ported from assignAddonRole to close the privilege-escalation gap.
    const PLATFORM_PERMISSIONS = [
      'users.impersonate', 'billing.manage', 'platform.admin',
      'users.delete', 'clients.delete', 'security.manage'
    ];
    const rolePermissions = role.permissions || [];
    const hasPlatformPermission = rolePermissions.some(p =>
      PLATFORM_PERMISSIONS.includes(p) ||
      (typeof p === 'string' && (p.startsWith('platform.') || p.startsWith('users.impersonate') || p === 'billing.manage'))
    );
    if (hasPlatformPermission && currentUser.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Only Platform Admins may assign roles with platform-level privileges.' }, { status: 403 });
    }

    // Apply role-based access control — fail closed when tenant identifiers are missing.
    // Platform Admin is the only role exempt from tenant scoping.
    if (currentUser.app_role !== 'Platform Admin') {
      if (currentUser.app_role === 'Super Administrator') {
        if (!currentUser.client_id || targetUser.client_id !== currentUser.client_id) {
          return Response.json({ error: 'Access denied - User not in your organization' }, { status: 403 });
        }
      } else if (currentUser.app_role === 'Partner Business Administrator') {
        if (!currentUser.partner_id) {
          return Response.json({ error: 'Access denied - Partner scope not configured' }, { status: 403 });
        }
        const allClients = await base44.asServiceRole.entities.Client.list();
        const partnerClientIds = allClients
          .filter(c => c.partner_id === currentUser.partner_id)
          .map(c => c.id);
        if (!partnerClientIds.includes(targetUser.client_id)) {
          return Response.json({ error: 'Access denied - User not in your partner clients' }, { status: 403 });
        }
      } else if (currentUser.app_role === 'Admin Level 2') {
        if (!currentUser.client_id || targetUser.client_id !== currentUser.client_id) {
          return Response.json({ error: 'Access denied - User not in your organization' }, { status: 403 });
        }
      }
    }

    // Assign role using service role
    await base44.asServiceRole.entities.User.update(userId, {
      custom_role_id: roleId
    });

    // Update role's user count
    const currentUserCount = role.user_count || 0;
    await base44.entities.CustomRole.update(roleId, {
      user_count: currentUserCount + 1
    });

    // Log the activity
    await base44.asServiceRole.entities.ActivityLog.create({
      timestamp: new Date().toISOString(),
      initiator_user_email: currentUser.email,
      action_type: 'USER_ROLE_CHANGE',
      target_user_email: targetUser.email,
      old_value: targetUser.custom_role_id || 'none',
      new_value: roleId,
      metadata: { 
        assigned_by: currentUser.full_name,
        role_name: role.role_name
      }
    });

    return Response.json({ 
      success: true,
      message: 'Role assigned successfully'
    });

  } catch (error) {
    console.error('Error assigning role:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});