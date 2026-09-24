import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { resolveUserScope, isUserInScope, canAssignRole } from '../../shared/userScope.ts';

/**
 * Helper function to update existing users with test data structure
 * This should be run AFTER users are invited to the platform
 * It will set their app_role, manager_email, and other profile fields
 *
 * Security: Target users must belong to the caller's tenant. Role
 * assignments are whitelist-validated and rank-checked to prevent
 * cross-tenant modification or privilege escalation.
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify admin access
        const currentUser = await base44.auth.me();
        if (!currentUser || !['Admin Level 2', 'Admin Level 3', 'Super Administrator', 'Platform Admin'].includes(currentUser.app_role)) {
            return Response.json({ 
                error: 'Unauthorized. Only admins can update user data.' 
            }, { status: 403 });
        }

        const scope = resolveUserScope(currentUser);

        // Get request body with email mappings
        const body = await req.json();
        const { users } = body;

        if (!users || !Array.isArray(users)) {
            return Response.json({
                error: 'Request must include "users" array with user data'
            }, { status: 400 });
        }

        const results = {
            updated: 0,
            failed: [],
            skipped: []
        };

        const allowedRoles = ['User Level 1', 'User Level 2', 'Analyst', 'Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Leadership Coach', 'Consultant'];

        // Fetch all existing users
        const allUsers = await base44.asServiceRole.entities.User.list();

        // Update each user with their test profile
        for (const userData of users) {
            try {
                const existingUser = allUsers.find(u => u.email === userData.email);
                
                if (!existingUser) {
                    results.skipped.push({
                        email: userData.email,
                        reason: 'User not found - must be invited first'
                    });
                    continue;
                }

                // Security: Tenant scoping — target must be in caller's scope
                if (!isUserInScope(existingUser, scope)) {
                    results.failed.push({
                        email: userData.email,
                        error: 'Cross-tenant update denied'
                    });
                    continue;
                }

                // Security: Validate app_role against whitelist + rank check
                if (userData.app_role) {
                    if (!allowedRoles.includes(userData.app_role)) {
                        results.failed.push({
                            email: userData.email,
                            error: `Invalid role: ${userData.app_role}`
                        });
                        continue;
                    }
                    if (!canAssignRole(currentUser.app_role, userData.app_role)) {
                        results.failed.push({
                            email: userData.email,
                            error: 'Insufficient privileges to assign this role'
                        });
                        continue;
                    }
                }

                await base44.asServiceRole.entities.User.update(existingUser.id, {
                    app_role: userData.app_role,
                    current_role: userData.current_role,
                    department: userData.department,
                    role_level: userData.role_level,
                    sector: userData.sector,
                    manager_email: userData.manager_email
                });

                results.updated++;
            } catch (error) {
                results.failed.push({
                    email: userData.email,
                    error: error.message
                });
            }
        }

        return Response.json({
            success: true,
            message: "User profiles updated",
            results
        });

    } catch (error) {
        console.error('Error updating users:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});