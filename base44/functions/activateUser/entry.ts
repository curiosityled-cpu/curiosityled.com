import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can activate users
    if (!['Platform Admin', 'Super Administrator', 'Partner Business Administrator', 'Admin Level 2'].includes(currentUser.app_role)) {
      return Response.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { userId } = await req.json();

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    // Get the target user
    const targetUsers = await base44.asServiceRole.entities.User.filter({ id: userId });
    if (targetUsers.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = targetUsers[0];

    // Update user status
    await base44.asServiceRole.entities.User.update(userId, {
      account_status: 'active',
      account_suspended_at: null,
      account_suspended_by: null,
      account_suspended_reason: null
    });

    // Log the activity
    await base44.asServiceRole.entities.ActivityLog.create({
      timestamp: new Date().toISOString(),
      initiator_user_email: currentUser.email,
      action_type: 'USER_ACCOUNT_ACTIVATED',
      target_user_email: targetUser.email,
      client_id: targetUser.client_id,
      metadata: {
        activated_by: currentUser.email
      }
    });

    // Send notification email to the user
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: targetUser.email,
      subject: 'Your Account Has Been Activated',
      body: `Hello ${targetUser.full_name || targetUser.email},\n\nGood news! Your account on the Curiosity Led platform has been activated.\n\nYou can now log in and access the platform at: ${Deno.env.get('APP_URL') || 'https://curiosityled.ai'}\n\nBest regards,\nCuriosity Led Team`
    });

    return Response.json({
      success: true,
      message: 'User account activated successfully'
    });
  } catch (error) {
    console.error('Error activating user:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});