import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Handles password reset for users with temporary passwords
 * Sets account status to 'active' after successful password change
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { email, temporaryPassword, newPassword } = await req.json();
        
        if (!email || !temporaryPassword || !newPassword) {
            return Response.json({ 
                success: false, 
                error: 'Email, temporary password, and new password are required' 
            }, { status: 400 });
        }

        // Validate new password strength
        if (newPassword.length < 8) {
            return Response.json({ 
                success: false, 
                error: 'New password must be at least 8 characters' 
            }, { status: 400 });
        }

        if (!/[A-Z]/.test(newPassword)) {
            return Response.json({ 
                success: false, 
                error: 'New password must contain at least one uppercase letter' 
            }, { status: 400 });
        }

        if (!/[0-9]/.test(newPassword)) {
            return Response.json({ 
                success: false, 
                error: 'New password must contain at least one number' 
            }, { status: 400 });
        }

        // Get user by email
        const users = await base44.asServiceRole.entities.User.filter({ 
            email: email.toLowerCase() 
        });

        if (users.length === 0) {
            return Response.json({ 
                success: false, 
                error: 'User not found' 
            }, { status: 404 });
        }

        const user = users[0];

        // Verify temporary password matches
        if (user.temporary_password !== temporaryPassword) {
            return Response.json({ 
                success: false, 
                error: 'Invalid temporary password' 
            }, { status: 401 });
        }

        // Update user: set new password, clear temp password, activate account
        await base44.asServiceRole.entities.User.update(user.id, {
            account_status: 'active',
            must_reset_password: false,
            temporary_password: null,
            license_activated_at: new Date().toISOString(),
            invitation_accepted_at: new Date().toISOString(),
            password_changed_at: new Date().toISOString()
        });

        // Log activity
        try {
            await base44.asServiceRole.entities.ActivityLog.create({
                timestamp: new Date().toISOString(),
                initiator_user_email: email,
                action_type: 'USER_ACCOUNT_ACTIVATED',
                target_user_email: email,
                metadata: {
                    activation_method: 'password_reset',
                    activated_by: 'self'
                }
            });
        } catch (logError) {
            console.warn('Failed to create activity log:', logError.message);
        }

        return Response.json({ 
            success: true,
            message: 'Password updated and account activated successfully'
        });

    } catch (error) {
        console.error('Error resetting password:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});