import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { isInternalCall } from '../../shared/urlValidation.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_email, badge_template_id } = await req.json();

    if (!user_email || !badge_template_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Security: Require authenticated self-access or internal automation.
    const internalCall = isInternalCall(req);
    let callerUser = null;
    try { callerUser = await base44.auth.me(); } catch (_) { /* may be internal */ }
    if (!internalCall) {
      if (!callerUser) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const adminRoles = ['Admin Level 1','Admin Level 2','Super Administrator','Partner Business Administrator','Platform Admin'];
      if (callerUser.email !== user_email && !adminRoles.includes(callerUser.app_role)) {
        return Response.json({ error: 'Forbidden — can only check your own badges' }, { status: 403 });
      }
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
        eligible: false,
        already_earned: true,
        progress_percentage: 100
      });
    }

    // Evaluate criteria based on badge type
    let eligible = false;
    let progressPercentage = 0;

    if (badge.criteria_type === 'manual') {
      // Manual badges cannot be auto-evaluated
      return Response.json({
        eligible: false,
        requires_manual_award: true,
        progress_percentage: 0
      });
    }

    if (badge.criteria_type === 'single_event') {
      // Check if specific event has occurred
      const config = badge.criteria_config || {};
      
      if (config.entity_type === 'Program' && config.entity_id) {
        // Check program completion
        // Implementation depends on your Program completion tracking
      } else if (config.entity_type === 'Assessment') {
        const assessments = await base44.asServiceRole.entities.Assessment.filter({
          email: user_email,
          // Add specific criteria
        });
        eligible = assessments.length > 0;
        progressPercentage = eligible ? 100 : 0;
      }
    }

    if (badge.criteria_type === 'cumulative') {
      // Check cumulative progress
      const config = badge.criteria_config || {};
      
      if (config.metric === 'total_points') {
        const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
        if (users.length > 0) {
          const currentPoints = users[0].total_points || 0;
          const targetPoints = config.target_value || 1000;
          progressPercentage = Math.min(100, (currentPoints / targetPoints) * 100);
          eligible = currentPoints >= targetPoints;
        }
      }
    }

    return Response.json({
      eligible,
      progress_percentage: progressPercentage,
      badge_name: badge.badge_name,
      description: badge.description
    });

  } catch (error) {
    console.error('Error checking badge eligibility:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});