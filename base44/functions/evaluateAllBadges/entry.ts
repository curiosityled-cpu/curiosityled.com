import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { isInternalCall } from '../../shared/urlValidation.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_email, client_id, check_proximity } = await req.json();

    if (!user_email) {
      return Response.json({ error: 'user_email is required' }, { status: 400 });
    }

    // Security: Require authenticated self-access or internal automation.
    const internalCall = isInternalCall(req);
    let callerUser = null;
    try { callerUser = await base44.auth.me(); } catch (_) { /* may be internal */ }
    if (!internalCall) {
      if (!callerUser) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const adminRoles = ['Admin Level 1','Admin Level 2','Super Administrator','Partner Business Administrator','Platform Admin'];
      if (callerUser.email !== user_email && !adminRoles.includes(callerUser.app_role)) {
        return Response.json({ error: 'Forbidden — can only evaluate your own badges' }, { status: 403 });
      }
    }

    // Get all badge templates for the client
    const allBadges = await base44.asServiceRole.entities.BadgeTemplate.filter({
      client_id: client_id || undefined,
      is_active: true
    });

    // Get user's already earned badges
    const earnedBadges = await base44.asServiceRole.entities.UserBadge.filter({
      user_email
    });
    const earnedBadgeIds = earnedBadges.map(b => b.badge_template_id);

    // Check eligibility for each badge
    const eligibleBadges = [];
    const badgesCloseToEarning = [];

    for (const badge of allBadges) {
      // Skip if already earned
      if (earnedBadgeIds.includes(badge.id)) {
        continue;
      }

      // Check eligibility
      const eligibilityResult = await base44.asServiceRole.functions.invoke('checkBadgeEligibility', {
        user_email,
        badge_template_id: badge.id
      });

      if (eligibilityResult.data?.eligible) {
        eligibleBadges.push({
          badge_id: badge.id,
          badge_name: badge.badge_name,
          description: badge.description,
          progress_percentage: eligibilityResult.data.progress_percentage
        });
      } else if (check_proximity && eligibilityResult.data?.progress_percentage >= 70) {
        badgesCloseToEarning.push({
          badge_id: badge.id,
          badge_name: badge.badge_name,
          description: badge.description,
          progress_percentage: eligibilityResult.data.progress_percentage
        });
      }
    }

    return Response.json({
      eligible_badges: eligibleBadges,
      badges_close_to_earning: badgesCloseToEarning,
      total_badges: allBadges.length,
      earned_count: earnedBadges.length
    });

  } catch (error) {
    console.error('Error evaluating all badges:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});