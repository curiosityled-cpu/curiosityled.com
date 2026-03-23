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
      error: error.message 
    }, { status: 500 });
  }
});