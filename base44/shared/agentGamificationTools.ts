/**
 * Shared agent tool implementations for gamification and learning-progress
 * queries. Extracted from invokeAgent/entry.ts to enforce tenant-scoped
 * authorization on service-role reads.
 */
import { resolveUserScope, isUserInScope } from './userScope.ts';
import { getDirectReportEmails } from './orgScope.ts';

const ADMIN_ROLES = ['Platform Admin', 'Super Administrator', 'Admin Level 1', 'Admin Level 2'];

/**
 * Gamification achievements tool — returns the caller's own data by default.
 * If a different userEmail is supplied, requires an admin role or a verified
 * manager/direct-report relationship plus a tenant-scope check before the
 * service-role reads (prevents cross-tenant IDOR).
 */
export async function executeGetUserAchievements(base44, user, params) {
  let targetEmail = params.userEmail || user.email;

  // Security: When querying another user, verify authorization + tenant scope.
  if (targetEmail && targetEmail.toLowerCase() !== (user.email || '').toLowerCase()) {
    const scope = resolveUserScope(user);
    let authorized = false;
    if (ADMIN_ROLES.includes(user.app_role)) {
      const targetUsers = await base44.asServiceRole.entities.User.filter({ email: targetEmail });
      if (targetUsers.length > 0 && isUserInScope(targetUsers[0], scope)) {
        authorized = true;
      }
    } else {
      // Non-admin: verify direct-report relationship
      const directReports = await base44.asServiceRole.entities.User.filter({ manager_email: user.email });
      const isSubordinate = directReports.some(
        (u) => (u.email || '').toLowerCase() === targetEmail.toLowerCase()
      );
      if (isSubordinate) {
        const targetUsers = await base44.asServiceRole.entities.User.filter({ email: targetEmail });
        if (targetUsers.length > 0 && isUserInScope(targetUsers[0], scope)) {
          authorized = true;
        }
      }
    }
    if (!authorized) {
      return {
        message: `You are not authorized to view gamification data for ${targetEmail}.`,
        achievement_data: null,
      };
    }
  }

  // Get user achievement data
  const [achievements, badges, transactions] = await Promise.all([
    base44.asServiceRole.entities.UserAchievement.filter({ user_email: targetEmail }),
    base44.asServiceRole.entities.UserBadge.filter({ user_email: targetEmail }, '-earned_date', 20),
    base44.asServiceRole.entities.PointTransaction.filter({ user_email: targetEmail }, '-created_date', 10),
  ]);

  // Try to get leaderboard data, but don't fail if it errors
  let leaderboardData = null;
  try {
    leaderboardData = await base44.asServiceRole.functions.invoke('getLeaderboard', {
      scope: 'global',
      metric_type: 'total_points',
      limit: 100,
    });
  } catch (error) {
    console.warn('Could not fetch leaderboard data:', error.message);
  }

  const achievement = achievements[0] || null;
  const leaderboard = leaderboardData?.data?.leaderboard || [];
  const userRank = leaderboard.findIndex((entry) => entry.user_email === targetEmail) + 1;

  return {
    message: `**Your Gamification Progress:**\n\n🏆 **Level ${achievement?.current_level || 1}** with **${achievement?.total_points || 0} points**\n\n${achievement?.points_to_next_level ? `📈 ${achievement.points_to_next_level} points to Level ${achievement.current_level + 1}` : ''}\n\n🎖️ **Badges Earned:** ${badges.length}\n\n${userRank > 0 ? `🏅 **Leaderboard:** Rank #${userRank} of ${leaderboard.length}` : ''}\n\n${achievement?.current_streak_days > 0 ? `🔥 **Current Streak:** ${achievement.current_streak_days} days` : ''}`,
    achievement_data: {
      level: achievement?.current_level || 1,
      total_points: achievement?.total_points || 0,
      points_to_next_level: achievement?.points_to_next_level || 500,
      badges_count: badges.length,
      recent_badges: badges.slice(0, 5),
      leaderboard_rank: userRank,
      recent_transactions: transactions,
      current_streak: achievement?.current_streak_days || 0,
    },
  };
}

