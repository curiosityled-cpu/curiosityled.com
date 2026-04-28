/**
 * Contextual greeting generator for Atreus coach.
 * Extracted to keep AtreusCoach.jsx under the line limit.
 */

export function getContextualGreeting(context, appRole) {
  const userName = context?.user_name?.split(' ')[0] || 'there';
  const pageType = context?.pageType || 'unknown';
  const userRole = context?.userRole || 'User';
  const viewportFocus = context?.viewport_focus || {};
  const visibleData = context?.visible_data_summary || {};
  const pageInsights = context?.page_specific_insights || {};

  // Viewport-aware greetings
  if (viewportFocus.focused_section) {
    const sectionLabels = viewportFocus.section_labels || {};
    const sectionLabel = sectionLabels[viewportFocus.focused_section] || viewportFocus.focused_section;

    switch (viewportFocus.focused_section) {
      case 'section-metrics':
      case 'section-top-metrics':
      case 'section-overview-metrics':
        return `Hi ${userName}! I see you're reviewing ${sectionLabel.toLowerCase()}. Let me help you interpret these insights.`;
      case 'section-assessment':
        return `Welcome ${userName}! Looking at your assessment section. Ready to discuss your development areas?`;
      case 'section-team':
      case 'section-team-summary':
        return `Hi ${userName}! I see you're reviewing your team. Want to discuss development priorities or interventions?`;
      case 'section-competency-impact':
      case 'section-competency-breakdown':
        return `Hello ${userName}! Analyzing competencies with you. Which area would you like to focus on?`;
      case 'section-strategic-risks':
        return `Hi ${userName}! I see you're reviewing strategic risks. Let's discuss mitigation strategies.`;
      case 'section-succession-pipeline':
        return `Welcome ${userName}! Looking at succession planning. Want to identify high-potential leaders?`;
      case 'section-learning':
        return `Hi ${userName}! I see you're in the learning section. Need recommendations or want to track progress?`;
      case 'section-goals':
        return `Hello ${userName}! Reviewing your goals? Let's make sure you're on track.`;
      case 'section-programs':
        return `Hi ${userName}! Looking at programs overview. Need help with deployment or analytics?`;
      default:
        break;
    }
  }

  // Page-specific greetings with data awareness
  switch (pageType) {
    case 'dashboard':
      if (userRole === 'User Level 1') {
        if (!visibleData.has_assessment) {
          return `Hi ${userName}! 👋 Ready to discover your leadership strengths? Let's start with an assessment.`;
        }
        return `Welcome back, ${userName}! I can help you generate reports, get personalized learning recommendations, or schedule coaching sessions.`;
      } else if (userRole === 'User Level 2') {
        return `Hi ${userName}! Managing ${visibleData.team_size || 0} team members. I can generate team reports, recommend learning paths, or help schedule team check-ins.`;
      } else if (userRole === 'User Level 3') {
        return `Welcome, ${userName}! I can generate organizational reports, provide strategic insights, and help schedule leadership reviews.`;
      } else if (userRole === 'Admin Level 1') {
        return `Hi ${userName}! I can generate program reports, recommend learning resources for cohorts, and help schedule coaching sessions.`;
      } else if (userRole === 'Admin Level 2' || userRole === 'Super Administrator') {
        return `Welcome, ${userName}! I can generate platform analytics, provide learning recommendations, and help coordinate team meetings.`;
      }
      return `Hi ${userName}! How can I help you today?`;

    case 'learning-library': {
      const filters = context?.current_filters || {};
      if (filters.competency && filters.competency.length > 0) {
        return `Hi ${userName}! I see you're exploring ${filters.competency.join(', ')} resources. Want personalized recommendations?`;
      }
      if (filters.search) {
        return `Hi ${userName}! Searching for "${filters.search}"? Let me help you find the best resources.`;
      }
      return `Hi ${userName}! Ready to explore learning resources? Tell me what you're looking to develop.`;
    }

    case 'goals-overview': {
      const atRiskCount = visibleData.at_risk_goals || 0;
      const pendingCount = visibleData.pending_acceptance_goals || 0;
      if (atRiskCount > 0) {
        return `Hi ${userName}! I notice ${atRiskCount} goal${atRiskCount > 1 ? 's' : ''} need${atRiskCount === 1 ? 's' : ''} attention. Want to discuss action plans?`;
      }
      if (pendingCount > 0) {
        return `Hi ${userName}! You have ${pendingCount} goal${pendingCount > 1 ? 's' : ''} awaiting your response. Need help reviewing them?`;
      }
      return `Hi ${userName}! Let's work on your goals. Ready to track progress or set new objectives?`;
    }

    case 'career-path-explorer': {
      const targetRole = visibleData.target_role;
      const readinessScore = visibleData.readiness_score;
      if (targetRole && readinessScore !== undefined) {
        return `Hi ${userName}! I see you're exploring the ${targetRole} role (${readinessScore}% ready). Let's build your development path.`;
      }
      return `Hi ${userName}! Ready to explore your next career move? Let's assess your readiness and plan your path.`;
    }

    case 'onboarding-builder': {
      const planStatus = pageInsights.plan_ready_to_deploy ? 'ready to deploy' :
        pageInsights.needs_assignee ? 'ready for assignment' :
        pageInsights.needs_generation ? 'ready to generate' : 'in progress';
      return `Hi ${userName}! Your onboarding plan is ${planStatus}. How can I help you refine it?`;
    }

    case 'hr-assessment-dashboard':
      return `Hi ${userName}! You have ${visibleData.total_assessments || 0} assessments with ${visibleData.completion_rate || 0}% completion. Ready to analyze results?`;

    case 'enterprise_analytics':
      return `Hi ${userName}! Analyzing ${visibleData.total_leaders || 0} leaders (Avg SI: ${visibleData.avg_leadership_score || 0}%). What strategic insights do you need?`;

    case 'command-center':
      if (userRole === 'User Level 2') return `Hi ${userName}! Ready to review team performance and deploy interventions?`;
      if (userRole === 'Admin Level 1') return `Hi ${userName}! Let's review program performance and participant progress.`;
      return `Hi ${userName}! Ready to dive into team analytics and insights?`;

    case 'profile': {
      const profileCompletion = pageInsights.profile_completion_percentage || 0;
      if (profileCompletion < 100) {
        return `Hi ${userName}! Your profile is ${profileCompletion}% complete. Want to finish it for better recommendations?`;
      }
      return `Hi ${userName}! Your profile looks great. Ready to update your development preferences?`;
    }

    case 'assessment-taking':
      return `Hi ${userName}! Taking your assessment? I'll be here when you finish to discuss your results.`;

    case 'assessment-results':
      return `Hi ${userName}! Congratulations on completing your assessment (${visibleData.overall_score || 0}%)! Let's explore your results together.`;

    case 'user-management': {
      const selectedCount = visibleData.selected_count || 0;
      if (selectedCount > 0) {
        return `Hi ${userName}! You've selected ${selectedCount} user${selectedCount > 1 ? 's' : ''}. Ready for bulk actions?`;
      }
      return `Hi ${userName}! Managing ${visibleData.total_users || 0} users. How can I help with user administration?`;
    }

    case 'settings':
      return `Hi ${userName}! Let's configure your preferences. What would you like to update?`;

    case 'notifications': {
      const unreadCount = visibleData.unread_notifications || 0;
      if (unreadCount > 0) {
        return `Hi ${userName}! You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}. Want me to summarize them?`;
      }
      return `Hi ${userName}! All caught up on notifications. Is there anything else I can help with?`;
    }

    case 'my-journeys-overview':
      return `Hi ${userName}! You're enrolled in ${visibleData.active_journeys || 0} learning journey${(visibleData.active_journeys || 0) !== 1 ? 's' : ''}. Ready to continue your path?`;

    case 'journey-builder':
      return `Hi ${userName}! Building a learning journey? I can help you structure content and select resources.`;

    case 'onboarding-progress':
      return `Hi ${userName}! You're ${visibleData.progress_percentage || 0}% through your onboarding. Let's keep the momentum going!`;

    case 'billing':
      return `Hi ${userName}! Need help with billing or subscription questions? I'm here to assist.`;

    case 'business-manager':
      return `Hi ${userName}! Ready to manage clients, partners, and organizational settings?`;

    default:
      if (userRole === 'Platform Admin') return `Hi ${userName}! Platform admin at your service. What would you like to manage today?`;
      if (userRole === 'Super Administrator') return `Hi ${userName}! Organization admin ready. How can I help manage your platform?`;
      if (userRole === 'Partner Business Administrator') return `Hi ${userName}! Partner admin here. Ready to manage client organizations?`;
      return `Hi ${userName}! I'm Atreus, your AI leadership coach. How can I help you today?`;
  }
}

