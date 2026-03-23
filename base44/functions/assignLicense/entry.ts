import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Super Admin and Platform Admin can manage licenses
    const allowedRoles = ['Platform Admin', 'Super Administrator'];
    if (!allowedRoles.includes(user.app_role)) {
      return Response.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { userId, licenseType } = await req.json();

    if (!userId || !licenseType) {
      return Response.json({ error: 'userId and licenseType are required' }, { status: 400 });
    }

    const validLicenseTypes = ['full', 'limited', 'view_only'];
    if (!validLicenseTypes.includes(licenseType)) {
      return Response.json({ error: 'Invalid license type' }, { status: 400 });
    }

    // Get target user
    const allUsers = await base44.asServiceRole.entities.User.list();
    const targetUser = allUsers.find(u => u.id === userId);

    if (!targetUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user license
    await base44.asServiceRole.entities.User.update(userId, {
      license_type: licenseType,
      license_assigned_date: new Date().toISOString()
    });

    // Log activity
    await base44.asServiceRole.entities.ActivityLog.create({
      timestamp: new Date().toISOString(),
      initiator_user_email: user.email,
      action_type: 'USER_ACCOUNT_UPDATED',
      target_user_email: targetUser.email,
      client_id: targetUser.client_id,
      old_value: targetUser.license_type || 'full',
      new_value: licenseType,
      metadata: {
        license_assigned: true
      }
    });

    return Response.json({
      success: true,
      message: `License type updated to ${licenseType}`,
      userId,
      licenseType
    });

  } catch (error) {
    console.error('Error assigning license:', error);
    return Response.json({
      error: 'Failed to assign license',
      details: error.message
    }, { status: 500 });
  }
});