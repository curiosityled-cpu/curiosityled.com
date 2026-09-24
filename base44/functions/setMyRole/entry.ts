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

        const { role } = await req.json();

        // Security: Self-service role changes are restricted to privileged users
        // (Platform Admin, Super Administrator, Partner Business Administrator)
        // who already hold elevated access and use the Role Selector only to
        // preview different experiences. Regular users CANNOT self-assign any
        // role — doing so enabled vertical privilege escalation (e.g. a User
        // Level 1 granting themselves 'User Level 2' to access team data,
        // bulk assignment, and other manager-gated functions). Production role
        // management for regular users happens via admin-only User Management.
        const privilegedRoles = [
            'Platform Admin',
            'Super Administrator',
            'Partner Business Administrator'
        ];

        if (!privilegedRoles.includes(user.app_role)) {
            return Response.json({
                error: 'Self-service role changes are not available. Contact an administrator to update your role.'
            }, { status: 403 });
        }

        // Security: Privileged users may switch to LOWER-privilege roles only for
        // demo/preview purposes. Platform Admin is never self-assignable — it can
        // only be granted by an existing Platform Admin through user management.
        // This prevents vertical privilege escalation (e.g. a Partner Business
        // Administrator elevating themselves to Platform Admin).
        const allSelectableRoles = ['Admin Level 2', 'User Level 1', 'User Level 2', 'Leadership Coach', 'Consultant'];

        if (!allSelectableRoles.includes(role)) {
            return Response.json({
                error: 'Invalid role selection. Platform Admin can only be granted by an existing Platform Admin via User Management.'
            }, { status: 400 });
        }

        const oldRole = user.app_role;

        // Update user's role using service role
        await base44.asServiceRole.entities.User.update(user.id, { app_role: role });

        // Best-effort audit log — never block a successful role change on logging.
        try {
            if (user.client_id) {
                await base44.asServiceRole.entities.ActivityLog.create({
                    timestamp: new Date().toISOString(),
                    initiator_user_email: user.email,
                    action_type: 'USER_ROLE_CHANGE',
                    target_user_email: user.email,
                    client_id: user.client_id,
                    old_value: oldRole,
                    new_value: role,
                    metadata: { action: 'self_role_change', note: 'Via Role Selector (demo feature)' }
                });
            }
        } catch (logError) {
            console.error('Failed to log role change:', logError);
        }

        return Response.json({ 
            success: true,
            message: `Your role has been updated to: ${role}`,
            previous_role: oldRole,
            new_role: role
        });

    } catch (error) {
        console.error('Error updating role:', error);
        return Response.json({
            error: 'An unexpected error occurred while updating your role.'
        }, { status: 500 });
    }
});