export function getProactiveCalendarSuggestions(context, appRole) {
  const calendarSuggestions = [];
  const visibleData = context?.visible_data_summary || {};
  const pageType = context?.pageType || 'unknown';

  if (visibleData.goals_approaching_deadline > 0) {
    calendarSuggestions.push({
      text: `Schedule goal review (${visibleData.goals_approaching_deadline} goals due soon)`,
      icon: '📅',
      suggestedEvent: { title: "Goal Review Session", description: "Review progress on goals approaching their deadline", event_type: "goal_review", duration_minutes: 30 }
    });
  }

  if ((appRole === 'User Level 2' || appRole === 'Admin Level 1') && visibleData.team_members_needing_attention > 0) {
    calendarSuggestions.push({
      text: `Schedule team check-ins (${visibleData.team_members_needing_attention} need attention)`,
      icon: '👥',
      suggestedEvent: { title: "Team Performance Check-in", description: "Review development progress with team members", event_type: "one_on_one", duration_minutes: 30 }
    });
  }

  if (pageType === 'assessment-results' || (visibleData.has_recent_assessment && !visibleData.has_scheduled_debrief)) {
    calendarSuggestions.push({
      text: 'Schedule assessment debrief session',
      icon: '🎯',
      suggestedEvent: { title: "Assessment Results Debrief", description: "Discuss assessment insights and create development plan", event_type: "coaching_session", duration_minutes: 60 }
    });
  }

  const currentMonth = new Date().getMonth();
  if ([2, 5, 8, 11].includes(currentMonth) && !visibleData.has_scheduled_quarterly_review) {
    calendarSuggestions.push({
      text: 'Schedule quarterly development review',
      icon: '📊',
      suggestedEvent: { title: "Quarterly Development Review", description: "Review progress, update goals, and plan next quarter", event_type: "review_meeting", duration_minutes: 90 }
    });
  }

  if ((appRole === 'User Level 2' || appRole === 'Admin Level 1' || appRole === 'Admin Level 2') && pageType === 'command-center') {
    calendarSuggestions.push({
      text: 'Schedule team development planning',
      icon: '🗓️',
      suggestedEvent: { title: "Team Development Planning Session", description: "Strategic planning for team growth and development", event_type: "team_checkin", duration_minutes: 60 }
    });
  }

  return calendarSuggestions;
}

