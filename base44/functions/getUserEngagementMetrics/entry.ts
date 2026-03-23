import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userEmail } = await req.json();

    if (!userEmail) {
      return Response.json({ error: 'userEmail is required' }, { status: 400 });
    }

    // Get target user
    const allUsers = await base44.asServiceRole.entities.User.list();
    const targetUser = allUsers.find(u => u.email === userEmail);

    if (!targetUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch all engagement data in parallel
    const [assessments, goals, learning, loginHistory, sessions] = await Promise.all([
      base44.asServiceRole.entities.Assessment.filter({ email: userEmail }),
      base44.asServiceRole.entities.Goal.filter({ 
        "$or": [
          { created_by: userEmail },
          { assigned_to_emails: { "$in": [userEmail] } }
        ]
      }),
      base44.asServiceRole.entities.AssignedLearning.filter({ user_email: userEmail }),
      base44.asServiceRole.entities.LoginHistory.filter({ user_email: userEmail }, '-login_timestamp', 100),
      base44.asServiceRole.entities.ActiveSession.filter({ user_email: userEmail })
    ]);

    // Calculate metrics
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const metrics = {
      // Assessment metrics
      assessments_completed: assessments.length,
      latest_assessment_date: assessments.length > 0 ? assessments[0].submission_ts : null,
      average_assessment_score: assessments.length > 0 
        ? Math.round(assessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / assessments.length)
        : null,

      // Goal metrics
      total_goals: goals.length,
      active_goals: goals.filter(g => g.status === 'active').length,
      completed_goals: goals.filter(g => g.status === 'completed').length,
      overdue_goals: goals.filter(g => g.status === 'overdue').length,
      goal_completion_rate: goals.length > 0
        ? Math.round((goals.filter(g => g.status === 'completed').length / goals.length) * 100)
        : 0,

      // Learning metrics
      total_learning_assigned: learning.length,
      learning_completed: learning.filter(l => l.status === 'completed').length,
      learning_in_progress: learning.filter(l => l.status === 'in_progress').length,
      learning_completion_rate: learning.length > 0
        ? Math.round((learning.filter(l => l.status === 'completed').length / learning.length) * 100)
        : 0,

      // Login activity metrics
      total_logins: loginHistory.filter(l => l.status === 'success').length,
      failed_login_attempts: loginHistory.filter(l => l.status === 'failed').length,
      last_login: targetUser.last_login_date,
      logins_last_30_days: loginHistory.filter(l => 
        l.status === 'success' && new Date(l.login_timestamp) >= thirtyDaysAgo
      ).length,
      logins_last_7_days: loginHistory.filter(l => 
        l.status === 'success' && new Date(l.login_timestamp) >= sevenDaysAgo
      ).length,

      // Session metrics
      active_sessions_count: sessions.filter(s => s.is_active).length,
      total_sessions: sessions.length,

      // Activity score calculation
      days_since_last_login: targetUser.last_login_date 
        ? Math.floor((now - new Date(targetUser.last_login_date)) / (1000 * 60 * 60 * 24))
        : null,

      // Overall engagement score (0-100)
      engagement_score: calculateEngagementScore({
        assessments,
        goals,
        learning,
        loginHistory,
        lastLogin: targetUser.last_login_date
      })
    };

    return Response.json({
      success: true,
      userEmail,
      metrics
    });

  } catch (error) {
    console.error('Error getting user engagement metrics:', error);
    return Response.json({
      error: 'Failed to get engagement metrics',
      details: error.message
    }, { status: 500 });
  }
});

function calculateEngagementScore({ assessments, goals, learning, loginHistory, lastLogin }) {
  let score = 0;
  const weights = {
    assessments: 20,
    goals: 25,
    learning: 25,
    loginActivity: 30
  };

  // Assessment completion
  if (assessments.length > 0) {
    score += weights.assessments;
  }

  // Goal progress
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const goalRate = goals.length > 0 ? completedGoals / goals.length : 0;
  score += goalRate * weights.goals;

  // Learning completion
  const completedLearning = learning.filter(l => l.status === 'completed').length;
  const learningRate = learning.length > 0 ? completedLearning / learning.length : 0;
  score += learningRate * weights.learning;

  // Login activity (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentLogins = loginHistory.filter(l => 
    l.status === 'success' && new Date(l.login_timestamp) >= thirtyDaysAgo
  ).length;
  
  const loginScore = Math.min(recentLogins / 10, 1); // 10+ logins = max score
  score += loginScore * weights.loginActivity;

  return Math.round(score);
}