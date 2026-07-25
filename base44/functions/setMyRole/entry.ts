import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Allows the current user to update their own app_role
 * This is a convenience function for testing and initial setup
 * In production, only appropriate admins should change roles via User Management
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only administrators may change app roles. Non-admins must use User Management.
        const ADMIN_ROLES = ['Platform Admin', 'Super Administrator', 'Partner Business Administrator'];
        if (!ADMIN_ROLES.includes(user.app_role)) {
            return Response.json({ error: 'Forbidden - admin access required to change roles' }, { status: 403 });
        }

        const { role } = await req.json();

        const validRoles = [
            'User Level 1',
            'User Level 2', 
            'Analyst',
            'Executive',
            'Admin Level 1',
            'Admin Level 2',
            'Super Administrator',
            'Partner Business Administrator',
            'Platform Admin'
        ];

        if (!validRoles.includes(role)) {
            return Response.json({ 
                error: 'Invalid role. Must be one of: ' + validRoles.join(', ')
            }, { status: 400 });
        }

        const oldRole = user.app_role;

        // Update user's role using service role
        await base44.asServiceRole.entities.User.update(user.id, { app_role: role });

        // Log the role change
        await base44.asServiceRole.entities.ActivityLog.create({
            timestamp: new Date().toISOString(),
            initiator_user_email: user.email,
            action_type: 'USER_ROLE_CHANGE',
            target_user_email: user.email,
            old_value: oldRole,
            new_value: role,
            metadata: { action: 'self_role_change', note: 'Via Role Selector (demo feature)' }
        });

        return Response.json({ 
            success: true,
            message: `Your role has been updated to: ${role}`,
            previous_role: oldRole,
            new_role: role
        });

    } catch (error) {
        console.error('Error updating role:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});