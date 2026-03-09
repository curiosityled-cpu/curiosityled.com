import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check authorization - only Platform Admin and Super Admin can delete users
    const allowedRoles = ['Platform Admin', 'Super Administrator', 'Admin Level 2'];
    if (!allowedRoles.includes(currentUser.app_role)) {
      return Response.json({ error: 'Unauthorized - Only administrators can delete users' }, { status: 403 });
    }

    const { userId } = await req.json();

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    // Get the target user first to check permissions
    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];

    // Prevent deleting yourself
    if (targetUser.email === currentUser.email) {
      return Response.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Apply role-based access control
    if (currentUser.app_role === 'Super Administrator' && currentUser.client_id) {
      if (targetUser.client_id !== currentUser.client_id) {
        return Response.json({ error: 'Access denied - User not in your organization' }, { status: 403 });
      }
    } else if (currentUser.app_role === 'Admin Level 2' && currentUser.client_id) {
      if (targetUser.client_id !== currentUser.client_id) {
        return Response.json({ error: 'Access denied - User not in your organization' }, { status: 403 });
      }
    }

    // Log the activity before deletion
    await base44.asServiceRole.entities.ActivityLog.create({
      timestamp: new Date().toISOString(),
      initiator_user_email: currentUser.email,
      action_type: 'USER_DELETED',
      target_user_email: targetUser.email,
      metadata: { 
        deleted_by: currentUser.full_name,
        deleted_user_data: {
          email: targetUser.email,
          full_name: targetUser.full_name,
          app_role: targetUser.app_role
        }
      }
    });

    // Delete user using service role
    await base44.asServiceRole.entities.User.delete(userId);

    return Response.json({ 
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});