import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For Analyst role, fetch organizational data instead of personal data
    if (user.app_role === 'Analyst') {
      const allUsers = user.client_id 
        ? await base44.asServiceRole.entities.User.filter({ client_id: user.client_id })
        : await base44.asServiceRole.entities.User.list();

      const userEmails = allUsers.map(u => u.email);

      const [assessments, goals, assignedLearning] = await Promise.all([
        base44.asServiceRole.entities.Assessment.filter({ email: { $in: userEmails } }),
        base44.asServiceRole.entities.Goal.filter({ created_by: { $in: userEmails } }),
        base44.asServiceRole.entities.AssignedLearning.filter({ user_email: { $in: userEmails } })
      ]);

      // Calculate org-wide metrics
      const avgScore = assessments.length > 0
        ? Math.round(assessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / assessments.length)
        : 0;

      const activeGoals = goals.filter(g => ['active', 'at_risk', 'overdue'].includes(g.status));
      const completedGoals = goals.filter(g => g.status === 'completed');
      const atRiskGoals = goals.filter(g => ['at_risk', 'overdue'].includes(g.status));

      const completedLearning = assignedLearning.filter(a => a.status === 'completed');
      const pendingLearning = assignedLearning.filter(a => a.status !== 'completed');

      return Response.json({
        success: true,
        data: {
          user: {
            email: user.email,
            full_name: user.full_name,
            app_role: user.app_role
          },
          assessment: {
            latest: null,
            hasAssessment: false,
            orgAverage: avgScore
          },
          goals: {
            all: [],
            active: [],
            completed: [],
            atRisk: [],
            metrics: {
              total: goals.length,
              activeCount: activeGoals.length,
              completedCount: completedGoals.length,
              atRiskCount: atRiskGoals.length,
              successRate: goals.length > 0 ? Math.round((completedGoals.length / goals.length) * 100) : 0
            }
          },
          learning: {
            all: [],
            pending: [],
            completed: [],
            metrics: {
              total: assignedLearning.length,
              pendingCount: pendingLearning.length,
              completedCount: completedLearning.length,
              completionRate: assignedLearning.length > 0 
                ? Math.round((completedLearning.length / assignedLearning.length) * 100) 
                : 0
            }
          },
          team: null,
          isAnalyst: true,
          organizationMetrics: {
            totalUsers: allUsers.length,
            avgLeadershipScore: avgScore,
            totalGoals: goals.length,
            totalLearning: assignedLearning.length
          }
        }
      });
    }

    // Parallel data fetching for maximum performance (for non-Analyst roles)
    const [
      assessments,
      goals,
      assignedLearning,
      allUsers
    ] = await Promise.all([
      base44.entities.Assessment.filter({ email: user.email }, '-submission_ts', 5),
      base44.entities.Goal.filter({ created_by: user.email }, '-created_date'),
      base44.entities.AssignedLearning.filter({ user_email: user.email }, '-created_date'),
      // Only fetch users if this user is a manager (has reports)
      user.app_role === 'User Level 2' ? base44.asServiceRole.entities.User.list() : Promise.resolve([])
    ]);

    // Get the latest assessment
    const latestAssessment = assessments.length > 0 ? assessments[0] : null;

    // Calculate goal metrics
    const activeGoals = goals.filter(g => ['active', 'at_risk', 'overdue'].includes(g.status));
    const completedGoals = goals.filter(g => g.status === 'completed');
    const atRiskGoals = goals.filter(g => ['at_risk', 'overdue'].includes(g.status));

    // Calculate learning metrics
    const pendingLearning = assignedLearning.filter(a => a.status !== 'completed');
    const completedLearning = assignedLearning.filter(a => a.status === 'completed');

    // Team data (only for managers)
    let teamData = null;
    if (user.app_role === 'User Level 2' && allUsers.length > 0) {
      const directReports = allUsers.filter(u => u.manager_email === user.email);
      
      if (directReports.length > 0) {
        const reportEmails = directReports.map(r => r.email);
        
        // Fetch team assessments and goals in parallel
        const [teamAssessments, teamGoals] = await Promise.all([
          base44.asServiceRole.entities.Assessment.filter({ email: { $in: reportEmails } }),
          base44.asServiceRole.entities.Goal.filter({ created_by: { $in: reportEmails } })
        ]);

        // Enrich direct reports with their data
        const enrichedReports = directReports.map(report => {
          const latestAssessment = teamAssessments
            .filter(a => a.email === report.email)
            .sort((a, b) => new Date(b.submission_ts) - new Date(a.submission_ts))[0];
          
          const memberGoals = teamGoals.filter(g => g.created_by === report.email);
          const activeGoals = memberGoals.filter(g => ['active', 'at_risk', 'overdue'].includes(g.status));
          const completedGoals = memberGoals.filter(g => g.status === 'completed');
          const goalProgress = activeGoals.length > 0
            ? Math.round(activeGoals.reduce((sum, g) => sum + (g.completion_percentage || 0), 0) / activeGoals.length)
            : 0;
          
          return {
            id: report.id,
            email: report.email,
            full_name: report.full_name,
            current_role: report.current_role,
            app_role: report.app_role,
            department: report.department,
            si_score: latestAssessment?.si_pct || 0,
            overall_score: latestAssessment?.overall_pct || 0,
            goals_count: memberGoals.length,
            active_goals: activeGoals.length,
            completed_goals: completedGoals.length,
            goal_progress: goalProgress,
            latestAssessment: latestAssessment ? {
              id: latestAssessment.id,
              si_pct: latestAssessment.si_pct,
              overall_pct: latestAssessment.overall_pct,
              submission_ts: latestAssessment.submission_ts
            } : null
          };
        });

        // Calculate team metrics
        const avgScore = teamAssessments.length > 0
          ? Math.round(teamAssessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / teamAssessments.length)
          : 0;
        
        const avgGoalProgress = enrichedReports.length > 0
          ? Math.round(enrichedReports.reduce((sum, r) => sum + r.goal_progress, 0) / enrichedReports.length)
          : 0;
        
        const atRiskCount = teamAssessments.filter(a => (a.overall_pct || 0) < 60).length;

        teamData = {
          totalReports: directReports.length,
          avgScore,
          avgGoalProgress,
          atRiskCount,
          directReports: enrichedReports
        };
      }
    }

    return Response.json({
      success: true,
      data: {
        user: {
          email: user.email,
          full_name: user.full_name,
          app_role: user.app_role
        },
        assessment: {
          latest: latestAssessment,
          hasAssessment: !!latestAssessment
        },
        goals: {
          all: goals,
          active: activeGoals,
          completed: completedGoals,
          atRisk: atRiskGoals,
          metrics: {
            total: goals.length,
            activeCount: activeGoals.length,
            completedCount: completedGoals.length,
            atRiskCount: atRiskGoals.length,
            successRate: goals.length > 0 ? Math.round((completedGoals.length / goals.length) * 100) : 0
          }
        },
        learning: {
          all: assignedLearning,
          pending: pendingLearning,
          completed: completedLearning,
          metrics: {
            total: assignedLearning.length,
            pendingCount: pendingLearning.length,
            completedCount: completedLearning.length,
            completionRate: assignedLearning.length > 0 
              ? Math.round((completedLearning.length / assignedLearning.length) * 100) 
              : 0
          }
        },
        team: teamData
      }
    });

  } catch (error) {
    console.error('Error loading dashboard data:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});