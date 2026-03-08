import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * One-time setup function to make the current user a Super Administrator
 * This should only be used during initial setup
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Get current user
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized - Please log in first' }, { status: 401 });
        }

        // Update user's role to Super Administrator using service role
        await base44.asServiceRole.entities.User.update(user.id, { 
            app_role: 'Admin Level 3'
        });

        return Response.json({ 
            success: true,
            message: `Success! ${user.email} is now a Super Administrator`,
            user_email: user.email,
            new_role: 'Admin Level 3',
            role_display: 'Super Administrator',
            instructions: 'Please reload the page to see your new permissions.'
        });

    } catch (error) {
        console.error('Error setting up super admin:', error);
        return Response.json({ 
            error: error.message,
            details: 'Failed to update user role. Please try again or contact support.'
        }, { status: 500 });
    }
});