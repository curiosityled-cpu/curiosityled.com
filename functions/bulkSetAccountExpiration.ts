import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const allowedRoles = ['Admin Level 2', 'Super Administrator', 'Platform Admin', 'Partner Business Administrator'];
    if (!allowedRoles.includes(user.app_role)) {
      return Response.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { userIds, expirationDate, accountType, notifyUsers = false } = await req.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return Response.json({ error: 'userIds array is required' }, { status: 400 });
    }

    // Validate expiration date if provided
    if (expirationDate) {
      const expDate = new Date(expirationDate);
      if (expDate <= new Date()) {
        return Response.json({ error: 'Expiration date must be in the future' }, { status: 400 });
      }
    }

    const results = {
      successful: [],
      failed: [],
      total: userIds.length
    };

    // Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();

    for (const userId of userIds) {
      try {
        const targetUser = allUsers.find(u => u.id === userId);
        
        if (!targetUser) {
          results.failed.push({ userId, error: 'User not found' });
          continue;
        }

        // Update user
        const updateData = {};
        if (expirationDate !== undefined) {
          updateData.account_expires_at = expirationDate;
        }
        if (accountType) {
          updateData.account_type = accountType;
        }

        await base44.asServiceRole.entities.User.update(userId, updateData);

        // Send notification if requested
        if (notifyUsers && expirationDate) {
          const expDate = new Date(expirationDate);
          const formattedDate = expDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });

          try {
            await base44.integrations.Core.SendEmail({
              from_name: 'Curiosity Led',
              to: targetUser.email,
              subject: 'Account Access Notice',
              body: `
                <html>
                  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                      <h2 style="color: #0202ff;">Account Access Information</h2>
                      <p>Hi ${targetUser.full_name},</p>
                      <p>This is to inform you that your account access will expire on <strong>${formattedDate}</strong>.</p>
                      <p>If you need to extend your access, please contact your administrator.</p>
                      <p style="margin-top: 30px;">Thank you,<br>Curiosity Led Team</p>
                    </div>
                  </body>
                </html>
              `
            });
          } catch (emailError) {
            console.warn(`Failed to send notification to ${targetUser.email}:`, emailError.message);
          }
        }

        // Log activity
        await base44.asServiceRole.entities.ActivityLog.create({
          timestamp: new Date().toISOString(),
          initiator_user_email: user.email,
          action_type: 'USER_ACCOUNT_UPDATED',
          target_user_email: targetUser.email,
          client_id: targetUser.client_id,
          old_value: targetUser.account_expires_at || 'No expiration',
          new_value: expirationDate || 'No expiration',
          metadata: {
            account_type: accountType,
            bulk_operation: true
          }
        });

        results.successful.push(userId);

      } catch (error) {
        results.failed.push({
          userId,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      message: `Bulk expiration update complete: ${results.successful.length} successful, ${results.failed.length} failed`,
      results
    });

  } catch (error) {
    console.error('Error in bulk set account expiration:', error);
    return Response.json({
      error: 'Failed to bulk set account expiration',
      details: error.message
    }, { status: 500 });
  }
});