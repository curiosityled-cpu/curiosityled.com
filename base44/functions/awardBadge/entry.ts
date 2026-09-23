import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { isInternalCall } from '../../shared/urlValidation.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_email, badge_template_id, awarded_by_email } = await req.json();

    // Security: Require either an authenticated admin or an internal automation
    // secret. Unauthenticated callers must never be able to grant badges/points.
    const internalCall = isInternalCall(req);
    let callerUser = null;
    try { callerUser = await base44.auth.me(); } catch (_) { /* may be internal call */ }

    if (!internalCall) {
      if (!callerUser) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const adminRoles = ['Admin Level 1', 'Admin Level 2', 'Super Administrator', 'Partner Business Administrator', 'Platform Admin'];
      if (!adminRoles.includes(callerUser.app_role)) {
        return Response.json({ error: 'Forbidden — only admins or internal automations may award badges.' }, { status: 403 });
      }
    }

    if (!user_email || !badge_template_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get badge template
    const badges = await base44.asServiceRole.entities.BadgeTemplate.filter({ id: badge_template_id });
    if (!badges.length) {
      return Response.json({ error: 'Badge not found' }, { status: 404 });
    }
    const badge = badges[0];

    // Check if already earned
    const existingBadges = await base44.asServiceRole.entities.UserBadge.filter({
      user_email,
      badge_template_id
    });

    if (existingBadges.length > 0) {
      return Response.json({ 
        success: false, 
        message: 'Badge already earned' 
      }, { status: 400 });
    }

    // Get user's client_id
    const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
    const client_id = users.length > 0 ? users[0].client_id : null;

    // Create UserBadge record
    const userBadge = await base44.asServiceRole.entities.UserBadge.create({
      user_email,
      badge_template_id,
      earned_date: new Date().toISOString(),
      awarded_by_email,
      client_id
    });

    // Award associated points if any
    if (badge.points_awarded > 0) {
      await base44.asServiceRole.functions.invoke('awardPoints', {
        internal_secret: Deno.env.get('INTERNAL_FUNCTION_SECRET'),
        user_email,
        points_amount: badge.points_awarded,
        transaction_type: 'system_award',
        reason: `Earned badge: ${badge.badge_name}`,
        related_entity_type: 'BadgeTemplate',
        related_entity_id: badge_template_id,
        client_id
      });
    }

    // Create notification (if Notification entity exists)
    try {
      await base44.asServiceRole.entities.Notification.create({
        user_email,
        type: 'milestone',
        title: `🎉 Badge Earned: ${badge.badge_name}`,
        message: badge.description || `You've earned the ${badge.badge_name} badge!`,
        related_entity_type: 'UserBadge',
        related_entity_id: userBadge.id
      });
    } catch (notifError) {
      // Notification entity might not exist yet, continue without failing
      console.log('Could not create notification:', notifError.message);
    }

    return Response.json({
      success: true,
      user_badge: userBadge,
      badge,
      points_awarded: badge.points_awarded
    });

  } catch (error) {
    console.error('Error awarding badge:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});