import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is an org leader (User Level 3)
    if (user.app_role !== 'User Level 3') {
      return Response.json({ error: 'Access denied. Org leader role required.' }, { status: 403 });
    }

    // Parse request body for filters
    const body = await req.json().catch(() => ({}));
    const { time_range = '30d', department_filter = 'all' } = body;

    console.log('[getOrgLeaderInsights] Generating insights for org leader:', user.email, 'Time range:', time_range);

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

    // Fetch all organizational data
    const [allUsers, assessments, goals, assignedLearning, journeyEnrollments, cohorts] = await Promise.all([
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.Assessment.list(),
      base44.asServiceRole.entities.Goal.list(),
      base44.asServiceRole.entities.AssignedLearning.list(),
      base44.asServiceRole.entities.JourneyEnrollment.list(),
      base44.asServiceRole.entities.Cohort.list().catch(() => [])
    ]);

    // Filter users by client
    const orgUsers = allUsers.filter(u => u.client_id === user.client_id);
    
    console.log('[getOrgLeaderInsights] Organization users:', orgUsers.length);

    // Apply department filter if specified
    const filteredUsers = department_filter === 'all' 
      ? orgUsers 
      : orgUsers.filter(u => u.department === department_filter);

    const userEmails = filteredUsers.map(u => u.email);

    // Filter assessments by time range and users
    const recentAssessments = assessments.filter(a => 
      userEmails.includes(a.email) &&
      new Date(a.submission_ts) >= startDate
    );

    const recentGoals = goals.filter(g => 
      userEmails.includes(g.user_email) &&
      new Date(g.created_date) >= startDate
    );

    const recentLearning = assignedLearning.filter(l => 
      userEmails.includes(l.user_email) &&
      new Date(l.created_date) >= startDate
    );

    // Calculate organization-wide metrics
    const orgMetrics = {
      totalEmployees: filteredUsers.length,
      totalManagers: filteredUsers.filter(u => u.app_role === 'User Level 2').length,
      totalIndividualContributors: filteredUsers.filter(u => u.app_role === 'User Level 1').length,
      assessmentCompletionRate: 0,
      avgOrgScore: 0,
      orgGoalCompletionRate: 0,
      orgLearningCompletionRate: 0,
      activeCohortsCount: cohorts.filter(c => c.status === 'active').length,
      totalCohortsCount: cohorts.length
    };

    // Calculate assessment metrics
    const usersWithAssessments = filteredUsers.filter(u => 
      assessments.some(a => a.email === u.email)
    );
    orgMetrics.assessmentCompletionRate = filteredUsers.length > 0
      ? Math.round((usersWithAssessments.length / filteredUsers.length) * 100)
      : 0;

    if (recentAssessments.length > 0) {
      orgMetrics.avgOrgScore = Math.round(
        recentAssessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / recentAssessments.length
      );
    }

    // Calculate goal metrics
    const completedGoals = recentGoals.filter(g => g.status === 'completed');
    orgMetrics.orgGoalCompletionRate = recentGoals.length > 0
      ? Math.round((completedGoals.length / recentGoals.length) * 100)
      : 0;

    // Calculate learning metrics
    const completedLearning = recentLearning.filter(l => l.status === 'completed');
    orgMetrics.orgLearningCompletionRate = recentLearning.length > 0
      ? Math.round((completedLearning.length / recentLearning.length) * 100)
      : 0;

    // Department breakdown
    const departments = [...new Set(filteredUsers.map(u => u.department).filter(Boolean))];
    const departmentBreakdown = [];

    for (const dept of departments) {
      const deptUsers = filteredUsers.filter(u => u.department === dept);
      const deptAssessments = recentAssessments.filter(a => {
        const assessmentUser = filteredUsers.find(u => u.email === a.email);
        return assessmentUser && assessmentUser.department === dept;
      });
      const deptGoals = recentGoals.filter(g => {
        const goalUser = filteredUsers.find(u => u.email === g.user_email);
        return goalUser && goalUser.department === dept;
      });

      const deptAvgScore = deptAssessments.length > 0
        ? Math.round(deptAssessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / deptAssessments.length)
        : 0;

      const deptGoalCompletion = deptGoals.length > 0
        ? Math.round((deptGoals.filter(g => g.status === 'completed').length / deptGoals.length) * 100)
        : 0;

      departmentBreakdown.push({
        name: dept,
        employeeCount: deptUsers.length,
        avgScore: deptAvgScore,
        goalCompletionRate: deptGoalCompletion,
        assessmentCompletionRate: Math.round((deptUsers.filter(u => assessments.some(a => a.email === u.email)).length / deptUsers.length) * 100)
      });
    }

    // Sort departments by employee count
    departmentBreakdown.sort((a, b) => b.employeeCount - a.employeeCount);

    // Leadership pipeline analysis
    const leadershipPipeline = {
      totalLeaders: filteredUsers.filter(u => ['User Level 2', 'User Level 3'].includes(u.app_role)).length,
      managersOfManagers: filteredUsers.filter(u => u.app_role === 'User Level 2').length,
      seniorLeaders: filteredUsers.filter(u => u.app_role === 'User Level 3').length,
      highPotentialCount: 0,
      readyNowCount: 0,
      successionCoverage: 0
    };

    // Identify high potential and ready now leaders
    const leaderAssessments = recentAssessments.filter(a => {
      const assessmentUser = filteredUsers.find(u => u.email === a.email);
      return assessmentUser && ['User Level 1', 'User Level 2'].includes(assessmentUser.app_role);
    });

    leadershipPipeline.highPotentialCount = leaderAssessments.filter(a => a.overall_pct >= 70).length;
    leadershipPipeline.readyNowCount = leaderAssessments.filter(a => a.overall_pct >= 80).length;
    leadershipPipeline.successionCoverage = leadershipPipeline.totalLeaders > 0
      ? Math.round((leadershipPipeline.readyNowCount / leadershipPipeline.totalLeaders) * 100)
      : 0;

    // Talent risk assessment
    const talentRisks = {
      lowPerformers: [],
      disengaged: [],
      flightRisk: [],
      skillGaps: []
    };

    for (const user of filteredUsers) {
      const userAssessments = assessments.filter(a => a.email === user.email)
        .sort((a, b) => new Date(b.submission_ts) - new Date(a.submission_ts));
      const latestAssessment = userAssessments[0];

      const userGoals = goals.filter(g => g.user_email === user.email);
      const userLearning = assignedLearning.filter(l => l.user_email === user.email);

      // Low performers (score < 50)
      if (latestAssessment && latestAssessment.overall_pct < 50) {
        talentRisks.lowPerformers.push({
          email: user.email,
          full_name: user.full_name,
          department: user.department,
          app_role: user.app_role,
          score: latestAssessment.overall_pct
        });
      }

      // Disengaged (no activity in past 60 days)
      const hasRecentActivity = 
        userGoals.some(g => new Date(g.updated_date) >= new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)) ||
        userLearning.some(l => new Date(l.updated_date) >= new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)) ||
        (latestAssessment && new Date(latestAssessment.submission_ts) >= new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000));

      if (!hasRecentActivity && latestAssessment) {
        talentRisks.disengaged.push({
          email: user.email,
          full_name: user.full_name,
          department: user.department,
          app_role: user.app_role,
          daysSinceActivity: Math.floor((now - new Date(latestAssessment.submission_ts)) / (1000 * 60 * 60 * 24))
        });
      }

      // Flight risk (high performers with declining engagement)
      if (latestAssessment && latestAssessment.overall_pct >= 70) {
        const overdueGoals = userGoals.filter(g => g.status === 'overdue').length;
        const completedGoals = userGoals.filter(g => g.status === 'completed').length;
        const goalCompletionRate = userGoals.length > 0 ? completedGoals / userGoals.length : 0;

        if (overdueGoals > 2 || goalCompletionRate < 0.3) {
          talentRisks.flightRisk.push({
            email: user.email,
            full_name: user.full_name,
            department: user.department,
            app_role: user.app_role,
            score: latestAssessment.overall_pct,
            riskFactors: [
              overdueGoals > 2 ? `${overdueGoals} overdue goals` : null,
              goalCompletionRate < 0.3 ? 'Low goal completion' : null
            ].filter(Boolean)
          });
        }
      }

      // Skill gaps (specific competencies below 60%)
      if (latestAssessment) {
        const competencies = [
          { key: 'dm_pct', name: 'Decision Making' },
          { key: 'comm_pct', name: 'Communication' },
          { key: 'rm_pct', name: 'Resource Management' },
          { key: 'sm_pct', name: 'Stakeholder Management' },
          { key: 'pm_pct', name: 'Performance Management' }
        ];

        const lowCompetencies = competencies.filter(c => latestAssessment[c.key] < 60);
        
        if (lowCompetencies.length > 0) {
          talentRisks.skillGaps.push({
            email: user.email,
            full_name: user.full_name,
            department: user.department,
            app_role: user.app_role,
            gaps: lowCompetencies.map(c => ({ name: c.name, score: latestAssessment[c.key] }))
          });
        }
      }
    }

    // Strategic insights
    const strategicInsights = [];

    // Overall org health
    if (orgMetrics.avgOrgScore >= 70) {
      strategicInsights.push({
        type: 'positive_trend',
        category: 'organizational_health',
        title: `Strong organizational performance: ${orgMetrics.avgOrgScore}%`,
        description: 'Your organization is performing above industry benchmarks in leadership development.',
        priority: 'low',
        impact_score: orgMetrics.avgOrgScore,
        recommended_action: 'Continue investing in development programs and recognize top performers.',
        kpi: 'Avg Org Score'
      });
    } else if (orgMetrics.avgOrgScore < 50) {
      strategicInsights.push({
        type: 'warning',
        category: 'organizational_health',
        title: `Organizational performance needs attention: ${orgMetrics.avgOrgScore}%`,
        description: 'Organization-wide leadership scores are below target. Immediate action required.',
        priority: 'high',
        impact_score: 100 - orgMetrics.avgOrgScore,
        recommended_action: 'Conduct leadership needs assessment and implement targeted development programs.',
        kpi: 'Avg Org Score'
      });
    }

    // Succession planning
    if (leadershipPipeline.successionCoverage < 50) {
      strategicInsights.push({
        type: 'critical',
        category: 'succession_planning',
        title: `Low succession coverage: ${leadershipPipeline.successionCoverage}%`,
        description: `Only ${leadershipPipeline.readyNowCount} leaders are ready for promotion. Risk of leadership gaps.`,
        priority: 'high',
        impact_score: 100 - leadershipPipeline.successionCoverage,
        recommended_action: 'Accelerate high-potential development programs and create succession plans for critical roles.',
        kpi: 'Succession Coverage'
      });
    } else if (leadershipPipeline.successionCoverage >= 80) {
      strategicInsights.push({
        type: 'positive_trend',
        category: 'succession_planning',
        title: `Excellent succession pipeline: ${leadershipPipeline.successionCoverage}%`,
        description: `Strong bench strength with ${leadershipPipeline.readyNowCount} leaders ready for advancement.`,
        priority: 'low',
        impact_score: leadershipPipeline.successionCoverage,
        recommended_action: 'Retain high potentials through stretch assignments and clear career paths.',
        kpi: 'Succession Coverage'
      });
    }

    // Talent retention risks
    if (talentRisks.flightRisk.length > 0) {
      const flightRiskPercentage = Math.round((talentRisks.flightRisk.length / filteredUsers.length) * 100);
      strategicInsights.push({
        type: 'warning',
        category: 'talent_retention',
        title: `${talentRisks.flightRisk.length} high performers at risk`,
        description: `${flightRiskPercentage}% of high-performing employees showing disengagement signals.`,
        priority: 'high',
        impact_score: Math.min(talentRisks.flightRisk.length * 10, 100),
        recommended_action: 'Conduct stay interviews and implement retention strategies for high performers.',
        kpi: 'Flight Risk Count',
        affected_count: talentRisks.flightRisk.length
      });
    }

    // Disengagement concerns
    if (talentRisks.disengaged.length > 0) {
      const disengagedPercentage = Math.round((talentRisks.disengaged.length / filteredUsers.length) * 100);
      strategicInsights.push({
        type: 'warning',
        category: 'engagement',
        title: `${talentRisks.disengaged.length} employees showing low engagement`,
        description: `${disengagedPercentage}% of employees have minimal platform activity in the past 60 days.`,
        priority: 'medium',
        impact_score: Math.min(talentRisks.disengaged.length * 5, 100),
        recommended_action: 'Launch re-engagement campaign and review manager effectiveness.',
        kpi: 'Disengaged Count',
        affected_count: talentRisks.disengaged.length
      });
    }

    // Department performance disparities
    if (departmentBreakdown.length > 1) {
      const highestDept = departmentBreakdown.reduce((max, d) => d.avgScore > max.avgScore ? d : max, departmentBreakdown[0]);
      const lowestDept = departmentBreakdown.reduce((min, d) => d.avgScore < min.avgScore ? d : min, departmentBreakdown[0]);
      const scoreDiff = highestDept.avgScore - lowestDept.avgScore;

      if (scoreDiff > 20) {
        strategicInsights.push({
          type: 'insight',
          category: 'organizational_health',
          title: `Significant performance gap between departments`,
          description: `${highestDept.name} (${highestDept.avgScore}%) outperforming ${lowestDept.name} (${lowestDept.avgScore}%) by ${scoreDiff}%.`,
          priority: 'medium',
          impact_score: scoreDiff,
          recommended_action: `Study ${highestDept.name}'s best practices and apply to ${lowestDept.name}.`,
          kpi: 'Dept Performance Gap'
        });
      }
    }

    // Assessment completion gaps
    if (orgMetrics.assessmentCompletionRate < 70) {
      strategicInsights.push({
        type: 'action_required',
        category: 'development_adoption',
        title: `Assessment completion needs improvement: ${orgMetrics.assessmentCompletionRate}%`,
        description: 'Baseline assessments are critical for personalized development. Current adoption is below target.',
        priority: 'high',
        impact_score: 100 - orgMetrics.assessmentCompletionRate,
        recommended_action: 'Launch organization-wide assessment campaign with manager accountability.',
        kpi: 'Assessment Completion Rate'
      });
    }

    // Goal completion trends
    if (orgMetrics.orgGoalCompletionRate >= 75) {
      strategicInsights.push({
        type: 'positive_trend',
        category: 'execution',
        title: `Strong goal execution: ${orgMetrics.orgGoalCompletionRate}%`,
        description: 'Organization is consistently achieving development goals.',
        priority: 'low',
        impact_score: orgMetrics.orgGoalCompletionRate,
        recommended_action: 'Recognize teams with highest completion rates and share best practices.',
        kpi: 'Org Goal Completion'
      });
    } else if (orgMetrics.orgGoalCompletionRate < 50) {
      strategicInsights.push({
        type: 'warning',
        category: 'execution',
        title: `Goal completion below expectations: ${orgMetrics.orgGoalCompletionRate}%`,
        description: 'Less than half of organizational goals are being completed on time.',
        priority: 'high',
        impact_score: 100 - orgMetrics.orgGoalCompletionRate,
        recommended_action: 'Review goal-setting frameworks and manager coaching on accountability.',
        kpi: 'Org Goal Completion'
      });
    }

    // Learning adoption
    if (orgMetrics.orgLearningCompletionRate >= 80) {
      strategicInsights.push({
        type: 'positive_trend',
        category: 'development_adoption',
        title: `Excellent learning engagement: ${orgMetrics.orgLearningCompletionRate}%`,
        description: 'Strong organizational commitment to continuous learning.',
        priority: 'low',
        impact_score: orgMetrics.orgLearningCompletionRate,
        recommended_action: 'Expand learning library and increase advanced development opportunities.',
        kpi: 'Learning Completion'
      });
    }

    // Skill gap analysis
    if (talentRisks.skillGaps.length > 0) {
      const skillGapPercentage = Math.round((talentRisks.skillGaps.length / filteredUsers.length) * 100);
      strategicInsights.push({
        type: 'insight',
        category: 'capability_development',
        title: `${talentRisks.skillGaps.length} employees with critical skill gaps`,
        description: `${skillGapPercentage}% of workforce has competencies below acceptable levels.`,
        priority: 'medium',
        impact_score: Math.min(talentRisks.skillGaps.length * 3, 100),
        recommended_action: 'Deploy targeted learning programs for most common skill gaps.',
        kpi: 'Skill Gap Count',
        affected_count: talentRisks.skillGaps.length
      });
    }

    // ROI and impact metrics
    const developmentROI = {
      investmentScore: 0,
      performanceImpact: 0,
      engagementImpact: 0,
      retentionImpact: 0,
      overallROI: 0
    };

    // Investment score based on platform usage
    const activeUsers = filteredUsers.filter(u => {
      const hasRecentAssessment = assessments.some(a => 
        a.email === u.email && 
        new Date(a.submission_ts) >= new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      );
      const hasActiveGoals = goals.some(g => 
        g.user_email === u.email && 
        ['active', 'at_risk', 'overdue'].includes(g.status)
      );
      const hasActiveLearning = assignedLearning.some(l => 
        l.user_email === u.email && 
        l.status !== 'completed'
      );
      return hasRecentAssessment || hasActiveGoals || hasActiveLearning;
    });

    developmentROI.investmentScore = filteredUsers.length > 0
      ? Math.round((activeUsers.length / filteredUsers.length) * 100)
      : 0;

    developmentROI.performanceImpact = orgMetrics.avgOrgScore;
    developmentROI.engagementImpact = 100 - Math.round((talentRisks.disengaged.length / filteredUsers.length) * 100);
    developmentROI.retentionImpact = 100 - Math.round((talentRisks.flightRisk.length / filteredUsers.length) * 100);
    
    developmentROI.overallROI = Math.round(
      (developmentROI.investmentScore * 0.2) +
      (developmentROI.performanceImpact * 0.3) +
      (developmentROI.engagementImpact * 0.25) +
      (developmentROI.retentionImpact * 0.25)
    );

    // Executive recommendations
    const executiveRecommendations = [];

    if (leadershipPipeline.successionCoverage < 60) {
      executiveRecommendations.push({
        priority: 'critical',
        title: 'Accelerate Leadership Pipeline',
        description: 'Succession coverage is below critical threshold. Fast-track high-potential development.',
        estimatedImpact: 'High',
        timeframe: '3-6 months',
        category: 'succession_planning'
      });
    }

    if (talentRisks.flightRisk.length > 0) {
      executiveRecommendations.push({
        priority: 'high',
        title: 'Implement Retention Strategy for High Performers',
        description: `${talentRisks.flightRisk.length} high performers showing disengagement. Immediate intervention needed.`,
        estimatedImpact: 'High',
        timeframe: '1-3 months',
        category: 'talent_retention'
      });
    }

    if (departmentBreakdown.length > 1) {
      const lowestDept = departmentBreakdown.reduce((min, d) => d.avgScore < min.avgScore ? d : min, departmentBreakdown[0]);
      if (lowestDept.avgScore < 60) {
        executiveRecommendations.push({
          priority: 'high',
          title: `Targeted Development for ${lowestDept.name}`,
          description: `${lowestDept.name} performance significantly below org average. Deploy focused interventions.`,
          estimatedImpact: 'Medium',
          timeframe: '3-6 months',
          category: 'organizational_health'
        });
      }
    }

    if (orgMetrics.assessmentCompletionRate < 70) {
      executiveRecommendations.push({
        priority: 'medium',
        title: 'Drive Assessment Adoption',
        description: 'Increase leadership assessment completion to establish development baselines.',
        estimatedImpact: 'Medium',
        timeframe: '1-2 months',
        category: 'development_adoption'
      });
    }

    if (developmentROI.overallROI >= 80) {
      executiveRecommendations.push({
        priority: 'low',
        title: 'Scale Successful Development Programs',
        description: 'Strong ROI metrics indicate effective programs. Consider expanding reach and budget.',
        estimatedImpact: 'High',
        timeframe: '6-12 months',
        category: 'program_expansion'
      });
    }

    const responseData = {
      success: true,
      data: {
        orgMetrics,
        departmentBreakdown,
        leadershipPipeline,
        talentRisks,
        strategicInsights: strategicInsights.slice(0, 10),
        developmentROI,
        executiveRecommendations: executiveRecommendations.slice(0, 8)
      }
    };

    console.log('[getOrgLeaderInsights] Successfully generated org leader insights');
    return Response.json(responseData);

  } catch (error) {
    console.error('[getOrgLeaderInsights] Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});