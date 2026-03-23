import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Promotes a user to Platform Administrator role
 * Only existing Platform Admins can promote others
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const adminUser = await base44.auth.me();

        // Only Platform Admins can promote others
        if (!adminUser || adminUser.app_role !== 'Platform Admin') {
            return Response.json({ 
                error: 'Unauthorized - Only Platform Administrators can promote users' 
            }, { status: 401 });
        }

        const { user_id } = await req.json();

        if (!user_id) {
            return Response.json({ error: 'user_id is required' }, { status: 400 });
        }

        // Get target user
        const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
        if (users.length === 0) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }

        const targetUser = users[0];

        // Check if already Platform Admin
        if (targetUser.app_role === 'Platform Admin') {
            return Response.json({ 
                error: 'User is already a Platform Administrator' 
            }, { status: 400 });
        }

        const oldRole = targetUser.app_role;

        // Promote user to Platform Admin and remove organization association
        await base44.asServiceRole.entities.User.update(user_id, { 
            app_role: 'Platform Admin',
            organization_id: null  // Platform Admins don't belong to any organization
        });

        // Log the promotion
        await base44.asServiceRole.entities.ActivityLog.create({
            timestamp: new Date().toISOString(),
            initiator_user_email: adminUser.email,
            action_type: 'USER_ROLE_CHANGE',
            target_user_email: targetUser.email,
            old_value: oldRole,
            new_value: 'Platform Admin',
            metadata: { 
                action: 'promoted_to_platform_admin',
                promoted_by: adminUser.full_name || adminUser.email,
                note: 'Promoted to Curiosity Led Platform Administrator'
            }
        });

        return Response.json({ 
            success: true,
            message: `${targetUser.full_name || targetUser.email} has been promoted to Platform Administrator`,
            user_email: targetUser.email,
            previous_role: oldRole,
            new_role: 'Platform Admin'
        });

    } catch (error) {
        console.error('Error promoting user:', error);
        return Response.json({ 
            error: error.message || 'Failed to promote user' 
        }, { status: 500 });
    }
});