import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Platform Admin and Super Admin can log impersonation
    const allowedRoles = ['Platform Admin', 'Super Administrator'];
    if (!allowedRoles.includes(user.app_role)) {
      return Response.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { targetUserEmail, reason, eventType = 'started' } = await req.json();

    if (!targetUserEmail) {
      return Response.json({ error: 'targetUserEmail is required' }, { status: 400 });
    }

    // Get target user details
    const allUsers = await base44.asServiceRole.entities.User.list();
    const targetUser = allUsers.find(u => u.email === targetUserEmail);

    if (!targetUser) {
      return Response.json({ error: 'Target user not found' }, { status: 404 });
    }

    if (eventType === 'started') {
      // Create new impersonation log
      const log = await base44.asServiceRole.entities.ImpersonationLog.create({
        admin_email: user.email,
        target_user_email: targetUserEmail,
        started_at: new Date().toISOString(),
        reason: reason || 'Support assistance',
        client_id: targetUser.client_id,
        actions_performed: []
      });

      return Response.json({
        success: true,
        message: 'Impersonation started',
        logId: log.id
      });

    } else if (eventType === 'ended') {
      // Find and update the most recent active impersonation log
      const logs = await base44.asServiceRole.entities.ImpersonationLog.filter({
        admin_email: user.email,
        target_user_email: targetUserEmail,
        ended_at: null
      }, '-started_at', 1);

      if (logs.length > 0) {
        const log = logs[0];
        const startedAt = new Date(log.started_at);
        const endedAt = new Date();
        const durationMinutes = Math.round((endedAt - startedAt) / (1000 * 60));

        await base44.asServiceRole.entities.ImpersonationLog.update(log.id, {
          ended_at: endedAt.toISOString(),
          duration_minutes: durationMinutes
        });

        return Response.json({
          success: true,
          message: 'Impersonation ended',
          duration_minutes: durationMinutes
        });
      }

      return Response.json({
        success: true,
        message: 'No active impersonation session found'
      });
    }

    return Response.json({ error: 'Invalid eventType' }, { status: 400 });

  } catch (error) {
    console.error('Error logging impersonation event:', error);
    return Response.json({
      error: 'Failed to log impersonation event',
      details: error.message
    }, { status: 500 });
  }
});