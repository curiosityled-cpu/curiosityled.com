import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can resend invitations
    if (!['Platform Admin', 'Super Administrator', 'Partner Business Administrator', 'Admin Level 2', 'Admin Level 1'].includes(currentUser.app_role)) {
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

    // Re-invite the user using Base44's invite system
    // Note: This will send a new setup/invitation email
    await base44.users.inviteUser(targetUser.email, targetUser.app_role || 'User Level 1');

    // Update invitation tracking
    await base44.asServiceRole.entities.User.update(userId, {
      last_invitation_sent_at: new Date().toISOString(),
      invitation_resend_count: (targetUser.invitation_resend_count || 0) + 1
    });

    // Log the activity
    await base44.asServiceRole.entities.ActivityLog.create({
      timestamp: new Date().toISOString(),
      initiator_user_email: currentUser.email,
      action_type: 'USER_INVITATION_RESENT',
      target_user_email: targetUser.email,
      client_id: targetUser.client_id,
      metadata: {
        resend_count: (targetUser.invitation_resend_count || 0) + 1
      }
    });

    return Response.json({
      success: true,
      message: 'Invitation email sent successfully',
      resend_count: (targetUser.invitation_resend_count || 0) + 1
    });
  } catch (error) {
    console.error('Error resending invitation:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});