/**
 * Learning-progress tool — supports personal, team, and cohort scopes.
 * The cohort scope verifies the caller is a tenant-scoped admin, the cohort
 * manager, or a participant, and scopes the Cohort lookup by caller tenant
 * so cross-tenant IDs cannot be resolved.
 */
export async function executeTrackLearningProgress(base44, user, params) {
  const { scope = 'personal', cohortId, includeDetails = false } = params;

  let targetEmails: string[] = [];
  let actualScope = scope;

  // Security: derive direct reports server-side — never trust self-editable subordinate_emails.
  let drSet =
    actualScope === 'team' ||
    (!params.scope && ['User Level 2', 'User Level 3'].includes(user.app_role))
      ? await getDirectReportEmails(base44, user)
      : null;
  if (!params.scope && drSet && drSet.size > 0) actualScope = 'team';

  switch (actualScope) {
    case 'personal':
      targetEmails = [user.email];
      break;
    case 'team':
      targetEmails = drSet ? Array.from(drSet) : [];
      break;
    case 'cohort': {
      // Security: scope the Cohort lookup by caller tenant so cross-tenant
      // IDs cannot be resolved. Only allow access if the caller is a
      // tenant-scoped admin, the cohort manager, or a participant.
      const scopeObj = resolveUserScope(user);
      const cohortFilter: any = { id: cohortId };
      if (!scopeObj.isPlatformAdmin) {
        cohortFilter.client_id = user.client_id;
      }
      const cohorts = await base44.asServiceRole.entities.Cohort.filter(cohortFilter);
      if (cohorts.length > 0) {
        const cohort = cohorts[0];
        const isAdminInScope =
          ADMIN_ROLES.includes(user.app_role) &&
          (scopeObj.isPlatformAdmin || isUserInScope({ client_id: cohort.client_id }, scopeObj));
        const isParticipant = (cohort.participant_emails || [])
          .some((e) => (e || '').toLowerCase() === (user.email || '').toLowerCase());
        const isManager =
          cohort.manager_email &&
          cohort.manager_email.toLowerCase() === (user.email || '').toLowerCase();
        if (!isAdminInScope && !isParticipant && !isManager) {
          return {
            message: `You are not authorized to view progress for cohort "${cohort.name || cohortId}".`,
            progress_data: [],
            scope: actualScope,
          };
        }
        targetEmails = cohort.participant_emails || [];
      }
      break;
    }
    default:
      targetEmails = [user.email];
  }

  const progressData = [];
  for (const email of targetEmails) {
    const assigned = await base44.entities.AssignedLearning.filter({ user_email: email });
    const completed = assigned.filter((a) => a.status === 'completed').length;
    const total = assigned.length;

    progressData.push({
      email,
      completed,
      total,
      completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  }

  const summary = progressData.reduce(
    (acc, p) => {
      acc.totalCompleted += p.completed;
      acc.totalAssigned += p.total;
      return acc;
    },
    { totalCompleted: 0, totalAssigned: 0 }
  );

  const avgRate = summary.totalAssigned > 0 ? Math.round((summary.totalCompleted / summary.totalAssigned) * 100) : 0;

  return {
    message: `**Learning Progress (${actualScope}):**\n\n📚 **Overview:**\n• Completed: ${summary.totalCompleted}/${summary.totalAssigned}\n• Completion Rate: ${avgRate}%\n• Users: ${progressData.length}\n\n${includeDetails ? `**By User:**\n${progressData.map((p) => `• ${p.email}: ${p.completed}/${p.total} (${p.completion_rate}%)`).join('\n')}` : ''}`,
    progress_data: progressData,
    scope: actualScope,
  };
}