import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can bulk resend invitations
    if (!['Platform Admin', 'Super Administrator', 'Partner Business Administrator', 'Admin Level 2', 'Admin Level 1'].includes(currentUser.app_role)) {
      return Response.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { userIds } = await req.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return Response.json({ error: 'userIds array is required' }, { status: 400 });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const userId of userIds) {
      try {
        const targetUsers = await base44.asServiceRole.entities.User.filter({ id: userId });
        if (targetUsers.length === 0) {
          results.failed.push({ userId, error: 'User not found' });
          continue;
        }

        const targetUser = targetUsers[0];

        // Re-invite the user
        await base44.users.inviteUser(targetUser.email, targetUser.app_role || 'User Level 1');

        // Update invitation tracking
        await base44.asServiceRole.entities.User.update(userId, {
          last_invitation_sent_at: new Date().toISOString(),
          invitation_resend_count: (targetUser.invitation_resend_count || 0) + 1
        });

        // Log activity
        await base44.asServiceRole.entities.ActivityLog.create({
          timestamp: new Date().toISOString(),
          initiator_user_email: currentUser.email,
          action_type: 'USER_INVITATION_RESENT',
          target_user_email: targetUser.email,
          client_id: targetUser.client_id,
          metadata: {
            bulk_operation: true,
            resend_count: (targetUser.invitation_resend_count || 0) + 1
          }
        });

        results.success.push({ userId, email: targetUser.email });
      } catch (error) {
        results.failed.push({ userId, error: error.message });
      }
    }

    return Response.json({
      success: true,
      results,
      message: `Sent invitations to ${results.success.length} users, ${results.failed.length} failed`
    });
  } catch (error) {
    console.error('Error bulk resending invitations:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});