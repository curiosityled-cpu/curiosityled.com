import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * This function should be called by Base44's authentication system or a webhook
 * to log login attempts. It tracks successful logins, failed attempts, and account locks.
 * 
 * NOTE: This is a placeholder for integration with Base44's auth system.
 * In production, this would be triggered automatically on login events.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { 
      userEmail, 
      status, 
      ipAddress, 
      deviceType, 
      browser, 
      location,
      failureReason,
      sessionId
    } = await req.json();

    if (!userEmail || !status) {
      return Response.json({ error: 'userEmail and status are required' }, { status: 400 });
    }

    if (!['success', 'failed', 'locked'].includes(status)) {
      return Response.json({ error: 'Invalid status. Must be success, failed, or locked' }, { status: 400 });
    }

    // Log the login attempt
    await base44.asServiceRole.entities.LoginHistory.create({
      user_email: userEmail,
      login_timestamp: new Date().toISOString(),
      ip_address: ipAddress,
      device_type: deviceType,
      browser: browser,
      location: location,
      status: status,
      failure_reason: status === 'failed' ? failureReason : null,
      session_id: status === 'success' ? sessionId : null
    });

    // If successful, create an active session record
    if (status === 'success' && sessionId) {
      await base44.asServiceRole.entities.ActiveSession.create({
        user_email: userEmail,
        session_id: sessionId,
        started_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        ip_address: ipAddress,
        device_type: deviceType,
        browser: browser,
        location: location,
        is_active: true
      });
    }

    // If failed, increment failed login attempts
    if (status === 'failed') {
      const allUsers = await base44.asServiceRole.entities.User.list();
      const user = allUsers.find(u => u.email === userEmail);
      if (user) {
        const failedAttempts = (user.failed_login_attempts || 0) + 1;

        // Lock account after 5 failed attempts
        if (failedAttempts >= 5) {
          const lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
          
          await base44.asServiceRole.entities.User.update(user.id, {
            failed_login_attempts: failedAttempts,
            account_status: 'locked',
            locked_until: lockedUntil,
            locked_reason: 'Too many failed login attempts'
          });

          // Send alert email
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: userEmail,
            subject: 'Account Locked - Security Alert',
            body: `Your account has been locked due to multiple failed login attempts.\n\nYour account will be automatically unlocked at ${new Date(lockedUntil).toLocaleString()}.\n\nIf you did not attempt these logins, please contact your administrator immediately.\n\nBest regards,\nCuriosity Led Team`
          });
        } else {
          await base44.asServiceRole.entities.User.update(user.id, {
            failed_login_attempts: failedAttempts
          });
        }
      }
    }

    // If successful, reset failed attempts counter
    if (status === 'success') {
      const allUsers = await base44.asServiceRole.entities.User.list();
      const user = allUsers.find(u => u.email === userEmail);
      if (user && user.failed_login_attempts > 0) {
        await base44.asServiceRole.entities.User.update(user.id, {
          failed_login_attempts: 0,
          last_login_date: new Date().toISOString()
        });
      }
    }

    return Response.json({
      success: true,
      message: 'Login attempt logged successfully'
    });
  } catch (error) {
    console.error('Error tracking login attempt:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});