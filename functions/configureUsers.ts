import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Configures existing users with profile data (app_role, department, manager, etc.)
 * This is for users that have already been invited via the dashboard.
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const currentUser = await base44.auth.me();
        
        if (!currentUser) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Only admins can configure users
        const allowedRoles = ['Admin Level 2', 'Super Administrator', 'Partner Business Administrator', 'Platform Admin'];
        if (!allowedRoles.includes(currentUser.app_role)) {
            return Response.json({ 
                success: false, 
                error: 'Forbidden - Only administrators can configure users' 
            }, { status: 403 });
        }

        const { users } = await req.json();
        
        if (!users || !Array.isArray(users)) {
            return Response.json({ 
                success: false, 
                error: 'Request must include "users" array' 
            }, { status: 400 });
        }

        // Get existing users
        const existingUsers = await base44.asServiceRole.entities.User.list('-created_date', 10000);
        const existingUsersByEmail = new Map(
            (existingUsers || [])
                .filter(u => u.email)
                .map(u => [u.email.toLowerCase(), u])
        );

        const results = {
            updated: [],
            failed: [],
            notFound: []
        };

        for (const userData of users) {
            try {
                const emailStr = userData.email ? String(userData.email).trim().toLowerCase() : '';
                if (!emailStr) {
                    results.failed.push({ user: userData, reason: 'Missing email' });
                    continue;
                }

                const existingUser = existingUsersByEmail.get(emailStr);
                if (!existingUser) {
                    results.notFound.push({ user: userData, reason: 'User not found in system' });
                    continue;
                }

                // Build update data - include all fields that are provided
                // Note: full_name is a built-in field but should be updateable via service role
                const updateData = {};
                
                if (userData.full_name) updateData.full_name = String(userData.full_name).trim();
                if (userData.app_role) updateData.app_role = String(userData.app_role).trim();
                if (userData.current_role) updateData.current_role = String(userData.current_role).trim();
                if (userData.department) updateData.department = String(userData.department).trim();
                if (userData.sector) updateData.sector = String(userData.sector).trim();
                if (userData.manager_email) updateData.manager_email = String(userData.manager_email).trim().toLowerCase();
                if (userData.start_date) updateData.start_date = String(userData.start_date).trim();
                if (userData.client_id !== undefined) updateData.client_id = userData.client_id || null;
                if (userData.partner_id !== undefined) updateData.partner_id = userData.partner_id || null;
                if (userData.custom_role_id !== undefined) updateData.custom_role_id = userData.custom_role_id || null;

                console.log(`Updating user ${emailStr} with data:`, JSON.stringify(updateData));
                console.log(`Existing user full_name: "${existingUser.full_name}", new full_name: "${updateData.full_name}"`);

                // Update the user
                await base44.asServiceRole.entities.User.update(existingUser.id, updateData);
                
                // Verify the update worked
                const verifyUser = await base44.asServiceRole.entities.User.filter({ email: emailStr }, '-created_date', 1);
                if (verifyUser && verifyUser.length > 0) {
                    console.log(`After update - full_name is now: "${verifyUser[0].full_name}"`);
                }
                
                results.updated.push({ email: emailStr, id: existingUser.id, full_name_attempted: updateData.full_name });

            } catch (updateError) {
                console.error(`Failed to update ${userData.email}:`, updateError.message);
                results.failed.push({ user: userData, reason: updateError.message });
            }
        }

        return Response.json({
            success: true,
            updated: results.updated,
            failed: results.failed,
            notFound: results.notFound,
            summary: {
                total: users.length,
                updated: results.updated.length,
                failed: results.failed.length,
                notFound: results.notFound.length
            }
        });

    } catch (error) {
        console.error('Configure users failed:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});