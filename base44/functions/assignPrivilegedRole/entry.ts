import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Privileged role assignment — tightly controlled.
 *
 * A Platform Admin — any account holding that app role, not one named address —
 * may assign the three privileged roles (Super Administrator, Partner Business
 * Administrator, Platform Admin) to a specific target user by email. This is the
 * sole path by which privileged roles are granted from the Role Selector page.
 *
 * The authority belongs to the role, so every Platform Admin carries it: an
 * account-specific gate would make one address more powerful than the role it
 * holds, and a newly appointed Platform Admin unable to do the job.
 */
const PRIVILEGED_ASSIGNER_ROLE = 'Platform Admin';
const ASSIGNABLE_PRIVILEGED_ROLES = [
    'Super Administrator',
    'Partner Business Administrator',
    'Platform Admin'
];

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const currentUser = await base44.auth.me();
        if (!currentUser) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Hard gate: the Platform Admin role carries this authority, whoever holds it.
        const callerRole = currentUser.app_role || currentUser.data?.app_role || null;
        if (callerRole !== PRIVILEGED_ASSIGNER_ROLE) {
            return Response.json({
                success: false,
                error: 'Forbidden — only a Platform Admin may assign privileged roles.'
            }, { status: 403 });
        }

        const { targetEmail, newRole } = await req.json();
        if (!targetEmail || !newRole) {
            return Response.json({
                success: false,
                error: 'targetEmail and newRole are required.'
            }, { status: 400 });
        }

        if (!ASSIGNABLE_PRIVILEGED_ROLES.includes(newRole)) {
            return Response.json({
                success: false,
                error: `Invalid privileged role. Allowed: ${ASSIGNABLE_PRIVILEGED_ROLES.join(', ')}`
            }, { status: 400 });
        }

        // Find target user by email (service role bypasses RLS).
        const targetUsers = await base44.asServiceRole.entities.User.filter({ email: targetEmail });
        if (targetUsers.length === 0) {
            return Response.json({ success: false, error: 'Target user not found.' }, { status: 404 });
        }
        const targetUser = targetUsers[0];
        const oldRole = targetUser.app_role;

        await base44.asServiceRole.entities.User.update(targetUser.id, { app_role: newRole });

        // Best-effort audit log — never block a successful assignment on logging.
        try {
            await base44.asServiceRole.entities.ActivityLog.create({
                timestamp: new Date().toISOString(),
                initiator_user_email: currentUser.email,
                action_type: 'USER_ROLE_CHANGE',
                target_user_email: targetUser.email,
                client_id: currentUser.client_id || targetUser.client_id || 'platform',
                old_value: oldRole,
                new_value: newRole,
                metadata: {
                    changed_by: currentUser.full_name,
                    source: 'privileged_operator_assignment',
                    via: 'role_selector_admin_panel'
                }
            });
        } catch (logError) {
            console.error('Failed to log privileged role assignment:', logError);
        }

        return Response.json({
            success: true,
            message: `Assigned ${newRole} to ${targetUser.email}.`,
            target_email: targetUser.email,
            previous_role: oldRole,
            new_role: newRole
        });

    } catch (error) {
        console.error('Error assigning privileged role:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});