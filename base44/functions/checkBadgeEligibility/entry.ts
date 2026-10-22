import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { isInternalCall } from '../../shared/urlValidation.ts';
import { resolveUserScope, isUserInScope, attachPartnerClientIds } from '../../shared/userScope.ts';

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

    // Security: tenant-scope check for admin callers.
    if (!internalCall && callerUser && callerUser.email !== user_email && callerUser.app_role !== 'Platform Admin') {
      const targetUsers = await base44.asServiceRole.entities.User.filter({ email: user_email });
      if (targetUsers.length > 0) {
        const scope = resolveUserScope(callerUser);
        if (scope.role === 'Partner Business Administrator' && scope.partner_id) {
          const pClients = await base44.asServiceRole.entities.Client.filter({ partner_id: scope.partner_id });
          attachPartnerClientIds(scope, pClients);
        }
        if (!isUserInScope(targetUsers[0], scope)) {
          return Response.json({ error: 'Forbidden — target user is outside your tenant' }, { status: 403 });
        }
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

    const config = badge.criteria_config || {};
    const targetValue = Number(config.target_value) || 1;

    // Completed-item counts for the learning metrics the engine can observe today.
    const countOf = async (entity, query) => {
      const rows = await base44.asServiceRole.entities[entity].filter(query);
      return Array.isArray(rows) ? rows.length : rows?.items?.length || 0;
    };

    const countCompleted = async (metric) => {
      if (metric === 'courses_completed') {
        return countOf('CourseProgress', { learner_email: user_email, status: 'completed' });
      }
      if (metric === 'resources_completed') {
        return countOf('AssignedLearning', { user_email, status: 'completed' });
      }
      if (metric === 'journeys_completed') {
        return countOf('JourneyEnrollment', { user_email, status: 'completed' });
      }
      return null;
    };

    if (badge.criteria_type === 'single_event') {
      if (config.entity_type === 'Course') {
        // A specific course (entity_id) or any completed course.
        const query = { learner_email: user_email, status: 'completed' };
        if (config.entity_id) query.course_id = config.entity_id;
        const completedCourses = await base44.asServiceRole.entities.CourseProgress.filter(query);
        eligible =
          (Array.isArray(completedCourses)
            ? completedCourses.length
            : completedCourses?.items?.length || 0) > 0;
        progressPercentage = eligible ? 100 : 0;
      } else if (config.entity_type === 'Assessment') {
        const assessments = await base44.asServiceRole.entities.Assessment.filter({
          email: user_email
        });
        eligible = assessments.length > 0;
        progressPercentage = eligible ? 100 : 0;
      }
    }

    if (badge.criteria_type === 'cumulative') {
      if (config.metric === 'total_points') {
        const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
        if (users.length > 0) {
          const currentPoints = users[0].total_points || 0;
          progressPercentage = Math.min(100, (currentPoints / targetValue) * 100);
          eligible = currentPoints >= targetValue;
        }
      } else {
        const completed = await countCompleted(config.metric);
        if (completed !== null) {
          progressPercentage = Math.min(100, (completed / targetValue) * 100);
          eligible = completed >= targetValue;
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