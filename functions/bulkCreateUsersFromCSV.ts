import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Bulk creates/updates users from CSV data
 * 
 * IMPORTANT: The Base44 platform has a limitation where the built-in User entity
 * cannot be created programmatically via entities.User.create(). Users must be
 * invited through the dashboard or platform invite flow.
 * 
 * This function validates the CSV data and prepares users for import.
 * For new users: Returns validation results - actual creation requires dashboard invite
 * For existing users (duplicates): Can update their profile data
 * 
 * Expected payload:
 * {
 *   users: Array<{email, full_name, app_role?, current_role, department, sector?, manager_email, start_date?, client_id?, partner_id?, custom_role_id?}>,
 *   updateDuplicates: boolean,
 *   duplicateUsers: Array<same structure as users>
 * }
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const currentUser = await base44.auth.me();
        
        if (!currentUser) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Only admins can bulk manage users
        const allowedRoles = ['Admin Level 2', 'Super Administrator', 'Partner Business Administrator', 'Platform Admin'];
        if (!allowedRoles.includes(currentUser.app_role)) {
            return Response.json({ 
                success: false, 
                error: 'Forbidden - Only administrators can bulk manage users' 
            }, { status: 403 });
        }

        const { users, updateDuplicates, duplicateUsers } = await req.json();
        
        if (!users || !Array.isArray(users)) {
            return Response.json({ 
                success: false, 
                error: 'Request must include "users" array' 
            }, { status: 400 });
        }

        // Handle case where no users to process at all
        const hasDuplicatesToUpdate = updateDuplicates && duplicateUsers && Array.isArray(duplicateUsers) && duplicateUsers.length > 0;
        if (users.length === 0 && !hasDuplicatesToUpdate) {
            return Response.json({
                success: true,
                successful: [],
                updated: [],
                failed: [],
                pendingInvite: [],
                summary: {
                    total: 0,
                    created: 0,
                    updated: 0,
                    failed: 0,
                    pendingInvite: 0
                }
            });
        }

        const results = {
            successful: [],
            failed: [],
            updated: [],
            pendingInvite: [] // Users that passed validation but need manual invite
        };

        const validAppRoles = ["User Level 1", "User Level 2", "Analyst", "Admin Level 1", "Admin Level 2", "Super Administrator", "Partner Business Administrator", "Platform Admin"];
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Get existing users for duplicate checking using service role
        let existingUsersByEmail = new Map();
        try {
            const existingUsers = await base44.asServiceRole.entities.User.list('-created_date', 10000);
            existingUsersByEmail = new Map(
                (existingUsers || [])
                    .filter(u => u.email)
                    .map(u => [u.email.toLowerCase(), u])
            );
            console.log(`Found ${existingUsersByEmail.size} existing users`);
        } catch (listError) {
            console.warn('Could not fetch existing users:', listError.message);
            // Continue - we'll catch issues on update
        }

        // Track emails being processed to detect duplicates within the batch
        const processedEmails = new Set();

        // Process new users - validate and prepare for invite
        for (const userData of users) {
            try {
                // Basic validation
                const emailStr = userData.email ? String(userData.email).trim().toLowerCase() : '';
                if (!emailStr || !emailRegex.test(emailStr)) {
                    results.failed.push({ user: userData, reason: 'Invalid or missing email' });
                    continue;
                }

                const fullNameStr = userData.full_name ? String(userData.full_name).trim() : '';
                if (!fullNameStr || fullNameStr.length < 2) {
                    results.failed.push({ user: userData, reason: 'Full name required (min 2 characters)' });
                    continue;
                }

                const currentRoleStr = userData.current_role ? String(userData.current_role).trim() : '';
                if (!currentRoleStr) {
                    results.failed.push({ user: userData, reason: 'Current role (job title) required' });
                    continue;
                }

                const departmentStr = userData.department ? String(userData.department).trim() : '';
                if (!departmentStr) {
                    results.failed.push({ user: userData, reason: 'Department required' });
                    continue;
                }

                const managerEmailStr = userData.manager_email ? String(userData.manager_email).trim().toLowerCase() : '';
                if (!managerEmailStr || !emailRegex.test(managerEmailStr)) {
                    results.failed.push({ user: userData, reason: 'Valid manager email required' });
                    continue;
                }

                if (emailStr === managerEmailStr) {
                    results.failed.push({ user: userData, reason: 'User cannot be their own manager' });
                    continue;
                }

                // Validate app_role if provided
                const appRoleStr = userData.app_role ? String(userData.app_role).trim() : 'User Level 1';
                if (!validAppRoles.includes(appRoleStr)) {
                    results.failed.push({ user: userData, reason: `Invalid app_role: "${appRoleStr}". Must be one of: ${validAppRoles.join(', ')}` });
                    continue;
                }

                // Validate start_date if provided
                const startDateStr = userData.start_date ? String(userData.start_date).trim() : null;
                if (startDateStr) {
                    const date = new Date(startDateStr);
                    if (isNaN(date.getTime())) {
                        results.failed.push({ user: userData, reason: 'Invalid start_date format (use YYYY-MM-DD)' });
                        continue;
                    }
                }

                // Validate client/partner mutual exclusivity
                if (userData.client_id && userData.partner_id) {
                    results.failed.push({ user: userData, reason: 'User cannot belong to both a Client and a Partner' });
                    continue;
                }

                // Check if user already exists in database
                if (existingUsersByEmail.has(emailStr)) {
                    results.failed.push({ user: userData, reason: 'Email already exists in database' });
                    continue;
                }

                // Check if email was already processed in this batch
                if (processedEmails.has(emailStr)) {
                    results.failed.push({ user: userData, reason: 'Duplicate email in upload batch' });
                    continue;
                }

                // Track this email as being processed
                processedEmails.add(emailStr);

                // Prepare clean user data for frontend invitation
                const displayNameStr = userData.display_name ? String(userData.display_name).trim() : null;
                const leadershipLevelStr = userData.leadership_level ? String(userData.leadership_level).trim() : null;
                
                const cleanedUserData = {
                    email: emailStr,
                    full_name: fullNameStr,
                    display_name: displayNameStr,
                    app_role: appRoleStr,
                    current_role: currentRoleStr,
                    department: departmentStr,
                    sector: userData.sector ? String(userData.sector).trim() : null,
                    leadership_level: leadershipLevelStr,
                    manager_email: managerEmailStr,
                    start_date: startDateStr,
                    client_id: userData.client_id || null,
                    partner_id: userData.partner_id || null,
                    custom_role_id: userData.custom_role_id || null
                };

                // Add to pending invite list - these will be invited from the frontend
                results.pendingInvite.push({ user: cleanedUserData });

            } catch (validationError) {
                console.error(`Validation error for ${userData.email}:`, validationError.message);
                results.failed.push({ user: userData, reason: validationError.message });
            }
        }

        // Process duplicate users if updateDuplicates is true
        // Updates to EXISTING users should work fine
        if (updateDuplicates && duplicateUsers && Array.isArray(duplicateUsers) && duplicateUsers.length > 0) {
            for (const userData of duplicateUsers) {
                try {
                    const emailStr = userData.email ? String(userData.email).trim().toLowerCase() : '';
                    if (!emailStr) {
                        results.failed.push({ user: userData, reason: 'Missing email for duplicate user' });
                        continue;
                    }

                    const existingUser = existingUsersByEmail.get(emailStr);
                    if (!existingUser) {
                        results.failed.push({ user: userData, reason: 'User not found for update' });
                        continue;
                    }

                    // Validate required fields for update
                    const fullNameStr = userData.full_name ? String(userData.full_name).trim() : '';
                    if (!fullNameStr) {
                        results.failed.push({ user: userData, reason: 'Full name required for update' });
                        continue;
                    }

                    const currentRoleStr = userData.current_role ? String(userData.current_role).trim() : '';
                    if (!currentRoleStr) {
                        results.failed.push({ user: userData, reason: 'Current role required for update' });
                        continue;
                    }

                    const departmentStr = userData.department ? String(userData.department).trim() : '';
                    if (!departmentStr) {
                        results.failed.push({ user: userData, reason: 'Department required for update' });
                        continue;
                    }

                    const managerEmailStr = userData.manager_email ? String(userData.manager_email).trim().toLowerCase() : '';
                    if (!managerEmailStr || !emailRegex.test(managerEmailStr)) {
                        results.failed.push({ user: userData, reason: 'Valid manager email required for update' });
                        continue;
                    }

                    if (emailStr === managerEmailStr) {
                        results.failed.push({ user: userData, reason: 'User cannot be their own manager' });
                        continue;
                    }

                    // Validate app_role if provided
                    const appRoleStr = userData.app_role ? String(userData.app_role).trim() : existingUser.app_role;
                    if (userData.app_role && !validAppRoles.includes(appRoleStr)) {
                        results.failed.push({ user: userData, reason: `Invalid app_role for update: "${appRoleStr}"` });
                        continue;
                    }

                    // Validate start_date if provided
                    const startDateStr = userData.start_date ? String(userData.start_date).trim() : null;
                    if (startDateStr) {
                        const date = new Date(startDateStr);
                        if (isNaN(date.getTime())) {
                            results.failed.push({ user: userData, reason: 'Invalid start_date for update' });
                            continue;
                        }
                    }

                    // Validate client/partner mutual exclusivity for updates
                    const finalClientId = userData.client_id !== undefined ? (userData.client_id || null) : existingUser.client_id;
                    const finalPartnerId = userData.partner_id !== undefined ? (userData.partner_id || null) : existingUser.partner_id;
                    if (finalClientId && finalPartnerId) {
                        results.failed.push({ user: userData, reason: 'User cannot belong to both a Client and a Partner' });
                        continue;
                    }

                    // Prepare update data - only update custom fields, not built-in auth fields
                    // Always use the CSV value for display_name (can be empty string to clear it)
                    const displayNameStr = userData.display_name !== undefined && userData.display_name !== null 
                        ? String(userData.display_name).trim() 
                        : null;
                    const leadershipLevelStr = userData.leadership_level ? String(userData.leadership_level).trim() : null;
                    
                    const updateData = {
                        display_name: displayNameStr !== null ? displayNameStr : (displayNameStr === '' ? null : existingUser.display_name),
                        app_role: appRoleStr,
                        current_role: currentRoleStr,
                        department: departmentStr,
                        sector: userData.sector ? String(userData.sector).trim() : (existingUser.sector || null),
                        leadership_level: leadershipLevelStr || existingUser.leadership_level,
                        manager_email: managerEmailStr,
                        start_date: startDateStr || existingUser.start_date,
                        client_id: finalClientId,
                        partner_id: finalPartnerId,
                        custom_role_id: userData.custom_role_id !== undefined ? (userData.custom_role_id || null) : existingUser.custom_role_id
                    };

                    // Update existing user using service role
                    await base44.asServiceRole.entities.User.update(existingUser.id, updateData);

                    results.updated.push({ user: userData, id: existingUser.id });

                } catch (updateError) {
                    console.error(`Failed to update user ${userData.email}:`, updateError.message);
                    results.failed.push({ user: userData, reason: updateError.message });
                }
            }
        }

        // Log bulk activity for audit trail
        const totalAttempted = users.length + (duplicateUsers?.length || 0);
        if (totalAttempted > 0) {
            try {
                await base44.asServiceRole.entities.ActivityLog.create({
                    timestamp: new Date().toISOString(),
                    initiator_user_email: currentUser.email,
                    action_type: 'USERS_BULK_CREATED',
                    metadata: {
                        created_count: results.successful.length,
                        updated_count: results.updated.length,
                        failed_count: results.failed.length,
                        pending_invite_count: results.pendingInvite.length,
                        total_attempted: totalAttempted,
                        admin_name: currentUser.full_name,
                        platform_limitation_hit: results.pendingInvite.length > 0
                    }
                });
            } catch (logError) {
                console.warn('Failed to create activity log:', logError.message);
            }
        }

        return Response.json({
            success: true,
            successful: results.successful,
            updated: results.updated,
            failed: results.failed,
            pendingInvite: results.pendingInvite,
            summary: {
                total: totalAttempted,
                created: results.successful.length,
                updated: results.updated.length,
                failed: results.failed.length,
                pendingInvite: results.pendingInvite.length
            },
            // Include a message if there are pending invites
            message: results.pendingInvite.length > 0 
                ? `${results.pendingInvite.length} user(s) passed validation and are ready for invitation. Updated ${results.updated.length} existing user(s).`
                : undefined
        });

    } catch (error) {
        console.error('Bulk user operation failed:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});