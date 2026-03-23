import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Helper function to update existing users with test data structure
 * This should be run AFTER users are invited to the platform
 * It will set their app_role, manager_email, and other profile fields
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify admin access
        const currentUser = await base44.auth.me();
        if (!currentUser || !['Admin Level 2', 'Admin Level 3'].includes(currentUser.app_role)) {
            return Response.json({ 
                error: 'Unauthorized. Only Admin Level 2 and 3 can update user data.' 
            }, { status: 403 });
        }

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