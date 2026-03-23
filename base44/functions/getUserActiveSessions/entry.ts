import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userEmail } = await req.json();

    if (!userEmail) {
      return Response.json({ error: 'userEmail is required' }, { status: 400 });
    }

    // Check authorization
    const isAdmin = ['Platform Admin', 'Super Administrator', 'Partner Business Administrator', 'Admin Level 2'].includes(currentUser.app_role);
    
    if (!isAdmin && currentUser.email !== userEmail) {
      return Response.json({ error: 'Forbidden: Cannot view other users sessions' }, { status: 403 });
    }

    // Fetch active sessions using list() to bypass RLS completely
    const allSessions = await base44.asServiceRole.entities.ActiveSession.list('-last_activity');
    const activeSessions = allSessions.filter(s => s.user_email === userEmail && s.is_active);

    // Calculate session durations
    const sessionsWithDuration = activeSessions.map(session => {
      const startTime = new Date(session.started_at);
      const lastActivity = new Date(session.last_activity);
      const durationMinutes = Math.floor((lastActivity - startTime) / (1000 * 60));
      
      return {
        ...session,
        duration_minutes: durationMinutes,
        is_current: false // Will be determined client-side if needed
      };
    });

    return Response.json({
      success: true,
      sessions: sessionsWithDuration,
      count: activeSessions.length
    });
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});