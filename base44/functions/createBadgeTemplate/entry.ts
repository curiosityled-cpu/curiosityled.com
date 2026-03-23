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

    const badgeData = await req.json();

    // Validate required fields
    if (!badgeData.badge_name || !badgeData.badge_category || !badgeData.criteria_type) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create badge template
    const badge = await base44.asServiceRole.entities.BadgeTemplate.create({
      client_id: user.app_role === 'Platform Admin' ? null : user.client_id,
      badge_name: badgeData.badge_name,
      description: badgeData.description,
      icon_url: badgeData.icon_url,
      badge_category: badgeData.badge_category,
      criteria_type: badgeData.criteria_type,
      criteria_config: badgeData.criteria_config || {},
      points_awarded: badgeData.points_awarded || 0,
      rarity: badgeData.rarity || 'common',
      is_active: badgeData.is_active !== false,
      is_platform_default: user.app_role === 'Platform Admin'
    });

    return Response.json({
      success: true,
      badge
    });

  } catch (error) {
    console.error('Error creating badge template:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});