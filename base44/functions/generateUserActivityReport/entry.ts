import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userEmail, startDate, endDate } = await req.json();

    if (!userEmail) {
      return Response.json({ error: 'userEmail is required' }, { status: 400 });
    }

    // Get target user
    const allUsers = await base44.asServiceRole.entities.User.list();
    const targetUser = allUsers.find(u => u.email === userEmail);

    if (!targetUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Fetch all activity data
    const [assessments, goals, learning, loginHistory, activityLogs] = await Promise.all([
      base44.asServiceRole.entities.Assessment.filter({ email: userEmail }),
      base44.asServiceRole.entities.Goal.filter({ 
        "$or": [
          { created_by: userEmail },
          { assigned_to_emails: { "$in": [userEmail] } }
        ]
      }),
      base44.asServiceRole.entities.AssignedLearning.filter({ user_email: userEmail }),
      base44.asServiceRole.entities.LoginHistory.filter({ user_email: userEmail }, '-login_timestamp'),
      base44.asServiceRole.entities.ActivityLog.filter({ 
        "$or": [
          { initiator_user_email: userEmail },
          { target_user_email: userEmail }
        ]
      }, '-timestamp')
    ]);

    // Filter by date range
    const filterByDate = (items, dateField) => {
      return items.filter(item => {
        const date = new Date(item[dateField]);
        return date >= start && date <= end;
      });
    };

    const report = {
      user_info: {
        email: targetUser.email,
        full_name: targetUser.full_name,
        department: targetUser.department,
        current_role: targetUser.current_role,
        app_role: targetUser.app_role
      },
      period: {
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        days: Math.ceil((end - start) / (1000 * 60 * 60 * 24))
      },
      assessments: {
        total: filterByDate(assessments, 'submission_ts').length,
        average_score: assessments.length > 0
          ? Math.round(assessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / assessments.length)
          : 0,
        latest: assessments.length > 0 ? {
          date: assessments[0].submission_ts,
          score: assessments[0].overall_pct,
          archetype: assessments[0].archetype_label
        } : null
      },
      goals: {
        total: goals.length,
        created_in_period: filterByDate(goals, 'created_date').length,
        completed: goals.filter(g => g.status === 'completed').length,
        active: goals.filter(g => g.status === 'active').length,
        overdue: goals.filter(g => g.status === 'overdue').length,
        completion_rate: goals.length > 0
          ? Math.round((goals.filter(g => g.status === 'completed').length / goals.length) * 100)
          : 0
      },
      learning: {
        total_assigned: learning.length,
        completed: learning.filter(l => l.status === 'completed').length,
        in_progress: learning.filter(l => l.status === 'in_progress').length,
        completion_rate: learning.length > 0
          ? Math.round((learning.filter(l => l.status === 'completed').length / learning.length) * 100)
          : 0
      },
      login_activity: {
        total_logins: loginHistory.filter(l => l.status === 'success').length,
        logins_in_period: filterByDate(loginHistory.filter(l => l.status === 'success'), 'login_timestamp').length,
        failed_attempts: loginHistory.filter(l => l.status === 'failed').length,
        last_login: targetUser.last_login_date,
        days_since_last_login: targetUser.last_login_date
          ? Math.floor((Date.now() - new Date(targetUser.last_login_date)) / (1000 * 60 * 60 * 24))
          : null,
        unique_devices: [...new Set(loginHistory.map(l => l.device_type).filter(Boolean))],
        unique_locations: [...new Set(loginHistory.map(l => l.location).filter(Boolean))]
      },
      activity_timeline: activityLogs.map(log => ({
        timestamp: log.timestamp,
        action: log.action_type,
        initiator: log.initiator_user_email,
        target: log.target_user_email
      })).slice(0, 50)
    };

    // Calculate engagement score
    report.engagement_score = calculateEngagementScore(report);

    return Response.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Error generating activity report:', error);
    return Response.json({
      error: 'Failed to generate activity report',
      details: error.message
    }, { status: 500 });
  }
});

function calculateEngagementScore(report) {
  let score = 0;
  
  // Assessment completion
  if (report.assessments.total > 0) score += 20;
  
  // Goal activity
  if (report.goals.completion_rate >= 75) score += 25;
  else if (report.goals.completion_rate >= 50) score += 15;
  else if (report.goals.completion_rate >= 25) score += 5;
  
  // Learning activity
  if (report.learning.completion_rate >= 75) score += 25;
  else if (report.learning.completion_rate >= 50) score += 15;
  else if (report.learning.completion_rate >= 25) score += 5;
  
  // Login activity
  if (report.login_activity.logins_in_period >= 20) score += 30;
  else if (report.login_activity.logins_in_period >= 10) score += 20;
  else if (report.login_activity.logins_in_period >= 5) score += 10;
  
  return Math.min(score, 100);
}