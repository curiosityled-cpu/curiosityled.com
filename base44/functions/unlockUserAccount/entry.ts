import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can unlock accounts
    if (!['Platform Admin', 'Super Administrator', 'Partner Business Administrator', 'Admin Level 2'].includes(currentUser.app_role)) {
      return Response.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { userId } = await req.json();

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    // Get the target user
    const allUsers = await base44.asServiceRole.entities.User.list();
    const targetUser = allUsers.find(u => u.id === userId);
    
    if (!targetUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user status
    await base44.asServiceRole.entities.User.update(userId, {
      account_status: 'active',
      locked_until: null,
      locked_reason: null,
      failed_login_attempts: 0
    });

    // Log the activity
    await base44.asServiceRole.entities.ActivityLog.create({
      timestamp: new Date().toISOString(),
      initiator_user_email: currentUser.email,
      action_type: 'USER_ACCOUNT_UNLOCKED',
      target_user_email: targetUser.email,
      client_id: targetUser.client_id,
      metadata: {
        unlocked_by: currentUser.email
      }
    });

    // Send notification email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: targetUser.email,
      subject: 'Your Account Has Been Unlocked',
      body: `Hello ${targetUser.full_name || targetUser.email},\n\nYour account has been unlocked and you can now access the platform.\n\nIf you did not request this change, please contact your administrator immediately.\n\nBest regards,\nCuriosity Led Team`
    });

    return Response.json({
      success: true,
      message: 'User account unlocked successfully'
    });
  } catch (error) {
    console.error('Error unlocking account:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});