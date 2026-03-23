import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This is an automated function - no user auth required
    const now = new Date();

    // Get all users with expiration dates
    const allUsers = await base44.asServiceRole.entities.User.list();
    const expiredUsers = allUsers.filter(u => {
      if (!u.account_expires_at) return false;
      const expDate = new Date(u.account_expires_at);
      return expDate <= now && u.account_status === 'active';
    });

    const results = {
      processed: 0,
      suspended: [],
      errors: []
    };

    // Process each expired account
    for (const user of expiredUsers) {
      try {
        // Suspend the account
        await base44.asServiceRole.entities.User.update(user.id, {
          account_status: 'suspended'
        });

        // Terminate all active sessions
        try {
          const allSessions = await base44.asServiceRole.entities.ActiveSession.list();
          const userSessions = allSessions.filter(s => s.user_email === user.email && s.is_active);

          for (const session of userSessions) {
            await base44.asServiceRole.entities.ActiveSession.update(session.id, {
              is_active: false,
              ended_at: now.toISOString(),
              end_reason: 'timeout'
            });
          }
        } catch (sessionError) {
          console.warn(`Failed to terminate sessions for ${user.email}:`, sessionError.message);
        }

        // Log activity
        await base44.asServiceRole.entities.ActivityLog.create({
          timestamp: now.toISOString(),
          initiator_user_email: 'system@automation',
          action_type: 'USER_ACCOUNT_SUSPENDED',
          target_user_email: user.email,
          client_id: user.client_id,
          metadata: {
            reason: 'Account expired',
            expired_date: user.account_expires_at,
            automated: true
          }
        });

        // Send notification to user
        try {
          await base44.integrations.Core.SendEmail({
            from_name: 'Curiosity Led',
            to: user.email,
            subject: 'Account Access Expired',
            body: `
              <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #0202ff;">Account Access Expired</h2>
                    <p>Hi ${user.full_name},</p>
                    <p>Your account access to Curiosity Led has expired as of ${new Date(user.account_expires_at).toLocaleDateString()}.</p>
                    <p>To renew your access, please contact your administrator.</p>
                    <p style="margin-top: 30px;">Thank you,<br>Curiosity Led Team</p>
                  </div>
                </body>
              </html>
            `
          });
        } catch (emailError) {
          console.warn(`Failed to send expiration email to ${user.email}:`, emailError.message);
        }

        results.suspended.push(user.email);
        results.processed++;

      } catch (error) {
        results.errors.push({
          email: user.email,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      message: `Processed ${results.processed} expired accounts`,
      results
    });

  } catch (error) {
    console.error('Error processing expired accounts:', error);
    return Response.json({
      error: 'Failed to process expired accounts',
      details: error.message
    }, { status: 500 });
  }
});