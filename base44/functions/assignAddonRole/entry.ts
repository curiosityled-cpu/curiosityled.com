import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { user_id, custom_role_id, action } = await req.json();

    if (!user_id) {
      return Response.json({ success: false, error: 'user_id is required' }, { status: 400 });
    }

    // Only admins can assign roles
    const adminRoles = ['Platform Admin', 'Super Administrator', 'Admin Level 2', 'Partner Business Administrator'];
    if (!adminRoles.includes(user.app_role)) {
      return Response.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get target user
    const targetUsers = await base44.asServiceRole.entities.User.filter({ id: user_id });
    if (targetUsers.length === 0) {
      return Response.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const targetUser = targetUsers[0];

    // Security: Tenant scoping — verify the target user belongs to the
    // caller's client (or partner's clients). Fail closed when tenant scope
    // is missing. This mirrors assignRoleToUser and prevents cross-tenant
    // role assignment.
    if (user.app_role === 'Super Administrator') {
      if (!user.client_id) {
        return Response.json({ success: false, error: 'Access denied — tenant membership required.' }, { status: 403 });
      }
      if (targetUser.client_id !== user.client_id) {
        return Response.json({ success: false, error: 'Access denied — target user is not in your organization.' }, { status: 403 });
      }
    } else if (user.app_role === 'Partner Business Administrator') {
      if (!user.partner_id) {
        return Response.json({ success: false, error: 'Access denied — partner scope required.' }, { status: 403 });
      }
      const allClients = await base44.asServiceRole.entities.Client.list();
      const partnerClientIds = allClients
        .filter(c => c.partner_id === user.partner_id)
        .map(c => c.id);
      if (!partnerClientIds.includes(targetUser.client_id)) {
        return Response.json({ success: false, error: 'Access denied — target user is not in your partner clients.' }, { status: 403 });
      }
    } else if (user.app_role === 'Admin Level 2') {
      if (!user.client_id) {
        return Response.json({ success: false, error: 'Access denied — tenant membership required.' }, { status: 403 });
      }
      if (targetUser.client_id !== user.client_id) {
        return Response.json({ success: false, error: 'Access denied — target user is not in your organization.' }, { status: 403 });
      }
    }

    // Handle remove action
    if (action === 'remove') {
      await base44.asServiceRole.entities.User.update(user_id, {
        custom_role_id: null
      });

      // Decrement user count on the old role if it exists
      if (targetUser.custom_role_id) {
        const oldRoles = await base44.entities.CustomRole.filter({ id: targetUser.custom_role_id });
        if (oldRoles.length > 0) {
          const oldRole = oldRoles[0];
          await base44.entities.CustomRole.update(oldRole.id, {
            user_count: Math.max(0, (oldRole.user_count || 1) - 1)
          });
        }
      }

      return Response.json({
        success: true,
        message: 'Addon role removed successfully'
      });
    }

    // For assign action, custom_role_id is required
    if (!custom_role_id) {
      return Response.json({ success: false, error: 'custom_role_id is required for assignment' }, { status: 400 });
    }

    // Verify the custom role exists
    const customRoles = await base44.entities.CustomRole.filter({ id: custom_role_id });
    if (customRoles.length === 0) {
      return Response.json({ success: false, error: 'Custom role not found' }, { status: 404 });
    }

    const customRole = customRoles[0];

    // Security: Role-rank restriction — prevent lower-tier admins from
    // assigning high-privilege add-on roles (e.g. 'Platform Administrator
    // Add-on' with impersonation/billing permissions). Only Platform Admin
    // may assign roles whose permissions include platform-level privileges.
    const PLATFORM_PERMISSIONS = [
      'users.impersonate', 'billing.manage', 'platform.admin',
      'users.delete', 'clients.delete', 'security.manage'
    ];
    const rolePermissions = customRole.permissions || [];
    const hasPlatformPermission = rolePermissions.some(p =>
      PLATFORM_PERMISSIONS.includes(p) ||
      (typeof p === 'string' && (p.startsWith('platform.') || p.startsWith('users.impersonate') || p === 'billing.manage'))
    );
    if (hasPlatformPermission && user.app_role !== 'Platform Admin') {
      return Response.json({
        success: false,
        error: 'Only Platform Admins may assign add-on roles with platform-level privileges.'
      }, { status: 403 });
    }

    // Update user's custom_role_id
    await base44.asServiceRole.entities.User.update(user_id, {
      custom_role_id: custom_role_id
    });

    // Update user counts
    // Decrement old role count
    if (targetUser.custom_role_id && targetUser.custom_role_id !== custom_role_id) {
      const oldRoles = await base44.entities.CustomRole.filter({ id: targetUser.custom_role_id });
      if (oldRoles.length > 0) {
        const oldRole = oldRoles[0];
        await base44.entities.CustomRole.update(oldRole.id, {
          user_count: Math.max(0, (oldRole.user_count || 1) - 1)
        });
      }
    }

    // Increment new role count
    if (!targetUser.custom_role_id || targetUser.custom_role_id !== custom_role_id) {
      await base44.entities.CustomRole.update(custom_role_id, {
        user_count: (customRole.user_count || 0) + 1
      });
    }

    return Response.json({
      success: true,
      message: `Addon role "${customRole.role_name}" assigned successfully`,
      data: {
        user_id,
        custom_role_id,
        role_name: customRole.role_name,
        permissions: customRole.permissions
      }
    });

  } catch (error) {
    console.error('Error assigning addon role:', error);
    return Response.json({
      success: false,
      error: 'Failed to assign add-on role.'
    }, { status: 500 });
  }
});