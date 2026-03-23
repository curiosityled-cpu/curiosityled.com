import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Platform Admin, Super Admin, Partner Business Admin, and HR Admin can suspend users
    if (!['Platform Admin', 'Super Administrator', 'Partner Business Administrator', 'Admin Level 2'].includes(currentUser.app_role)) {
      return Response.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { userId, reason } = await req.json();

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    // Get the target user
    const targetUsers = await base44.asServiceRole.entities.User.filter({ id: userId });
    if (targetUsers.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = targetUsers[0];

    // Prevent suspending yourself
    if (targetUser.email === currentUser.email) {
      return Response.json({ error: 'Cannot suspend your own account' }, { status: 400 });
    }

    // Prevent suspending Platform Admins unless you are one
    if (targetUser.app_role === 'Platform Admin' && currentUser.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Cannot suspend Platform Admin accounts' }, { status: 403 });
    }

    // Update user status
    await base44.asServiceRole.entities.User.update(userId, {
      account_status: 'suspended',
      account_suspended_at: new Date().toISOString(),
      account_suspended_by: currentUser.email,
      account_suspended_reason: reason || 'No reason provided'
    });

    // Log the activity
    await base44.asServiceRole.entities.ActivityLog.create({
      timestamp: new Date().toISOString(),
      initiator_user_email: currentUser.email,
      action_type: 'USER_ACCOUNT_SUSPENDED',
      target_user_email: targetUser.email,
      client_id: targetUser.client_id,
      metadata: {
        reason: reason || 'No reason provided',
        suspended_by: currentUser.email
      }
    });

    // Send notification email to the user
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: targetUser.email,
      subject: 'Your Account Has Been Suspended',
      body: `Hello ${targetUser.full_name || targetUser.email},\n\nYour account on the Curiosity Led platform has been suspended.\n\nReason: ${reason || 'No reason provided'}\n\nIf you believe this is an error, please contact your administrator.\n\nBest regards,\nCuriosity Led Team`
    });

    return Response.json({
      success: true,
      message: 'User account suspended successfully'
    });
  } catch (error) {
    console.error('Error suspending user:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});