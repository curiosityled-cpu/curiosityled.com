import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * One-time setup function to make the current user a Platform Administrator
 * This should only be used during initial setup for Curiosity Led staff
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Get current user
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized - Please log in first' }, { status: 401 });
        }

        // Update user's role to Platform Administrator using service role
        await base44.asServiceRole.entities.User.update(user.id, { 
            app_role: 'Platform Admin',
            organization_id: null  // Platform Admins don't belong to any organization
        });

        return Response.json({ 
            success: true,
            message: `Success! ${user.email} is now a Curiosity Led Platform Administrator`,
            user_email: user.email,
            new_role: 'Platform Admin',
            role_display: 'Curiosity Led Platform Admin',
            instructions: 'Please reload the page to see your new permissions. You now have access to Business Manager and can manage all organizations and users.'
        });

    } catch (error) {
        console.error('Error setting up platform admin:', error);
        return Response.json({ 
            error: error.message,
            details: 'Failed to update user role. Please try again or contact support.'
        }, { status: 500 });
    }
});