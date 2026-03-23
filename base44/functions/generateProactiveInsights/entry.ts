import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Proactive Insights Engine
 * Analyzes user/org data to generate actionable, timely insights for Atreus
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scope = 'personal' } = await req.json();

    const insights = [];

    // Goals at risk
    const goals = scope === 'personal' 
      ? await base44.entities.Goal.filter({ created_by: user.email })
      : await base44.entities.Goal.list();

    const now = new Date();
    const atRiskGoals = goals.filter(g => {
      if (!g.timeframe_end || g.status === 'archived') return false;
      const dueDate = new Date(g.timeframe_end);
      const daysUntilDue = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
      const progress = g.progress || 0;
      return daysUntilDue <= 7 && daysUntilDue >= 0 && progress < 70;
    });

    if (atRiskGoals.length > 0) {
      insights.push({
        type: 'goals_at_risk',
        priority: 'high',
        message: `${atRiskGoals.length} goal${atRiskGoals.length > 1 ? 's are' : ' is'} at risk of missing deadline`,
        action_suggestion: 'Review and update progress on these goals',
        entity_ids: atRiskGoals.map(g => g.id)
      });
    }

    // Overdue learning
    const assignedLearning = scope === 'personal'
      ? await base44.entities.AssignedLearning.filter({ user_email: user.email })
      : await base44.entities.AssignedLearning.list();

    const overdueLearning = assignedLearning.filter(l => {
      if (!l.due_date || l.status === 'completed') return false;
      return new Date(l.due_date) < now;
    });

    if (overdueLearning.length > 0) {
      insights.push({
        type: 'learning_overdue',
        priority: 'medium',
        message: `${overdueLearning.length} learning assignment${overdueLearning.length > 1 ? 's are' : ' is'} overdue`,
        action_suggestion: 'Complete overdue learning or adjust deadlines',
        entity_ids: overdueLearning.map(l => l.id)
      });
    }

    // Team members needing attention (for managers)
    if (user.subordinate_emails && user.subordinate_emails.length > 0 && scope !== 'personal') {
      const teamGoals = await base44.entities.Goal.filter({
        created_by: { $in: user.subordinate_emails }
      });

      const teamMembersWithIssues = new Set();
      teamGoals.forEach(g => {
        if (g.progress < 30 || (g.timeframe_end && new Date(g.timeframe_end) < now && g.status !== 'archived')) {
          teamMembersWithIssues.add(g.created_by);
        }
      });

      if (teamMembersWithIssues.size > 0) {
        insights.push({
          type: 'team_needs_attention',
          priority: 'high',
          message: `${teamMembersWithIssues.size} team member${teamMembersWithIssues.size > 1 ? 's need' : ' needs'} attention`,
          action_suggestion: 'Schedule check-ins with struggling team members',
          affected_emails: Array.from(teamMembersWithIssues)
        });
      }
    }

    // Upcoming assessments
    const notifications = await base44.entities.Notification.filter({
      user_email: user.email,
      type: 'assessment_due',
      is_read: false
    });

    if (notifications.length > 0) {
      insights.push({
        type: 'upcoming_assessment',
        priority: 'medium',
        message: 'You have an upcoming assessment',
        action_suggestion: 'Complete your assessment to get personalized insights'
      });
    }

    // Learning recommendations based on competency gaps
    const assessments = await base44.entities.Assessment.filter({ 
      email: user.email 
    }, '-submission_ts', 1);

    if (assessments.length > 0) {
      const latestAssessment = assessments[0];
      const lowestCompetencies = [];

      // Find lowest scoring competencies
      ['si_pct', 'dm_pct', 'comm_pct', 'rm_pct', 'sm_pct', 'pm_pct'].forEach(field => {
        if (latestAssessment[field] && latestAssessment[field] < 70) {
          lowestCompetencies.push({ field, score: latestAssessment[field] });
        }
      });

      if (lowestCompetencies.length > 0) {
        lowestCompetencies.sort((a, b) => a.score - b.score);
        const lowest = lowestCompetencies[0];
        const competencyNames = {
          'si_pct': 'Situational Intelligence',
          'dm_pct': 'Decision Making',
          'comm_pct': 'Communication',
          'rm_pct': 'Resource Management',
          'sm_pct': 'Stakeholder Management',
          'pm_pct': 'Performance Management'
        };

        // Find relevant learning resources for this competency
        const resources = await base44.entities.LearningResource.filter({
          competencies: { $in: [competencyNames[lowest.field]] },
          is_active: true
        }, null, 3);

        insights.push({
          type: 'learning_opportunity',
          priority: 'medium',
          message: `Development opportunity in ${competencyNames[lowest.field]} (${lowest.score}%)`,
          action_suggestion: resources.length > 0 
            ? `Explore ${resources.length} recommended resources for ${competencyNames[lowest.field]}`
            : `Find learning resources to strengthen ${competencyNames[lowest.field]}`,
          competency: competencyNames[lowest.field],
          score: lowest.score,
          recommended_resources: resources.map(r => ({ id: r.id, title: r.title }))
        });
      }
    }

    // Upcoming deadlines across all entities
    const upcomingDeadlines = [];
    
    // Check upcoming goal deadlines
    const upcomingGoals = goals.filter(g => {
      if (!g.timeframe_end || g.status === 'archived') return false;
      const dueDate = new Date(g.timeframe_end);
      const daysUntilDue = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
      return daysUntilDue > 0 && daysUntilDue <= 14;
    });

    if (upcomingGoals.length > 0) {
      insights.push({
        type: 'upcoming_deadlines',
        priority: 'low',
        message: `${upcomingGoals.length} goal${upcomingGoals.length > 1 ? 's' : ''} due in next 2 weeks`,
        action_suggestion: 'Review upcoming goal deadlines and plan your time',
        entity_ids: upcomingGoals.map(g => g.id)
      });
    }

    // Unstarted assigned learning
    const unstartedLearning = assignedLearning.filter(l => l.status === 'assigned');
    if (unstartedLearning.length > 0) {
      insights.push({
        type: 'unstarted_learning',
        priority: 'low',
        message: `${unstartedLearning.length} learning assignment${unstartedLearning.length > 1 ? 's' : ''} not yet started`,
        action_suggestion: 'Begin your assigned learning to stay on track',
        entity_ids: unstartedLearning.map(l => l.id)
      });
    }

    return Response.json({
      success: true,
      insights: insights,
      count: insights.length,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating insights:', error);
    return Response.json({ 
      error: error.message,
      insights: [],
      count: 0
    }, { status: 500 });
  }
});