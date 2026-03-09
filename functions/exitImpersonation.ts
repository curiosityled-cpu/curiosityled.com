import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Try to log end of impersonation if we can get the data from request
    try {
      const body = await req.json().catch(() => ({}));
      const { targetUserEmail } = body;

      if (targetUserEmail) {
        const logs = await base44.asServiceRole.entities.ImpersonationLog.filter({
          admin_email: currentUser.email,
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
        }
      }
    } catch (logError) {
      console.warn('Failed to log impersonation end:', logError.message);
    }

    return Response.json({
      success: true,
      message: 'Impersonation session ended'
    });

  } catch (error) {
    console.error('Error exiting impersonation:', error);
    return Response.json({ 
      error: error.message || 'Failed to exit impersonation' 
    }, { status: 500 });
  }
});