export function getContextualSuggestions(context, appRole, userPermissions, allowedTools) {
  const pageType = context?.pageType || 'unknown';
  const filters = context?.current_filters || {};
  const visibleData = context?.visible_data_summary || {};
  const pageInsights = context?.page_specific_insights || {};
  const availableActions = context?.available_actions || [];
  const viewportFocus = context?.viewport_focus || {};

  let suggestions = [];

  // Proactive insights-based suggestions (highest priority)
  const proactiveInsights = context?.proactive_insights || [];
  if (proactiveInsights.length > 0) {
    proactiveInsights.slice(0, 2).forEach(insight => {
      suggestions.push({
        text: insight.action_suggestion || insight.message,
        icon: insight.type === 'goals_at_risk' ? '⚠️' :
              insight.type === 'learning_overdue' ? '📚' :
              insight.type === 'team_needs_attention' ? '👥' :
              insight.type === 'upcoming_assessment' ? '📊' :
              insight.type === 'learning_opportunity' ? '💡' : '✨',
        priority: insight.priority
      });
    });
  }

  // Proactive calendar suggestions
  const calendarSuggestions = getProactiveCalendarSuggestions(context, appRole);
  if (calendarSuggestions.length > 0 && suggestions.length < 4) {
    suggestions.push(calendarSuggestions[0]);
  }

  // Viewport-specific suggestions
  if (viewportFocus.focused_section) {
    const sectionLabel = viewportFocus.section_labels?.[viewportFocus.focused_section] || viewportFocus.focused_section;
    switch (viewportFocus.focused_section) {
      case 'section-metrics':
      case 'section-top-metrics':
      case 'section-overview-metrics':
        suggestions.push({ text: `Explain these ${sectionLabel.toLowerCase()} metrics`, icon: '📊' });
        suggestions.push({ text: 'What trends should I focus on?', icon: '📈' });
        break;
      case 'section-assessment':
        suggestions.push({ text: 'How can I improve my scores?', icon: '🎯' });
        suggestions.push({ text: 'Compare my results to peers', icon: '👥' });
        break;
      case 'section-team':
      case 'section-team-summary':
      case 'section-team-grid':
        suggestions.push({ text: 'Identify team development priorities', icon: '👨‍👩‍👧‍👦' });
        suggestions.push({ text: 'Who needs immediate attention?', icon: '🚨' });
        break;
      case 'section-competency-impact':
      case 'section-competency-breakdown':
        suggestions.push({ text: 'Which competency should we prioritize?', icon: '🧠' });
        suggestions.push({ text: 'Show me development resources', icon: '📚' });
        break;
      case 'section-strategic-risks':
        suggestions.push({ text: 'Help me create a risk mitigation plan', icon: '🛡️' });
        suggestions.push({ text: 'What actions should I take first?', icon: '🔥' });
        break;
      case 'section-succession-pipeline':
        suggestions.push({ text: 'Identify high-potential leaders', icon: '🌱' });
        suggestions.push({ text: 'Build succession development plans', icon: '🪜' });
        break;
      case 'section-learning':
        suggestions.push({ text: 'Recommend relevant learning', icon: '🎓' });
        suggestions.push({ text: 'Track my learning progress', icon: '📈' });
        break;
      case 'section-goals':
        suggestions.push({ text: 'Help me set SMART goals', icon: '🏆' });
        suggestions.push({ text: 'Review my goal progress', icon: '📅' });
        break;
      default:
        break;
    }
  }

  // Available actions
  if (availableActions.length > 0) {
    const actionMap = {
      assign_learning: { text: 'Assign learning to my team', icon: '🧑‍🏫' },
      clear_filters: { text: 'Clear all filters', icon: '🧹' },
      get_recommendations: { text: 'Get learning recommendations', icon: '💡' },
      create_user: { text: 'Add a new user', icon: '➕' },
      review_at_risk: { text: 'Review at-risk users', icon: '⚠️' },
      export_pdf: { text: 'Download assessment PDF', icon: '📥' },
      create_development_plan: { text: 'Create development plan', icon: '📈' },
      browse_learning: { text: 'Find learning resources', icon: '📚' },
      edit_profile: { text: 'Update my profile', icon: '✏️' },
      configure_ai_coach: { text: 'Customize AI coach settings', icon: '⚙️' },
      connect_teams: { text: 'Connect Microsoft Teams', icon: '🔗' },
      connect_slack: { text: 'Connect Slack', icon: '🔗' },
    };
    availableActions.forEach(action => {
      if (action.action === 'bulk_assign_roles') {
        suggestions.push({ text: `Assign roles to ${context.selected_items?.length || 0} users`, icon: '👥' });
      } else if (action.action === 'complete_profile') {
        suggestions.push({ text: `Complete profile (${pageInsights.missing_fields || 0} fields left)`, icon: '✅' });
      } else if (actionMap[action.action]) {
        suggestions.push(actionMap[action.action]);
      } else {
        suggestions.push({ text: action.description || 'Take action', icon: '⚡' });
      }
    });
  }

  // Page-specific suggestions
  switch (pageType) {
    case 'learning-library':
      if (filters.activeFiltersCount === 0 && pageInsights.user_assessment_available) suggestions.push({ text: 'Show me recommended resources', icon: '✨' });
      if (visibleData.filtered_resources === 0 && filters.activeFiltersCount > 0) suggestions.push({ text: 'Adjust my search filters', icon: '🔍' });
      break;
    case 'user-management':
      if (visibleData.at_risk_users > 0) suggestions.push({ text: `Create intervention plan for ${visibleData.at_risk_users} at-risk users`, icon: '🚨' });
      if (context.selected_items?.length > 0) suggestions.push({ text: `Bulk actions for ${context.selected_items.length} selected users`, icon: '🛠️' });
      break;
    case 'assessment-results':
      if (visibleData.lowest_competency && pageInsights.ready_for_export) suggestions.push({ text: `Find ${visibleData.lowest_competency.name} development resources`, icon: '📚' });
      if (pageInsights.succession_readiness === 'needs_development') suggestions.push({ text: 'Create 90-day development plan', icon: '📅' });
      break;
    case 'profile':
      if (pageInsights.profile_completeness < 100) suggestions.push({ text: 'Help me complete my profile', icon: '👤' });
      break;
    case 'settings':
      if (visibleData.active_tab === 'notifications' && !pageInsights.notification_preferences_set) suggestions.push({ text: 'Set up my notification preferences', icon: '🔔' });
      break;
    case 'goals-overview':
      if (visibleData.at_risk_goals > 0) suggestions.push({ text: `Review ${visibleData.at_risk_goals} at-risk goals`, icon: '⚠️' });
      if (visibleData.active_goals === 0) suggestions.push({ text: 'Help me create my first goal', icon: '🎯' });
      break;
    case 'dashboard':
      if (allowedTools.generateReport) suggestions.push({ text: 'Generate a performance report', icon: '📊' });
      if (allowedTools.getUserAchievements) suggestions.push({ text: 'Show my gamification progress', icon: '🏆' });
      suggestions.push({ text: 'Recommend learning for my goals', icon: '📚' }, { text: 'What should I focus on this week?', icon: '💡' });
      if (allowedTools.scheduleCalendarEvent) suggestions.push({ text: 'Schedule a coaching session', icon: '📅' });
      break;
    case 'achievements':
      if (allowedTools.explainBadgeCriteria) suggestions.push({ text: 'How do I earn more badges?', icon: '🎖️' });
      suggestions.push({ text: 'Show me ways to level up faster', icon: '⚡' }, { text: "What's my leaderboard standing?", icon: '🏅' }, { text: 'Explain my recent point activities', icon: '📈' });
      break;
    case 'gamification-manager':
      if (allowedTools.designBadgeStructure) suggestions.push({ text: 'Design badges for our new manager program', icon: '🎨' });
      if (allowedTools.suggestPointAwards) suggestions.push({ text: 'Suggest point values for activities', icon: '💰' });
      if (allowedTools.createCompetition) suggestions.push({ text: 'Create a quarterly learning competition', icon: '🏆' });
      break;
    case 'enterprise_analytics': {
      const metrics = context.metrics_snapshot || {};
      const risks = context.risk_summary || {};
      if (metrics.insights?.at_risk_status === 'high') suggestions.push({ text: `Address ${metrics.at_risk} at-risk leaders`, icon: "⚠️" });
      if (risks.critical_risks > 0) suggestions.push({ text: `Create action plan for top risk`, icon: "📋" });
      if (metrics.insights?.goal_alignment_gap) suggestions.push({ text: `Align goals for ${metrics.leaders_needing_goal_alignment} leaders`, icon: "🎯" });
      if (filters.isFiltered) suggestions.push({ text: "Explain these filtered results", icon: "🔍" });
      suggestions.push({ text: "Export analytics report", icon: "📥" });
      break;
    }
    default:
      suggestions.push({ text: 'What can you help me with?', icon: '❓' }, { text: 'Explain this page', icon: '📖' }, { text: 'Show me tips', icon: '💡' });
  }

  // Deduplicate and limit to 4
  const uniqueSuggestions = [];
  const seenTexts = new Set();
  for (const s of suggestions) {
    if (s?.text && !seenTexts.has(s.text)) {
      uniqueSuggestions.push(s);
      seenTexts.add(s.text);
    }
  }
  return uniqueSuggestions.slice(0, 4);
}