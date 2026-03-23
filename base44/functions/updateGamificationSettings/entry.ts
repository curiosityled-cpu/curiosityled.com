import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-only check
    const adminRoles = ['Admin Level 2', 'Super Administrator', 'Platform Admin', 'Partner Business Administrator'];
    if (!adminRoles.includes(user.app_role)) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const settingsData = await req.json();

    // Get existing settings
    const existingSettings = await base44.asServiceRole.entities.GamificationSettings.filter({
      client_id: user.client_id
    });

    let settings;
    if (existingSettings.length > 0) {
      // Update existing
      settings = await base44.asServiceRole.entities.GamificationSettings.update(
        existingSettings[0].id,
        settingsData
      );
    } else {
      // Create new
      settings = await base44.asServiceRole.entities.GamificationSettings.create({
        client_id: user.client_id,
        ...settingsData
      });
    }

    return Response.json({
      success: true,
      settings
    });

  } catch (error) {
    console.error('Error updating gamification settings:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});