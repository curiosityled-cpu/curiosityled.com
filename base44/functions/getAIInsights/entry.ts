import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate and authorize
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ 
        success: false, 
        error: 'Unauthorized - Authentication required' 
      }, { status: 401 });
    }

    // Only Platform Admin and Super Admin can access AI insights
    if (user.app_role !== 'Platform Admin' && user.app_role !== 'Super Administrator') {
      return Response.json({ 
        success: false, 
        error: 'Unauthorized - Platform Admin or Super Admin only' 
      }, { status: 403 });
    }

    console.log('Fetching AI insights for:', user.email, user.app_role);

    // Parse filters from request body
    const body = await req.json().catch(() => ({}));
    const {
      time_range = '30d',
      client_id = 'all',
      department = 'all',
      focus_area = 'all'
    } = body;

    // Calculate date cutoff
    const getCutoffDate = (range) => {
      const now = new Date();
      switch(range) {
        case '7d': return new Date(now.setDate(now.getDate() - 7));
        case '30d': return new Date(now.setDate(now.getDate() - 30));
        case '90d': return new Date(now.setDate(now.getDate() - 90));
        case '12mo': return new Date(now.setFullYear(now.getFullYear() - 1));
        case 'all': return new Date(0);
        default: return new Date(now.setDate(now.getDate() - 30));
      }
    };
    
    const cutoffDate = getCutoffDate(time_range);

    // Fetch all data using regular entity access
    const [users, clients, assessments, goals, assignedLearning, activityLogs] = await Promise.all([
      base44.entities.User.list().catch(() => []),
      base44.entities.Client.list().catch(() => []),
      base44.entities.Assessment.list().catch(() => []),
      base44.entities.Goal.list().catch(() => []),
      base44.entities.AssignedLearning.list().catch(() => []),
      base44.entities.ActivityLog.list('-timestamp', 100).catch(() => [])
    ]);

    // Apply role-based filtering
    let scopedUsers = users;
    let scopedClients = clients;
    let scopedAssessments = assessments;
    let scopedGoals = goals;
    let scopedAssignedLearning = assignedLearning;

    if (user.app_role === 'Super Administrator') {
      // Super Admin: Only their organization and partner clients
      if (user.client_id) {
        const currentClient = clients.find(c => c.id === user.client_id);
        
        if (currentClient?.type === 'partner_client' && currentClient.partner_id) {
          scopedClients = clients.filter(c => c.partner_id === currentClient.partner_id);
        } else {
          scopedClients = clients.filter(c => c.id === user.client_id);
        }
        
        const clientIds = scopedClients.map(c => c.id);
        scopedUsers = users.filter(u => clientIds.includes(u.client_id));
        
        const userEmails = scopedUsers.map(u => u.email);
        scopedAssessments = assessments.filter(a => userEmails.includes(a.email));
        scopedGoals = goals.filter(g => userEmails.includes(g.user_email));
        scopedAssignedLearning = assignedLearning.filter(al => userEmails.includes(al.user_email));
      }
    }

    // Apply user-selected filters
    if (client_id !== 'all') {
      scopedUsers = scopedUsers.filter(u => u.client_id === client_id);
      const userEmails = scopedUsers.map(u => u.email);
      scopedAssessments = scopedAssessments.filter(a => userEmails.includes(a.email));
      scopedGoals = scopedGoals.filter(g => userEmails.includes(g.user_email));
      scopedAssignedLearning = scopedAssignedLearning.filter(al => userEmails.includes(al.user_email));
    }

    if (department !== 'all') {
      const departmentUsers = scopedUsers.filter(u => u.department === department);
      const userEmails = departmentUsers.map(u => u.email);
      scopedAssessments = scopedAssessments.filter(a => userEmails.includes(a.email));
      scopedGoals = scopedGoals.filter(g => userEmails.includes(g.user_email));
      scopedAssignedLearning = scopedAssignedLearning.filter(al => userEmails.includes(al.user_email));
    }

    // Filter by time range
    scopedAssessments = scopedAssessments.filter(a => new Date(a.created_date) >= cutoffDate);
    scopedGoals = scopedGoals.filter(g => new Date(g.created_date) >= cutoffDate);
    scopedAssignedLearning = scopedAssignedLearning.filter(al => new Date(al.created_date) >= cutoffDate);

    // Calculate comprehensive metrics
    const totalUsers = scopedUsers.length;
    const atRiskUsers = scopedUsers.filter(u => u.at_risk_flag).length;
    
    const avgAssessmentScore = scopedAssessments.length > 0
      ? Math.round(scopedAssessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / scopedAssessments.length)
      : 0;

    const completedGoals = scopedGoals.filter(g => g.status === 'completed').length;
    const goalCompletionRate = scopedGoals.length > 0
      ? Math.round((completedGoals / scopedGoals.length) * 100)
      : 0;

    const completedLearning = scopedAssignedLearning.filter(al => al.status === 'completed').length;
    const learningCompletionRate = scopedAssignedLearning.length > 0
      ? Math.round((completedLearning / scopedAssignedLearning.length) * 100)
      : 0;

    // Generate AI insights using LLM
    let keyInsights = [];
    try {
      const insightsPrompt = `Analyze the following organizational data and provide 3-5 actionable insights:

Total Users: ${totalUsers}
At-Risk Users: ${atRiskUsers}
Average Assessment Score: ${avgAssessmentScore}%
Goal Completion Rate: ${goalCompletionRate}%
Learning Completion Rate: ${learningCompletionRate}%
Total Goals: ${scopedGoals.length}
Total Learning Assignments: ${scopedAssignedLearning.length}

Provide insights in the following JSON format:
{
  "insights": [
    {
      "title": "Short title",
      "description": "2-3 sentence description",
      "category": "leadership_development|engagement|learning_effectiveness|goal_achievement",
      "priority": "high|medium|low",
      "impact_score": 0-100,
      "recommended_action": "Specific actionable recommendation"
    }
  ]
}`;

      const llmResponse = await base44.integrations.Core.InvokeLLM({
        prompt: insightsPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string" },
                  priority: { type: "string" },
                  impact_score: { type: "number" },
                  recommended_action: { type: "string" }
                }
              }
            }
          }
        }
      });

      keyInsights = llmResponse.insights || [];
    } catch (error) {
      console.error('Error generating AI insights:', error);
      // Provide fallback insights
      keyInsights = [
        {
          title: "Assessment Engagement",
          description: `${scopedAssessments.length} assessments completed with an average score of ${avgAssessmentScore}%. This provides a good baseline for development planning.`,
          category: "learning_effectiveness",
          priority: "medium",
          impact_score: 65,
          recommended_action: "Continue encouraging assessment participation to track progress over time."
        }
      ];
    }

    // Leadership Pipeline Analysis
    const leadershipUsers = scopedUsers.filter(u => 
      ['User Level 2', 'User Level 3'].includes(u.app_role)
    );
    
    const leadershipAssessments = scopedAssessments.filter(a => {
      const userInfo = scopedUsers.find(u => u.email === a.email);
      return userInfo && ['User Level 2', 'User Level 3'].includes(userInfo.app_role);
    });

    const avgLeadershipScore = leadershipAssessments.length > 0
      ? Math.round(leadershipAssessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / leadershipAssessments.length)
      : 0;

    const successionReady = leadershipAssessments.filter(a => a.overall_pct >= 75).length;
    const successionReadinessScore = leadershipUsers.length > 0
      ? Math.round((successionReady / leadershipUsers.length) * 100)
      : 0;

    // Engagement Risks
    const engagementRisks = {
      atRiskUsers: scopedUsers.filter(u => u.at_risk_flag).map(u => ({
        full_name: u.full_name,
        email: u.email,
        department: u.department,
        reason: u.at_risk_reason,
        flagged_date: u.at_risk_flagged_date
      }))
    };

    // Activity Trends (last 30 days)
    const trends = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayAssessments = scopedAssessments.filter(a => {
        const aDate = new Date(a.created_date).toISOString().split('T')[0];
        return aDate === dateStr;
      }).length;
      
      const dayGoals = scopedGoals.filter(g => {
        const gDate = new Date(g.created_date).toISOString().split('T')[0];
        return gDate === dateStr;
      }).length;
      
      const dayLearning = scopedAssignedLearning.filter(al => {
        const alDate = new Date(al.created_date).toISOString().split('T')[0];
        return alDate === dateStr;
      }).length;
      
      trends.push({
        month: dateStr,
        assessments: dayAssessments,
        goals: dayGoals,
        learning: dayLearning
      });
    }

    // Priority Recommendations
    const recommendations = [];
    
    if (atRiskUsers > 0) {
      recommendations.push({
        title: "Address At-Risk Team Members",
        description: `${atRiskUsers} team members are flagged as at-risk. Early intervention can prevent turnover and performance decline.`,
        impact: "high",
        effort: "standard",
        affected_count: atRiskUsers
      });
    }

    if (goalCompletionRate < 70) {
      recommendations.push({
        title: "Improve Goal Achievement",
        description: `Goal completion rate is ${goalCompletionRate}%. Consider providing additional support or adjusting goal-setting processes.`,
        impact: "high",
        effort: "standard",
        affected_count: scopedGoals.length
      });
    }

    if (learningCompletionRate < 70) {
      recommendations.push({
        title: "Boost Learning Engagement",
        description: `Learning completion rate is ${learningCompletionRate}%. Review assignment relevance and provide completion incentives.`,
        impact: "medium",
        effort: "quick_win",
        affected_count: scopedAssignedLearning.length
      });
    }

    // Anomalies Detection
    const anomalies = [];
    
    // Check for departments with low assessment scores
    const deptScores = {};
    scopedAssessments.forEach(a => {
      const userInfo = scopedUsers.find(u => u.email === a.email);
      if (userInfo?.department) {
        if (!deptScores[userInfo.department]) {
          deptScores[userInfo.department] = { total: 0, count: 0 };
        }
        deptScores[userInfo.department].total += a.overall_pct || 0;
        deptScores[userInfo.department].count++;
      }
    });

    Object.entries(deptScores).forEach(([dept, data]) => {
      const avg = data.count > 0 ? data.total / data.count : 0;
      if (avg < 60 && data.count >= 3) {
        anomalies.push({
          department: dept,
          metric: "Assessment Score",
          value: `${Math.round(avg)}%`,
          expected: "70%+",
          severity: "high"
        });
      }
    });

    return Response.json({
      success: true,
      data: {
        metrics: {
          totalUsers,
          atRiskUsers,
          avgAssessmentScore,
          goalCompletionRate,
          learningCompletionRate
        },
        keyInsights,
        leadershipPipeline: {
          totalLeaders: leadershipUsers.length,
          avgLeadershipScore,
          successionReady,
          successionReadinessScore,
          developmentGaps: []
        },
        engagementRisks,
        trends,
        recommendations,
        anomalies
      }
    });

  } catch (error) {
    console.error('Error in getAIInsights:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Failed to fetch AI insights' 
    }, { status: 500 });
  }
});