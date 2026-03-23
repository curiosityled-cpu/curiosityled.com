import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to send welcome emails
    const allowedRoles = ['Admin Level 2', 'Super Administrator', 'Platform Admin', 'Partner Business Administrator'];
    if (!allowedRoles.includes(user.app_role)) {
      return Response.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { userEmail, customMessage, includePlatformInfo = true } = await req.json();

    if (!userEmail) {
      return Response.json({ error: 'userEmail is required' }, { status: 400 });
    }

    // Get target user details
    const allUsers = await base44.asServiceRole.entities.User.list();
    const targetUser = allUsers.find(u => u.email === userEmail);

    if (!targetUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Get email template
    const templateResponse = await base44.asServiceRole.functions.invoke('getEmailTemplate', {
      template_key: 'welcome_email',
      variables: {
        user_name: targetUser.full_name || targetUser.email,
        custom_message: customMessage || ''
      }
    });

    if (!templateResponse.data?.success) {
      // Fallback to hardcoded template if template system fails
      const welcomeMessage = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #0202ff;">Welcome to Curiosity Led!</h2>
              <p>Hi ${targetUser.full_name || 'there'},</p>
              <p>Welcome to Curiosity Led - your leadership development platform. We're excited to have you join us!</p>
              ${customMessage ? `<div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Message from your administrator:</strong></p>
                <p style="margin: 10px 0 0 0;">${customMessage}</p>
              </div>` : ''}
            </div>
          </body>
        </html>
      `;
      
      await base44.integrations.Core.SendEmail({
        from_name: 'Curiosity Led',
        to: userEmail,
        subject: 'Welcome to Curiosity Led!',
        body: welcomeMessage
      });
    } else {
      // Use template
      await base44.integrations.Core.SendEmail({
        from_name: 'Curiosity Led',
        to: userEmail,
        subject: templateResponse.data.template.subject,
        body: templateResponse.data.template.body_html
      });
    }

    // Log activity
    await base44.asServiceRole.entities.ActivityLog.create({
      timestamp: new Date().toISOString(),
      initiator_user_email: user.email,
      action_type: 'USER_CREATED',
      target_user_email: userEmail,
      client_id: targetUser.client_id,
      metadata: {
        welcome_email_sent: true,
        custom_message_included: !!customMessage
      }
    });

    return Response.json({
      success: true,
      message: 'Welcome email sent successfully',
      recipient: userEmail
    });

  } catch (error) {
    console.error('Error sending welcome email:', error);
    return Response.json({
      error: 'Failed to send welcome email',
      details: error.message
    }, { status: 500 });
  }
});