import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check authorization
    const allowedRoles = ['Platform Admin', 'Super Administrator', 'Partner Business Administrator', 'Admin Level 2'];
    if (!allowedRoles.includes(currentUser.app_role)) {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { userId, userData } = await req.json();

    if (!userId || !userData) {
      return Response.json({ error: 'userId and userData are required' }, { status: 400 });
    }

    // Get the target user first to check permissions
    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];

    // Apply role-based access control
    if (currentUser.app_role === 'Super Administrator' && currentUser.client_id) {
      if (targetUser.client_id !== currentUser.client_id) {
        return Response.json({ error: 'Access denied - User not in your organization' }, { status: 403 });
      }
    } else if (currentUser.app_role === 'Partner Business Administrator' && currentUser.partner_id) {
      const allClients = await base44.asServiceRole.entities.Client.list();
      const partnerClientIds = allClients
        .filter(c => c.partner_id === currentUser.partner_id)
        .map(c => c.id);
      if (!partnerClientIds.includes(targetUser.client_id)) {
        return Response.json({ error: 'Access denied - User not in your partner clients' }, { status: 403 });
      }
    } else if (currentUser.app_role === 'Admin Level 2' && currentUser.client_id) {
      if (targetUser.client_id !== currentUser.client_id) {
        return Response.json({ error: 'Access denied - User not in your organization' }, { status: 403 });
      }
    }

    // Security: Field-level allowlist — prevent privilege escalation via
    // mass assignment. app_role and custom_role_id have dedicated admin
    // functions (updateUserRole, assignAddonRole) with their own validation.
    // Excluding them here prevents an Admin Level 2 from escalating a
    // same-tenant user to Platform Admin or assigning a privileged CustomRole.
    const ALLOWED_UPDATE_FIELDS = new Set([
      'display_name', 'current_role', 'department', 'manager_email',
      'start_date', 'leadership_start_date', 'leadership_lifecycle_stage',
      'sector', 'leadership_level', 'onboarding_completed',
      'two_factor_enabled', 'two_factor_enabled_at',
      'account_status', 'account_suspended_at', 'account_suspended_by',
      'account_suspended_reason', 'account_expires_at', 'account_type',
      'license_type', 'license_assigned_date', 'is_uat_tester',
      'managed_program_ids', 'last_login_date',
      'failed_login_attempts', 'locked_until', 'locked_reason',
      'invitation_sent_at', 'invitation_accepted_at',
      'invitation_resend_count', 'last_invitation_sent_at',
      'license_activated_at'
    ]);

    // Privileged fields that require dedicated functions or Platform Admin
    const PRIVILEGED_FIELDS = new Set([
      'app_role', 'custom_role_id', 'client_id', 'partner_id',
      'partner_client_ids', 'subordinate_emails', 'email', 'full_name'
    ]);

    const filteredData = {};
    const rejectedFields = [];
    for (const [key, value] of Object.entries(userData)) {
      if (PRIVILEGED_FIELDS.has(key)) {
        // app_role changes must go through updateUserRole; custom_role_id
        // through assignAddonRole; client_id/partner_id through dedicated
        // tenant-management functions. Reject here to prevent escalation.
        rejectedFields.push(key);
        continue;
      }
      if (ALLOWED_UPDATE_FIELDS.has(key)) {
        filteredData[key] = value;
      }
    }

    if (rejectedFields.length > 0) {
      return Response.json({
        error: `Privileged fields must be updated through their dedicated functions: ${rejectedFields.join(', ')}`
      }, { status: 403 });
    }

    // Update user using service role
    await base44.asServiceRole.entities.User.update(userId, filteredData);

    // Log the activity (client_id is required by ActivityLog schema)
    const logClientId = currentUser.client_id || targetUser.client_id || 'platform';
    await base44.asServiceRole.entities.ActivityLog.create({
      timestamp: new Date().toISOString(),
      initiator_user_email: currentUser.email,
      action_type: 'USER_ROLE_CHANGE',
      target_user_email: targetUser.email,
      client_id: logClientId,
      metadata: { 
        updated_by: currentUser.full_name,
        changes: userData
      }
    });

    return Response.json({ 
      success: true,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});