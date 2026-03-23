import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Updates a user's app_role and logs the activity
 * Only admins can update user roles
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const currentUser = await base44.auth.me();
        
        if (!currentUser) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Check authorization
        const allowedRoles = ['Platform Admin', 'Super Administrator', 'Partner Business Administrator', 'Admin Level 2'];
        if (!allowedRoles.includes(currentUser.app_role)) {
            return Response.json({ 
                success: false, 
                error: 'Forbidden - Only administrators can update user roles' 
            }, { status: 403 });
        }

        const { userId, newRole, oldRole } = await req.json();

        if (!userId || !newRole) {
            return Response.json({ 
                success: false, 
                error: 'userId and newRole are required' 
            }, { status: 400 });
        }

        // Valid roles
        const validRoles = [
            'User Level 1', 'User Level 2', 'Analyst',
            'Admin Level 1', 'Admin Level 2', 'Super Administrator',
            'Partner Business Administrator', 'Platform Admin'
        ];

        if (!validRoles.includes(newRole)) {
            return Response.json({ 
                success: false, 
                error: 'Invalid role specified' 
            }, { status: 400 });
        }

        // Get target user
        const targetUsers = await base44.asServiceRole.entities.User.filter({ id: userId });
        if (targetUsers.length === 0) {
            return Response.json({ 
                success: false, 
                error: 'User not found' 
            }, { status: 404 });
        }

        const targetUser = targetUsers[0];

        // Apply role-based access control
        if (currentUser.app_role === 'Super Administrator' && currentUser.client_id) {
            if (targetUser.client_id !== currentUser.client_id) {
                return Response.json({ 
                    success: false, 
                    error: 'Access denied - User not in your organization' 
                }, { status: 403 });
            }
        } else if (currentUser.app_role === 'Partner Business Administrator' && currentUser.partner_id) {
            const allClients = await base44.asServiceRole.entities.Client.list();
            const partnerClientIds = allClients
                .filter(c => c.partner_id === currentUser.partner_id)
                .map(c => c.id);
            if (!partnerClientIds.includes(targetUser.client_id)) {
                return Response.json({ 
                    success: false, 
                    error: 'Access denied - User not in your partner clients' 
                }, { status: 403 });
            }
        } else if (currentUser.app_role === 'Admin Level 2' && currentUser.client_id) {
            if (targetUser.client_id !== currentUser.client_id) {
                return Response.json({ 
                    success: false, 
                    error: 'Access denied - User not in your organization' 
                }, { status: 403 });
            }
        }

        // Update user role
        await base44.asServiceRole.entities.User.update(userId, { 
            app_role: newRole 
        });

        // Log the role change
        await base44.asServiceRole.entities.ActivityLog.create({
            timestamp: new Date().toISOString(),
            initiator_user_email: currentUser.email,
            action_type: 'USER_ROLE_CHANGE',
            target_user_email: targetUser.email,
            old_value: oldRole || targetUser.app_role,
            new_value: newRole,
            metadata: { changed_by: currentUser.full_name }
        });

        return Response.json({ 
            success: true,
            message: 'User role updated successfully'
        });

    } catch (error) {
        console.error('Error updating user role:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});