import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a manager (User Level 2)
    if (user.app_role !== 'User Level 2') {
      return Response.json({ error: 'Access denied. Manager role required.' }, { status: 403 });
    }

    // Parse request body for filters
    const body = await req.json().catch(() => ({}));
    const { time_range = '30d' } = body;

    console.log('[getManagerInsights] Generating insights for manager:', user.email, 'Time range:', time_range);

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (time_range) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '12mo':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date('2020-01-01');
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Fetch all users to identify direct reports
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    // Find direct reports (users where manager_email equals current user's email)
    const directReports = allUsers.filter(u => u.manager_email === user.email);
    
    console.log('[getManagerInsights] Found direct reports:', directReports.length);

    if (directReports.length === 0) {
      return Response.json({
        success: true,
        data: {
          hasDirectReports: false,
          message: 'No direct reports found. Team insights will be available once team members are assigned.'
        }
      });
    }

    const directReportEmails = directReports.map(u => u.email);

    // Fetch team data
    const [assessments, goals, assignedLearning, journeyEnrollments] = await Promise.all([
      base44.asServiceRole.entities.Assessment.list(),
      base44.asServiceRole.entities.Goal.list(),
      base44.asServiceRole.entities.AssignedLearning.list(),
      base44.asServiceRole.entities.JourneyEnrollment.list()
    ]);

    // Filter data for direct reports and time range
    const teamAssessments = assessments.filter(a => 
      directReportEmails.includes(a.email) &&
      new Date(a.submission_ts) >= startDate
    );

    const teamGoals = goals.filter(g => 
      directReportEmails.includes(g.user_email) &&
      new Date(g.created_date) >= startDate
    );

    const teamLearning = assignedLearning.filter(l => 
      directReportEmails.includes(l.user_email) &&
      new Date(l.created_date) >= startDate
    );

    const teamJourneys = journeyEnrollments.filter(j => 
      directReportEmails.includes(j.user_email)
    );

    // Calculate team metrics
    const teamMetrics = {
      totalDirectReports: directReports.length,
      assessmentCompletionRate: 0,
      avgTeamScore: 0,
      teamGoalCompletionRate: 0,
      teamLearningCompletionRate: 0,
      avgJourneyProgress: 0,
      activeGoalsCount: 0,
      overdueGoalsCount: 0,
      atRiskMembersCount: 0
    };

    // Calculate assessment metrics
    const reportsWithAssessments = directReports.filter(dr => 
      assessments.some(a => a.email === dr.email)
    );
    teamMetrics.assessmentCompletionRate = directReports.length > 0
      ? Math.round((reportsWithAssessments.length / directReports.length) * 100)
      : 0;

    if (teamAssessments.length > 0) {
      teamMetrics.avgTeamScore = Math.round(
        teamAssessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / teamAssessments.length
      );
    }

    // Calculate goal metrics
    const completedGoals = teamGoals.filter(g => g.status === 'completed');
    teamMetrics.teamGoalCompletionRate = teamGoals.length > 0
      ? Math.round((completedGoals.length / teamGoals.length) * 100)
      : 0;
    teamMetrics.activeGoalsCount = teamGoals.filter(g => ['active', 'at_risk', 'overdue'].includes(g.status)).length;
    teamMetrics.overdueGoalsCount = teamGoals.filter(g => g.status === 'overdue').length;

    // Calculate learning metrics
    const completedLearning = teamLearning.filter(l => l.status === 'completed');
    teamMetrics.teamLearningCompletionRate = teamLearning.length > 0
      ? Math.round((completedLearning.length / teamLearning.length) * 100)
      : 0;

    // Calculate journey metrics
    if (teamJourneys.length > 0) {
      teamMetrics.avgJourneyProgress = Math.round(
        teamJourneys.reduce((sum, j) => sum + (j.completion_percentage || 0), 0) / teamJourneys.length
      );
    }

    // Build individual team member profiles
    const teamMemberProfiles = [];
    
    for (const member of directReports) {
      const memberAssessments = assessments.filter(a => a.email === member.email)
        .sort((a, b) => new Date(b.submission_ts) - new Date(a.submission_ts));
      const latestAssessment = memberAssessments[0];
      
      const memberGoals = goals.filter(g => g.user_email === member.email);
      const activeGoals = memberGoals.filter(g => ['active', 'at_risk', 'overdue'].includes(g.status));
      const completedMemberGoals = memberGoals.filter(g => g.status === 'completed');
      const overdueGoals = memberGoals.filter(g => g.status === 'overdue');
      
      const memberLearning = assignedLearning.filter(l => l.user_email === member.email);
      const completedMemberLearning = memberLearning.filter(l => l.status === 'completed');
      const overdueLearning = memberLearning.filter(l => 
        l.status !== 'completed' && l.due_date && new Date(l.due_date) < now
      );

      const memberJourneys = journeyEnrollments.filter(j => j.user_email === member.email);
      
      // Calculate risk factors
      const riskFactors = [];
      let riskScore = 0;

      if (!latestAssessment) {
        riskFactors.push('No assessment taken');
        riskScore += 25;
      } else if (latestAssessment.overall_pct < 50) {
        riskFactors.push('Low assessment score');
        riskScore += 20;
      }

      if (overdueGoals.length > 0) {
        riskFactors.push(`${overdueGoals.length} overdue goal${overdueGoals.length > 1 ? 's' : ''}`);
        riskScore += overdueGoals.length * 15;
      }

      if (overdueLearning.length > 0) {
        riskFactors.push(`${overdueLearning.length} overdue learning`);
        riskScore += overdueLearning.length * 10;
      }

      const daysSinceLastAssessment = latestAssessment
        ? Math.floor((now - new Date(latestAssessment.submission_ts)) / (1000 * 60 * 60 * 24))
        : null;

      if (daysSinceLastAssessment && daysSinceLastAssessment > 180) {
        riskFactors.push('Assessment overdue');
        riskScore += 15;
      }

      const goalCompletionRate = memberGoals.length > 0
        ? Math.round((completedMemberGoals.length / memberGoals.length) * 100)
        : 0;

      if (goalCompletionRate < 30 && memberGoals.length > 0) {
        riskFactors.push('Low goal completion');
        riskScore += 15;
      }

      const isAtRisk = riskScore >= 40;
      if (isAtRisk) {
        teamMetrics.atRiskMembersCount++;
      }

      // Determine recommended action
      let recommendedAction = null;
      if (overdueGoals.length > 0) {
        recommendedAction = 'schedule_1on1_goals';
      } else if (!latestAssessment) {
        recommendedAction = 'request_assessment';
      } else if (overdueLearning.length > 0) {
        recommendedAction = 'follow_up_learning';
      } else if (isAtRisk) {
        recommendedAction = 'schedule_1on1_general';
      }

      teamMemberProfiles.push({
        email: member.email,
        full_name: member.full_name,
        department: member.department,
        current_role: member.current_role,
        latestAssessmentScore: latestAssessment?.overall_pct || null,
        latestAssessmentDate: latestAssessment?.submission_ts || null,
        daysSinceLastAssessment,
        activeGoalsCount: activeGoals.length,
        completedGoalsCount: completedMemberGoals.length,
        overdueGoalsCount: overdueGoals.length,
        goalCompletionRate,
        activeLearningCount: memberLearning.filter(l => l.status !== 'completed').length,
        completedLearningCount: completedMemberLearning.length,
        overdueLearningCount: overdueLearning.length,
        learningCompletionRate: memberLearning.length > 0
          ? Math.round((completedMemberLearning.length / memberLearning.length) * 100)
          : 0,
        activeJourneysCount: memberJourneys.filter(j => j.status === 'in_progress').length,
        avgJourneyProgress: memberJourneys.length > 0
          ? Math.round(memberJourneys.reduce((sum, j) => sum + (j.completion_percentage || 0), 0) / memberJourneys.length)
          : 0,
        isAtRisk,
        riskScore,
        riskFactors,
        recommendedAction
      });
    }

    // Sort team members by risk (highest risk first)
    teamMemberProfiles.sort((a, b) => b.riskScore - a.riskScore);

    // Generate team-wide insights
    const teamInsights = [];

    // High performers insight
    const highPerformers = teamMemberProfiles.filter(m => 
      m.latestAssessmentScore && m.latestAssessmentScore >= 80
    );
    if (highPerformers.length > 0) {
      teamInsights.push({
        type: 'positive_trend',
        category: 'team_performance',
        title: `${highPerformers.length} team member${highPerformers.length > 1 ? 's' : ''} performing excellently`,
        description: `${highPerformers.map(m => m.full_name).slice(0, 3).join(', ')}${highPerformers.length > 3 ? ` and ${highPerformers.length - 3} more` : ''} scored 80%+ on assessments.`,
        priority: 'low',
        impact_score: 70,
        recommended_action: 'Consider these team members for stretch assignments or mentorship roles.',
        affected_members: highPerformers.map(m => m.email)
      });
    }

    // At-risk members insight
    const atRiskMembers = teamMemberProfiles.filter(m => m.isAtRisk);
    if (atRiskMembers.length > 0) {
      teamInsights.push({
        type: 'warning',
        category: 'team_performance',
        title: `${atRiskMembers.length} team member${atRiskMembers.length > 1 ? 's need' : ' needs'} attention`,
        description: `${atRiskMembers.map(m => m.full_name).slice(0, 3).join(', ')}${atRiskMembers.length > 3 ? ` and ${atRiskMembers.length - 3} more` : ''} showing multiple risk factors.`,
        priority: 'high',
        impact_score: Math.min(atRiskMembers.length * 20, 100),
        recommended_action: 'Schedule 1-on-1 meetings to provide support and remove blockers.',
        affected_members: atRiskMembers.map(m => m.email)
      });
    }

    // Missing assessments insight
    const missingAssessments = teamMemberProfiles.filter(m => !m.latestAssessmentScore);
    if (missingAssessments.length > 0) {
      teamInsights.push({
        type: 'action_required',
        category: 'team_development',
        title: `${missingAssessments.length} team member${missingAssessments.length > 1 ? 's haven\'t' : ' hasn\'t'} taken assessment`,
        description: 'Baseline assessments are crucial for personalized development plans.',
        priority: 'high',
        impact_score: Math.min(missingAssessments.length * 15, 100),
        recommended_action: 'Encourage team members to complete their leadership assessments.',
        affected_members: missingAssessments.map(m => m.email)
      });
    }

    // Overdue goals insight
    if (teamMetrics.overdueGoalsCount > 0) {
      const membersWithOverdueGoals = teamMemberProfiles.filter(m => m.overdueGoalsCount > 0);
      teamInsights.push({
        type: 'warning',
        category: 'goal_management',
        title: `${teamMetrics.overdueGoalsCount} overdue goal${teamMetrics.overdueGoalsCount > 1 ? 's' : ''} across team`,
        description: `${membersWithOverdueGoals.length} team member${membersWithOverdueGoals.length > 1 ? 's have' : ' has'} overdue goals requiring attention.`,
        priority: 'high',
        impact_score: Math.min(teamMetrics.overdueGoalsCount * 10, 100),
        recommended_action: 'Review overdue goals and adjust timelines or provide additional support.',
        affected_members: membersWithOverdueGoals.map(m => m.email)
      });
    }

    // Team goal completion insight
    if (teamMetrics.teamGoalCompletionRate >= 75) {
      teamInsights.push({
        type: 'positive_trend',
        category: 'goal_management',
        title: `Strong team goal completion: ${teamMetrics.teamGoalCompletionRate}%`,
        description: 'Your team is consistently hitting their goals. Keep up the momentum!',
        priority: 'low',
        impact_score: teamMetrics.teamGoalCompletionRate,
        recommended_action: 'Celebrate successes and set new stretch goals for continued growth.'
      });
    } else if (teamMetrics.teamGoalCompletionRate < 50) {
      teamInsights.push({
        type: 'warning',
        category: 'goal_management',
        title: `Team goal completion needs improvement: ${teamMetrics.teamGoalCompletionRate}%`,
        description: 'Less than half of team goals are being completed on time.',
        priority: 'medium',
        impact_score: 100 - teamMetrics.teamGoalCompletionRate,
        recommended_action: 'Review goal-setting process and provide more frequent check-ins.'
      });
    }

    // Team learning completion insight
    if (teamMetrics.teamLearningCompletionRate >= 80) {
      teamInsights.push({
        type: 'positive_trend',
        category: 'team_development',
        title: `Excellent team learning engagement: ${teamMetrics.teamLearningCompletionRate}%`,
        description: 'Your team is actively completing assigned learning.',
        priority: 'low',
        impact_score: teamMetrics.teamLearningCompletionRate,
        recommended_action: 'Continue assigning relevant development opportunities.'
      });
    }

    // Stale assessments insight
    const staleAssessments = teamMemberProfiles.filter(m => 
      m.daysSinceLastAssessment && m.daysSinceLastAssessment > 180
    );
    if (staleAssessments.length > 0) {
      teamInsights.push({
        type: 'action_required',
        category: 'team_development',
        title: `${staleAssessments.length} team member${staleAssessments.length > 1 ? 's need' : ' needs'} reassessment`,
        description: 'Regular assessments help track growth and adjust development plans.',
        priority: 'medium',
        impact_score: Math.min(staleAssessments.length * 12, 100),
        recommended_action: 'Encourage team members to retake assessments to measure progress.',
        affected_members: staleAssessments.map(m => m.email)
      });
    }

    // 1-on-1 recommendations
    const oneOnOneRecommendations = [];
    
    for (const member of teamMemberProfiles) {
      if (member.recommendedAction) {
        let reason = '';
        let priority = 'medium';
        
        switch (member.recommendedAction) {
          case 'schedule_1on1_goals':
            reason = `Has ${member.overdueGoalsCount} overdue goal${member.overdueGoalsCount > 1 ? 's' : ''}`;
            priority = 'high';
            break;
          case 'request_assessment':
            reason = 'Has not taken baseline assessment';
            priority = 'high';
            break;
          case 'follow_up_learning':
            reason = `Has ${member.overdueLearningCount} overdue learning assignment${member.overdueLearningCount > 1 ? 's' : ''}`;
            priority = 'medium';
            break;
          case 'schedule_1on1_general':
            reason = 'Multiple risk factors detected';
            priority = 'high';
            break;
        }

        oneOnOneRecommendations.push({
          member_email: member.email,
          member_name: member.full_name,
          priority,
          reason,
          action: member.recommendedAction,
          risk_score: member.riskScore
        });
      }
    }

    // Sort 1-on-1 recommendations by priority and risk score
    oneOnOneRecommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.risk_score - a.risk_score;
    });

    // Calculate benchmark comparison with other User Level 2 managers
    const allManagers = allUsers.filter(u => u.app_role === 'User Level 2' && u.email !== user.email);
    let benchmarkComparison = null;

    if (allManagers.length > 0) {
      // Calculate average team performance for other managers
      const otherManagersTeamScores = [];
      
      for (const manager of allManagers) {
        const managerDirectReports = allUsers.filter(u => u.manager_email === manager.email);
        if (managerDirectReports.length > 0) {
          const managerTeamAssessments = assessments.filter(a => 
            managerDirectReports.some(dr => dr.email === a.email)
          );
          if (managerTeamAssessments.length > 0) {
            const avgScore = managerTeamAssessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / managerTeamAssessments.length;
            otherManagersTeamScores.push(avgScore);
          }
        }
      }

      if (otherManagersTeamScores.length > 0) {
        const orgAvgTeamScore = Math.round(
          otherManagersTeamScores.reduce((sum, score) => sum + score, 0) / otherManagersTeamScores.length
        );

        benchmarkComparison = {
          yourTeamAvgScore: teamMetrics.avgTeamScore,
          orgAvgTeamScore,
          scoreDiff: teamMetrics.avgTeamScore - orgAvgTeamScore,
          managerCount: allManagers.length + 1,
          rank: otherManagersTeamScores.filter(score => score > teamMetrics.avgTeamScore).length + 1
        };
      }
    }

    // Management effectiveness score (0-100)
    let managementEffectivenessScore = 0;
    let effectivenessFactors = [];

    // Factor 1: Team assessment completion (25 points)
    const assessmentPoints = Math.round(teamMetrics.assessmentCompletionRate * 0.25);
    managementEffectivenessScore += assessmentPoints;
    effectivenessFactors.push({
      factor: 'Assessment Completion',
      score: assessmentPoints,
      maxScore: 25,
      percentage: teamMetrics.assessmentCompletionRate
    });

    // Factor 2: Team goal completion (25 points)
    const goalPoints = Math.round(teamMetrics.teamGoalCompletionRate * 0.25);
    managementEffectivenessScore += goalPoints;
    effectivenessFactors.push({
      factor: 'Goal Completion',
      score: goalPoints,
      maxScore: 25,
      percentage: teamMetrics.teamGoalCompletionRate
    });

    // Factor 3: Team learning completion (20 points)
    const learningPoints = Math.round(teamMetrics.teamLearningCompletionRate * 0.20);
    managementEffectivenessScore += learningPoints;
    effectivenessFactors.push({
      factor: 'Learning Completion',
      score: learningPoints,
      maxScore: 20,
      percentage: teamMetrics.teamLearningCompletionRate
    });

    // Factor 4: Low risk factor (20 points) - inverse of at-risk percentage
    const riskPercentage = (teamMetrics.atRiskMembersCount / teamMetrics.totalDirectReports) * 100;
    const riskPoints = Math.round((100 - riskPercentage) * 0.20);
    managementEffectivenessScore += riskPoints;
    effectivenessFactors.push({
      factor: 'Team Engagement',
      score: riskPoints,
      maxScore: 20,
      percentage: 100 - riskPercentage
    });

    // Factor 5: Team average score (10 points)
    const avgScorePoints = Math.round((teamMetrics.avgTeamScore / 100) * 10);
    managementEffectivenessScore += avgScorePoints;
    effectivenessFactors.push({
      factor: 'Team Performance',
      score: avgScorePoints,
      maxScore: 10,
      percentage: teamMetrics.avgTeamScore
    });

    const responseData = {
      success: true,
      data: {
        hasDirectReports: true,
        teamMetrics,
        teamMemberProfiles,
        teamInsights: teamInsights.slice(0, 8),
        oneOnOneRecommendations: oneOnOneRecommendations.slice(0, 10),
        benchmarkComparison,
        managementEffectiveness: {
          overallScore: Math.round(managementEffectivenessScore),
          factors: effectivenessFactors,
          tier: managementEffectivenessScore >= 80 ? 'Excellent' :
                managementEffectivenessScore >= 60 ? 'Good' :
                managementEffectivenessScore >= 40 ? 'Developing' : 'Needs Improvement'
        }
      }
    };

    console.log('[getManagerInsights] Successfully generated manager insights');
    return Response.json(responseData);

  } catch (error) {
    console.error('[getManagerInsights] Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});