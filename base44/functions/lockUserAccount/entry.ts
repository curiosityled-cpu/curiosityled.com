import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can manually lock accounts
    if (!['Platform Admin', 'Super Administrator', 'Partner Business Administrator', 'Admin Level 2'].includes(currentUser.app_role)) {
      return Response.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { userId, reason, durationHours = 24 } = await req.json();

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    // Get the target user
    const allUsers = await base44.asServiceRole.entities.User.list();
    const targetUser = allUsers.find(u => u.id === userId);
    
    if (!targetUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent locking yourself
    if (targetUser.email === currentUser.email) {
      return Response.json({ error: 'Cannot lock your own account' }, { status: 400 });
    }

    // Calculate lock expiry
    const lockedUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();

    // Update user status
    await base44.asServiceRole.entities.User.update(userId, {
      account_status: 'locked',
      locked_until: lockedUntil,
      locked_reason: reason || 'Account locked by administrator',
      failed_login_attempts: (targetUser.failed_login_attempts || 0)
    });

    // Terminate all active sessions
    const allSessions = await base44.asServiceRole.entities.ActiveSession.list();
    const activeSessions = allSessions.filter(s => s.user_email === targetUser.email && s.is_active);

    for (const session of activeSessions) {
      await base44.asServiceRole.entities.ActiveSession.update(session.id, {
        is_active: false,
        ended_at: new Date().toISOString(),
        end_reason: 'force_logout_admin'
      });
    }

    // Log the activity
    await base44.asServiceRole.entities.ActivityLog.create({
      timestamp: new Date().toISOString(),
      initiator_user_email: currentUser.email,
      action_type: 'USER_ACCOUNT_LOCKED',
      target_user_email: targetUser.email,
      client_id: targetUser.client_id,
      metadata: {
        reason: reason || 'Account locked by administrator',
        locked_until: lockedUntil,
        sessions_terminated: activeSessions.length
      }
    });

    // Send notification email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: targetUser.email,
      subject: 'Your Account Has Been Locked',
      body: `Hello ${targetUser.full_name || targetUser.email},\n\nYour account has been locked for security reasons.\n\nReason: ${reason || 'Account locked by administrator'}\nLocked until: ${new Date(lockedUntil).toLocaleString()}\n\nPlease contact your administrator for assistance.\n\nBest regards,\nCuriosity Led Team`
    });

    return Response.json({
      success: true,
      message: 'User account locked successfully',
      locked_until: lockedUntil
    });
  } catch (error) {
    console.error('Error locking account:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});