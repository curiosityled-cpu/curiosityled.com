import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Creates a new user manually with validation and welcome email
 * Only admins can create users
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const currentUser = await base44.auth.me();
        
        if (!currentUser) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Only Admin Level 2 and 3 can create users
        if (!['Admin Level 2', 'Admin Level 3'].includes(currentUser.app_role)) {
            return Response.json({ 
                success: false, 
                error: 'Forbidden - Only Admin Level 2 and Admin Level 3 can create users' 
            }, { status: 403 });
        }

        const { userData } = await req.json();

        if (!userData || !userData.email || !userData.full_name) {
            return Response.json({ 
                success: false, 
                error: 'userData with email and full_name are required' 
            }, { status: 400 });
        }

        // Check for duplicate email
        const existing = await base44.asServiceRole.entities.User.filter({ 
            email: userData.email.toLowerCase() 
        });
        
        if (existing.length > 0) {
            return Response.json({ 
                success: false, 
                error: 'A user with this email already exists' 
            }, { status: 409 });
        }

        // Create user
        const newUser = await base44.asServiceRole.entities.User.create(userData);

        // Get login URL
        const loginUrl = req.headers.get('origin') || 'https://app.curiosityled.com';

        // Send welcome email
        await base44.asServiceRole.integrations.invoke('Core', 'SendEmail', {
            to: userData.email,
            subject: "Welcome to Curiosity Led! Your Leadership Journey Awaits",
            body: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1e40af;">Hello ${userData.full_name},</h2>
                    <p>Welcome to Curiosity Led! We're excited to have you on board.</p>
                    <p>Your account has been set up with the role: <strong>${userData.app_role}</strong>.</p>
                    
                    <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Your Username:</strong> ${userData.email}</p>
                        <p style="margin: 5px 0;"><strong>Department:</strong> ${userData.department}</p>
                        <p style="margin: 5px 0;"><strong>Current Role:</strong> ${userData.current_role}</p>
                    </div>
                    
                    <p>To get started, please log in here:</p>
                    <p><a href="${loginUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Log In to Curiosity Led</a></p>
                    
                    <p style="margin-top: 20px;">If this is your first time logging in, or you have forgotten your password, you can reset it through the login page.</p>
                    <p>We recommend setting a strong password immediately upon your first login.</p>
                    
                    <p>If you have any questions, please contact your administrator.</p>
                    
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;"/>
                    <p style="color: #6b7280; font-size: 14px;">Best regards,<br/>The Curiosity Led Team</p>
                </div>
            `,
            from_name: 'Curiosity Led'
        });

        // Log activity
        await base44.asServiceRole.entities.ActivityLog.create({
            timestamp: new Date().toISOString(),
            initiator_user_email: currentUser.email,
            action_type: 'USER_CREATED',
            target_user_email: userData.email,
            new_value: userData.app_role,
            metadata: {
                department: userData.department,
                current_role: userData.current_role,
                created_by: currentUser.full_name,
                creation_method: 'manual'
            }
        });

        return Response.json({ 
            success: true,
            user: newUser
        });

    } catch (error) {
        console.error('Error creating user:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});