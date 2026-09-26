import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { resolveUserScope, isUserInScope } from '../../shared/userScope.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, userEmail, terminateAll = false } = await req.json();

    if (!userEmail) {
      return Response.json({ error: 'userEmail is required' }, { status: 400 });
    }

    // Check authorization
    const isAdmin = ['Platform Admin', 'Super Administrator', 'Partner Business Administrator', 'Admin Level 2'].includes(currentUser.app_role);
    const isSelf = currentUser.email === userEmail;
    
    if (!isAdmin && !isSelf) {
      return Response.json({ error: 'Forbidden: Cannot terminate other users sessions' }, { status: 403 });
    }

    // Tenant scoping: non-Platform-Admin admins can only terminate sessions of
    // users within their own tenant/partner scope. Mirrors getUserActiveSessions.
    if (isAdmin && !isSelf && currentUser.app_role !== 'Platform Admin') {
      const scope = resolveUserScope(currentUser);
      if (scope.role === 'Partner Business Administrator') {
        const allClients = await base44.asServiceRole.entities.Client.list();
        scope.partnerClientIds = allClients
          .filter(c => c.partner_id === scope.partner_id)
          .map(c => c.id);
      }
      const targetUsers = await base44.asServiceRole.entities.User.filter({ email: userEmail }).catch(() => []);
      if (targetUsers.length === 0 || !isUserInScope(targetUsers[0], scope)) {
        return Response.json({ error: 'Forbidden: Target user is outside your tenant scope' }, { status: 403 });
      }
    }

    const endReason = isSelf ? 'force_logout_user' : 'force_logout_admin';
    const now = new Date().toISOString();

    if (terminateAll) {
      // Terminate all active sessions for the user
      const allSessions = await base44.asServiceRole.entities.ActiveSession.list();
      const activeSessions = allSessions.filter(s => s.user_email === userEmail && s.is_active);

      for (const session of activeSessions) {
        await base44.asServiceRole.entities.ActiveSession.update(session.id, {
          is_active: false,
          ended_at: now,
          end_reason: endReason
        });
      }

      // Log activity if admin terminated another user's sessions
      if (!isSelf) {
        await base44.asServiceRole.entities.ActivityLog.create({
          timestamp: now,
          initiator_user_email: currentUser.email,
          action_type: 'USER_SESSIONS_TERMINATED',
          target_user_email: userEmail,
          metadata: {
            session_count: activeSessions.length,
            reason: 'Admin force logout'
          }
        });
      }

      return Response.json({
        success: true,
        message: `Terminated ${activeSessions.length} session(s)`,
        count: activeSessions.length
      });
    } else {
      // Terminate specific session
      if (!sessionId) {
        return Response.json({ error: 'sessionId is required when terminateAll is false' }, { status: 400 });
      }

      const allSessions = await base44.asServiceRole.entities.ActiveSession.list();
      const session = allSessions.find(s => s.id === sessionId);
      
      if (!session) {
        return Response.json({ error: 'Session not found' }, { status: 404 });
      }

      // Verify session belongs to target user
      if (session.user_email !== userEmail) {
        return Response.json({ error: 'Session does not belong to specified user' }, { status: 400 });
      }

      await base44.asServiceRole.entities.ActiveSession.update(sessionId, {
        is_active: false,
        ended_at: now,
        end_reason: endReason
      });

      return Response.json({
        success: true,
        message: 'Session terminated successfully'
      });
    }
  } catch (error) {
    console.error('Error terminating session:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});