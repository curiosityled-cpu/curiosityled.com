import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { canAssignRole } from '../../shared/userScope.ts';

/**
 * Updates a user's app_role and logs the activity
 * Only admins can update user roles, and only Platform Admin may assign
 * platform-level roles. Tenant scoping is fail-closed.
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

        // Security: Role-rank restriction — prevent vertical privilege escalation.
        // A caller may only assign roles below their own tier; only Platform Admin
        // may assign 'Platform Admin'. Mirrors configureUsers / assignRoleToUser.
        if (!canAssignRole(currentUser.app_role, newRole)) {
            return Response.json({ 
                success: false, 
                error: `Not permitted to assign role: ${newRole}` 
            }, { status: 403 });
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

        // Apply role-based access control — fail closed when tenant identifiers are
        // missing. Only Platform Admin is exempt from tenant scoping.
        if (currentUser.app_role !== 'Platform Admin') {
            if (currentUser.app_role === 'Super Administrator') {
                if (!currentUser.client_id || targetUser.client_id !== currentUser.client_id) {
                    return Response.json({ 
                        success: false, 
                        error: 'Access denied - User not in your organization' 
                    }, { status: 403 });
                }
            } else if (currentUser.app_role === 'Partner Business Administrator') {
                if (!currentUser.partner_id) {
                    return Response.json({ 
                        success: false, 
                        error: 'Access denied - Partner scope not configured' 
                    }, { status: 403 });
                }
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
            } else if (currentUser.app_role === 'Admin Level 2') {
                if (!currentUser.client_id || targetUser.client_id !== currentUser.client_id) {
                    return Response.json({ 
                        success: false, 
                        error: 'Access denied - User not in your organization' 
                    }, { status: 403 });
                }
            }
        }

        // Update user role
        await base44.asServiceRole.entities.User.update(userId, { 
            app_role: newRole 
        });

        // Log the role change (client_id is required by ActivityLog schema)
        const logClientId = currentUser.client_id || targetUser.client_id || 'platform';
        await base44.asServiceRole.entities.ActivityLog.create({
            timestamp: new Date().toISOString(),
            initiator_user_email: currentUser.email,
            action_type: 'USER_ROLE_CHANGE',
            target_user_email: targetUser.email,
            client_id: logClientId,
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