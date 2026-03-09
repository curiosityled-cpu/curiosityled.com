import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can bulk update status
    if (!['Platform Admin', 'Super Administrator', 'Partner Business Administrator', 'Admin Level 2'].includes(currentUser.app_role)) {
      return Response.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { userIds, status, reason } = await req.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return Response.json({ error: 'userIds array is required' }, { status: 400 });
    }

    if (!['active', 'suspended'].includes(status)) {
      return Response.json({ error: 'Invalid status. Must be "active" or "suspended"' }, { status: 400 });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const userId of userIds) {
      try {
        const targetUsers = await base44.asServiceRole.entities.User.filter({ id: userId });
        if (targetUsers.length === 0) {
          results.failed.push({ userId, error: 'User not found' });
          continue;
        }

        const targetUser = targetUsers[0];

        // Skip if trying to suspend yourself
        if (targetUser.email === currentUser.email) {
          results.failed.push({ userId, error: 'Cannot suspend your own account' });
          continue;
        }

        // Skip Platform Admins unless you are one
        if (targetUser.app_role === 'Platform Admin' && currentUser.app_role !== 'Platform Admin') {
          results.failed.push({ userId, error: 'Cannot suspend Platform Admin accounts' });
          continue;
        }

        // Update status
        if (status === 'suspended') {
          await base44.asServiceRole.entities.User.update(userId, {
            account_status: 'suspended',
            account_suspended_at: new Date().toISOString(),
            account_suspended_by: currentUser.email,
            account_suspended_reason: reason || 'Bulk suspension'
          });
        } else {
          await base44.asServiceRole.entities.User.update(userId, {
            account_status: 'active',
            account_suspended_at: null,
            account_suspended_by: null,
            account_suspended_reason: null
          });
        }

        // Log activity
        await base44.asServiceRole.entities.ActivityLog.create({
          timestamp: new Date().toISOString(),
          initiator_user_email: currentUser.email,
          action_type: status === 'suspended' ? 'USER_ACCOUNT_SUSPENDED' : 'USER_ACCOUNT_ACTIVATED',
          target_user_email: targetUser.email,
          client_id: targetUser.client_id,
          metadata: {
            bulk_operation: true,
            reason: reason
          }
        });

        results.success.push({ userId, email: targetUser.email });
      } catch (error) {
        results.failed.push({ userId, error: error.message });
      }
    }

    return Response.json({
      success: true,
      results,
      message: `Updated ${results.success.length} users, ${results.failed.length} failed`
    });
  } catch (error) {
    console.error('Error bulk updating user status:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});