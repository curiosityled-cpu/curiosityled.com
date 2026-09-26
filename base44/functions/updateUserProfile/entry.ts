import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Updates user profile information
 * Regular users can update their own profile (excluding email and full_name)
 * HR admins and above can update any user's profile including email and full_name
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const currentUser = await base44.auth.me();
        
        if (!currentUser) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { user_id, profile_data } = await req.json();

        if (!user_id || !profile_data) {
            return Response.json({ 
                success: false, 
                error: 'user_id and profile_data are required' 
            }, { status: 400 });
        }

        // Get the target user
        const targetUser = await base44.asServiceRole.entities.User.filter({ id: user_id });
        if (targetUser.length === 0) {
            return Response.json({ 
                success: false, 
                error: 'User not found' 
            }, { status: 404 });
        }

        const isOwnProfile = currentUser.id === user_id;
        const isHRAdmin = ['Admin Level 2', 'Super Administrator', 'Platform Admin', 'Partner Business Administrator'].includes(currentUser.app_role);

        // ── Allowlist for self-service profile fields ──────────────────────────
        // Ordinary users may ONLY update these fields on their own profile.
        // Everything else (role, permissions, tenant, status, etc.) is
        // SERVER-OWNED and requires HR admin authorization. This is an
        // ALLOWLIST, not a denylist — any field not listed here is rejected
        // for self-service updates, preventing mass assignment of privileged
        // fields (permissions, app_role, client_id, account_status, etc.).
        const SELF_SERVICE_ALLOWED_FIELDS = new Set([
            'display_name',
            'current_role',
            'department',
            'manager_email',
            'start_date',
            'leadership_start_date',
            'leadership_lifecycle_stage',
            'sector',
            'onboarding_completed',
            'two_factor_enabled',
            'two_factor_enabled_at'
        ]);

        // Fields that ONLY HR admins can update (even on their own profile)
        const ADMIN_ONLY_FIELDS = new Set([
            'email',
            'full_name',
            'client_id',
            'partner_client_ids',
            'partner_id',
            'app_role',
            'custom_role_id',
            'managed_program_ids',
            'subordinate_emails',
            'account_status',
            'account_suspended_at',
            'account_suspended_by',
            'account_suspended_reason',
            'account_expires_at',
            'account_type',
            'license_type',
            'license_assigned_date',
            'is_uat_tester',
            'leadership_level',
            'invitation_sent_at',
            'invitation_accepted_at',
            'invitation_resend_count',
            'last_invitation_sent_at',
            'license_activated_at',
            'failed_login_attempts',
            'locked_until',
            'locked_reason',
            'last_login_date'
        ]);

        // Build update object based on permissions
        const updateData = {};

        for (const [key, value] of Object.entries(profile_data)) {
            // Reject admin-only fields if user is not HR admin
            if (ADMIN_ONLY_FIELDS.has(key) && !isHRAdmin) {
                continue;
            }

            // For self-service (non-admin) updates, use ALLOWLIST:
            // reject any field not explicitly permitted
            if (!isHRAdmin && !SELF_SERVICE_ALLOWED_FIELDS.has(key)) {
                continue;
            }

            // Skip if not own profile and not admin
            if (!isOwnProfile && !isHRAdmin) {
                return Response.json({
                    success: false,
                    error: 'Forbidden - You can only edit your own profile'
                }, { status: 403 });
            }

            updateData[key] = value;
        }

        // Update the user
        await base44.asServiceRole.entities.User.update(user_id, updateData);

        // Log activity if admin updated someone else's profile
        if (!isOwnProfile && isHRAdmin) {
            await base44.asServiceRole.entities.ActivityLog.create({
                timestamp: new Date().toISOString(),
                initiator_user_email: currentUser.email,
                action_type: 'USER_PROFILE_UPDATED',
                target_user_email: targetUser[0].email,
                metadata: {
                    updated_fields: Object.keys(updateData),
                    updated_by: currentUser.full_name
                }
            });
        }

        return Response.json({ 
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('Error updating profile:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});