import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Unauthorized: Platform Admin only' }, { status: 403 });
    }

    const templates = [
      {
        template_key: 'welcome_email',
        template_name: 'Welcome Email',
        category: 'account',
        subject: 'Welcome to {{platform_name}}!',
        body_html: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #0202ff;">Welcome to {{platform_name}}!</h2>
                <p>Hi {{user_name}},</p>
                <p>Welcome to {{platform_name}} - your leadership development platform. We're excited to have you join us!</p>
                
                {{#custom_message}}
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Message from your administrator:</strong></p>
                  <p style="margin: 10px 0 0 0;">{{custom_message}}</p>
                </div>
                {{/custom_message}}
                
                <h3 style="color: #333; margin-top: 30px;">Getting Started</h3>
                <ul style="list-style: none; padding: 0;">
                  <li style="margin: 10px 0;">✅ Complete your profile</li>
                  <li style="margin: 10px 0;">📊 Take your first leadership assessment</li>
                  <li style="margin: 10px 0;">🎯 Set your development goals</li>
                  <li style="margin: 10px 0;">📚 Explore learning resources</li>
                </ul>
                
                <p style="margin-top: 30px;">
                  <a href="{{login_url}}" style="background: #0202ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Get Started</a>
                </p>
                
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
                  <p>© {{current_year}} {{platform_name}}. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        body_text: `Welcome to {{platform_name}}!\n\nHi {{user_name}},\n\nWelcome to {{platform_name}} - your leadership development platform.\n\nGet started by logging in at: {{login_url}}`,
        available_variables: ['{{user_name}}', '{{platform_name}}', '{{custom_message}}', '{{login_url}}', '{{current_year}}'],
        is_system_default: true,
        is_active: true
      },
      {
        template_key: 'account_suspended',
        template_name: 'Account Suspended',
        category: 'security',
        subject: 'Your Account Has Been Suspended',
        body_html: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #dc2626;">Account Suspended</h2>
                <p>Hi {{user_name}},</p>
                <p>Your account on {{platform_name}} has been suspended.</p>
                
                <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Reason:</strong></p>
                  <p style="margin: 10px 0 0 0;">{{suspension_reason}}</p>
                </div>
                
                <p>If you believe this is an error, please contact your administrator.</p>
                
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
                  <p>© {{current_year}} {{platform_name}}. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        body_text: `Account Suspended\n\nHi {{user_name}},\n\nYour account has been suspended.\n\nReason: {{suspension_reason}}\n\nPlease contact your administrator if you believe this is an error.`,
        available_variables: ['{{user_name}}', '{{platform_name}}', '{{suspension_reason}}', '{{current_year}}'],
        is_system_default: true,
        is_active: true
      },
      {
        template_key: 'account_activated',
        template_name: 'Account Activated',
        category: 'account',
        subject: 'Your Account Has Been Activated',
        body_html: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #16a34a;">Account Activated</h2>
                <p>Hi {{user_name}},</p>
                <p>Good news! Your account on {{platform_name}} has been activated.</p>
                <p>You can now log in and access the platform.</p>
                
                <p style="margin-top: 30px;">
                  <a href="{{login_url}}" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Login Now</a>
                </p>
                
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
                  <p>© {{current_year}} {{platform_name}}. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        body_text: `Account Activated\n\nHi {{user_name}},\n\nYour account has been activated. You can now log in at: {{login_url}}`,
        available_variables: ['{{user_name}}', '{{platform_name}}', '{{login_url}}', '{{current_year}}'],
        is_system_default: true,
        is_active: true
      },
      {
        template_key: 'account_locked',
        template_name: 'Account Locked',
        category: 'security',
        subject: 'Your Account Has Been Locked',
        body_html: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #dc2626;">Account Locked</h2>
                <p>Hi {{user_name}},</p>
                <p>Your account has been locked for security reasons.</p>
                
                <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Reason:</strong> {{lock_reason}}</p>
                  <p style="margin: 10px 0 0 0;"><strong>Locked until:</strong> {{locked_until}}</p>
                </div>
                
                <p>Please contact your administrator for assistance.</p>
                
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
                  <p>© {{current_year}} {{platform_name}}. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        body_text: `Account Locked\n\nHi {{user_name}},\n\nYour account has been locked.\n\nReason: {{lock_reason}}\nLocked until: {{locked_until}}`,
        available_variables: ['{{user_name}}', '{{platform_name}}', '{{lock_reason}}', '{{locked_until}}', '{{current_year}}'],
        is_system_default: true,
        is_active: true
      },
      {
        template_key: 'account_unlocked',
        template_name: 'Account Unlocked',
        category: 'security',
        subject: 'Your Account Has Been Unlocked',
        body_html: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #16a34a;">Account Unlocked</h2>
                <p>Hi {{user_name}},</p>
                <p>Your account has been unlocked and you can now access the platform.</p>
                <p>If you did not request this change, please contact your administrator immediately.</p>
                
                <p style="margin-top: 30px;">
                  <a href="{{login_url}}" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Login Now</a>
                </p>
                
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
                  <p>© {{current_year}} {{platform_name}}. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        body_text: `Account Unlocked\n\nHi {{user_name}},\n\nYour account has been unlocked. You can now log in at: {{login_url}}`,
        available_variables: ['{{user_name}}', '{{platform_name}}', '{{login_url}}', '{{current_year}}'],
        is_system_default: true,
        is_active: true
      },
      {
        template_key: 'goal_reminder',
        template_name: 'Goal Reminder',
        category: 'notification',
        subject: 'Reminder: {{goal_title}} is due soon',
        body_html: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #0202ff;">Goal Reminder</h2>
                <p>Hi {{user_name}},</p>
                <p>This is a reminder that your goal is due soon:</p>
                
                <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin: 0 0 10px 0; color: #0202ff;">{{goal_title}}</h3>
                  <p style="margin: 0;"><strong>Due:</strong> {{due_date}}</p>
                  <p style="margin: 5px 0 0 0;"><strong>Progress:</strong> {{progress}}%</p>
                </div>
                
                <p style="margin-top: 30px;">
                  <a href="{{goal_url}}" style="background: #0202ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Goal</a>
                </p>
                
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
                  <p>© {{current_year}} {{platform_name}}. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        body_text: `Goal Reminder\n\nHi {{user_name}},\n\nYour goal "{{goal_title}}" is due on {{due_date}}.\n\nProgress: {{progress}}%\n\nView goal: {{goal_url}}`,
        available_variables: ['{{user_name}}', '{{goal_title}}', '{{due_date}}', '{{progress}}', '{{goal_url}}', '{{platform_name}}', '{{current_year}}'],
        is_system_default: true,
        is_active: true
      }
    ];

    const created = [];
    for (const template of templates) {
      // Check if template already exists
      const existing = await base44.asServiceRole.entities.EmailTemplate.filter({ 
        template_key: template.template_key 
      });

      if (existing.length === 0) {
        const newTemplate = await base44.asServiceRole.entities.EmailTemplate.create(template);
        created.push(newTemplate);
      }
    }

    return Response.json({
      success: true,
      message: `Seeded ${created.length} email templates`,
      created_count: created.length,
      total_templates: templates.length
    });

  } catch (error) {
    console.error('Error seeding email templates:', error);
    return Response.json({ 
      error: 'Failed to seed email templates',
      details: error.message 
    }, { status: 500 });
  }
});