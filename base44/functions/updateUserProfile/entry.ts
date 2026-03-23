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

        // Fields that only HR admins can update
        const restrictedFields = ['email', 'full_name'];
        
        // Build update object based on permissions
        const updateData = {};
        
        for (const [key, value] of Object.entries(profile_data)) {
            // Skip restricted fields if user is not HR admin
            if (restrictedFields.includes(key) && !isHRAdmin) {
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