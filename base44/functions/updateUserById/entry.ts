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

    const { userId, userData } = await req.json();

    if (!userId || !userData) {
      return Response.json({ error: 'userId and userData are required' }, { status: 400 });
    }

    // Get the target user first to check permissions
    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];

    // Apply role-based access control
    if (currentUser.app_role === 'Super Administrator' && currentUser.client_id) {
      if (targetUser.client_id !== currentUser.client_id) {
        return Response.json({ error: 'Access denied - User not in your organization' }, { status: 403 });
      }
    } else if (currentUser.app_role === 'Partner Business Administrator' && currentUser.partner_id) {
      const allClients = await base44.asServiceRole.entities.Client.list();
      const partnerClientIds = allClients
        .filter(c => c.partner_id === currentUser.partner_id)
        .map(c => c.id);
      if (!partnerClientIds.includes(targetUser.client_id)) {
        return Response.json({ error: 'Access denied - User not in your partner clients' }, { status: 403 });
      }
    } else if (currentUser.app_role === 'Admin Level 2' && currentUser.client_id) {
      if (targetUser.client_id !== currentUser.client_id) {
        return Response.json({ error: 'Access denied - User not in your organization' }, { status: 403 });
      }
    }

    // Update user using service role
    await base44.asServiceRole.entities.User.update(userId, userData);

    // Log the activity
    await base44.asServiceRole.entities.ActivityLog.create({
      timestamp: new Date().toISOString(),
      initiator_user_email: currentUser.email,
      action_type: 'USER_ROLE_CHANGE',
      target_user_email: targetUser.email,
      metadata: { 
        updated_by: currentUser.full_name,
        changes: userData
      }
    });

    return Response.json({ 
      success: true,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});