import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Activates user license on first login
 * For users with temporary passwords, redirects to password reset page
 * For normal users, activates their license
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user needs to reset password
        if (user.must_reset_password && user.temporary_password) {
            return Response.json({ 
                success: false,
                requires_password_reset: true,
                message: 'Password reset required',
                redirect_to: '/FirstLoginPasswordReset'
            });
        }

        // Check if license is already activated
        if (user.account_status === 'active' && user.license_activated_at) {
            return Response.json({ 
                success: true, 
                message: 'License already activated',
                already_active: true
            });
        }

        // Activate the license
        await base44.asServiceRole.entities.User.update(user.id, {
            account_status: 'active',
            license_activated_at: new Date().toISOString(),
            invitation_accepted_at: new Date().toISOString()
        });

        return Response.json({ 
            success: true,
            message: 'License activated successfully',
            activated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error activating license:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});