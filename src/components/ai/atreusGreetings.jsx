/**
 * Contextual greeting generator for Atreus coach.
 * Extracted to keep AtreusCoach.jsx under the line limit.
 */

// Varied conversational openers to avoid repetition
const OPENERS = [
  (name) => `Howdy, ${name}!`,
  (name) => `Hey ${name}!`,
  (name) => `Good to see you, ${name}.`,
  (name) => `${name}!`,
  (name) => `What's up, ${name}?`,
];

function opener(name) {
  // Deterministic-ish based on current minute so it varies but doesn't flicker
  const idx = Math.floor(Date.now() / 60000) % OPENERS.length;
  return OPENERS[idx](name);
}

export function getContextualGreeting(context, appRole) {
  const userName = context?.user_name?.split(' ')[0] || 'there';
  const pageType = context?.pageType || 'unknown';
  const userRole = context?.userRole || appRole || 'User';
  const viewportFocus = context?.viewport_focus || {};
  const visibleData = context?.visible_data_summary || {};
  const pageInsights = context?.page_specific_insights || {};
  const o = opener(userName);

  // Viewport-aware greetings
  if (viewportFocus.focused_section) {
    switch (viewportFocus.focused_section) {
      case 'section-metrics':
      case 'section-top-metrics':
      case 'section-overview-metrics':
        return `${o} You're looking at your metrics — want me to tell you what actually matters here?`;
      case 'section-assessment':
        return `${o} Assessment section open. What do you want to dig into?`;
      case 'section-team':
      case 'section-team-summary':
        return `${o} Checking in on the team? Who are you thinking about?`;
      case 'section-competency-impact':
      case 'section-competency-breakdown':
        return `${o} Competency breakdown — which one are you trying to move?`;
      case 'section-strategic-risks':
        return `${o} Looking at risks. Which one's keeping you up at night?`;
      case 'section-succession-pipeline':
        return `${o} Succession pipeline — who's your next big bet?`;
      case 'section-learning':
        return `${o} What are you trying to get better at right now?`;
      case 'section-goals':
        return `${o} Goals check. What's the one that matters most this week?`;
      case 'section-programs':
        return `${o} Programs view. What are you trying to figure out?`;
      default:
        break;
    }
  }

  // Page-specific greetings with data awareness
  switch (pageType) {
    case 'dashboard':
      if (userRole === 'User Level 1') {
        if (!visibleData.has_assessment) {
          return `${o} What are you working on these days? Give me the quick version.`;
        }
        return `${o} What's top of mind right now — goals, learning, or something else?`;
      } else if (userRole === 'User Level 2') {
        return `${o} How's the team doing? Anything you're watching closely?`;
      } else if (userRole === 'User Level 3') {
        return `${o} What's the strategic thing you're wrestling with right now?`;
      } else if (userRole === 'Admin Level 1') {
        return `${o} What's going on with your programs? What do you need to figure out?`;
      } else if (userRole === 'Admin Level 2' || userRole === 'Super Administrator') {
        return `${o} What's the org challenge you're working through today?`;
      }
      return `${o} What are you working on? Give me the quick version.`;

    case 'learning-library': {
      const filters = context?.current_filters || {};
      if (filters.competency && filters.competency.length > 0) {
        return `${o} Looking at ${filters.competency.join(', ')} content — is this for you or someone on your team?`;
      }
      if (filters.search) {
        return `${o} Searching for "${filters.search}" — what's the goal behind this?`;
      }
      return `${o} What are you trying to get better at? I'll point you to what's actually worth your time.`;
    }

    case 'goals-overview': {
      const atRiskCount = visibleData.at_risk_goals || 0;
      const pendingCount = visibleData.pending_acceptance_goals || 0;
      if (atRiskCount > 0) {
        return `${o} You've got ${atRiskCount} goal${atRiskCount > 1 ? 's' : ''} that need attention. Want to talk through what's getting in the way?`;
      }
      if (pendingCount > 0) {
        return `${o} ${pendingCount} goal${pendingCount > 1 ? 's' : ''} waiting on you. Want a quick rundown before you decide?`;
      }
      return `${o} Goals page. What are you trying to make progress on?`;
    }

    case 'career-path-explorer': {
      const targetRole = visibleData.target_role;
      const readinessScore = visibleData.readiness_score;
      if (targetRole && readinessScore !== undefined) {
        return `${o} Eyeing the ${targetRole} role at ${readinessScore}% ready — what's your biggest gap right now?`;
      }
      return `${o} Thinking about your next move? Tell me where you want to go and let's pressure-test it.`;
    }

    case 'onboarding-builder': {
      const planStatus = pageInsights.plan_ready_to_deploy ? 'ready to ship' :
        pageInsights.needs_assignee ? 'ready to assign' :
        pageInsights.needs_generation ? 'needs generating' : 'in progress';
      return `${o} Onboarding plan is ${planStatus}. What do you need from me?`;
    }

    case 'hr-assessment-dashboard':
      return `${o} ${visibleData.total_assessments || 0} assessments, ${visibleData.completion_rate || 0}% done. What are you trying to understand from this data?`;

    case 'enterprise_analytics':
      return `${o} ${visibleData.total_leaders || 0} leaders in view. What pattern are you trying to spot?`;

    case 'command-center':
      if (userRole === 'User Level 2') return `${o} Team dashboard. Who needs your attention right now?`;
      if (userRole === 'Admin Level 1') return `${o} Program view. What are you trying to track down?`;
      return `${o} Command center. What's the priority today?`;

    case 'profile': {
      const profileCompletion = pageInsights.profile_completion_percentage || 0;
      if (profileCompletion < 100) {
        return `${o} Profile's ${profileCompletion}% done — want me to tell you what's worth filling in first?`;
      }
      return `${o} Profile looking solid. Anything you want to update or think through?`;
    }

    case 'assessment-taking':
      return `${o} In the middle of your assessment — I'll be here when you're done to make sense of the results.`;

    case 'assessment-results':
      return `${o} Results are in (${visibleData.overall_score || 0}%). What's your gut reaction — surprised, or did you see it coming?`;

    case 'user-management': {
      const selectedCount = visibleData.selected_count || 0;
      if (selectedCount > 0) {
        return `${o} ${selectedCount} user${selectedCount > 1 ? 's' : ''} selected. What are you trying to do with them?`;
      }
      return `${o} User management. What are you trying to sort out?`;
    }

    case 'settings':
      return `${o} Settings — what are you trying to change?`;

    case 'notifications': {
      const unreadCount = visibleData.unread_notifications || 0;
      if (unreadCount > 0) {
        return `${o} You've got ${unreadCount} unread. Want me to give you the highlights?`;
      }
      return `${o} All clear on notifications. What's on your mind?`;
    }

    case 'my-journeys-overview':
      return `${o} ${visibleData.active_journeys || 0} active journey${(visibleData.active_journeys || 0) !== 1 ? 's' : ''}. Which one are you focused on?`;

    case 'journey-builder':
      return `${o} Building a journey — who's it for and what are you trying to achieve?`;

    case 'onboarding-progress':
      return `${o} ${visibleData.progress_percentage || 0}% through onboarding. What feels unclear or stuck?`;

    case 'billing':
      return `${o} What do you need to figure out on the billing side?`;

    case 'business-manager':
      return `${o} Business manager view. What are you working through?`;

    case 'development-request-form':
      return `${o} Let's sharpen this request so you actually get what you need. What are you trying to solve?`;

    default:
      if (userRole === 'Platform Admin') return `${o} Platform admin mode. What do you need to manage?`;
      if (userRole === 'Super Administrator') return `${o} What's the org challenge you're working on today?`;
      if (userRole === 'Partner Business Administrator') return `${o} What do you need to sort out across your clients?`;
      return `${o} What are you working on? Give me the quick version.`;
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

export function getContextualSuggestions(context, appRole, userPermissions, allowedTools = {}) {
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
      if ((pageInsights.profile_completeness ?? 100) < 100) suggestions.push({ text: 'Help me complete my profile', icon: '👤' });
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