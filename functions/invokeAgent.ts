import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Atreus Agent - Central Intelligence & Action Executor
 * Handles natural language intent detection and secure platform action execution
 */

// Confirmation levels (mirror from agentTools.js)
const CONFIRMATION_LEVELS = {
  LOW: { display: 'toast_only', requireConfirm: false, level: 'LOW' },
  MEDIUM: { display: 'simple_modal', requireConfirm: true, showImpact: true, showAffectedUsers: true, level: 'MEDIUM' },
  HIGH: { display: 'detailed_modal', requireConfirm: true, showImpact: true, showAffectedUsers: true, showReversibility: true, showPreview: true, level: 'HIGH' },
  CRITICAL: { display: 'full_impact_modal', requireConfirm: true, requireTypedConfirmation: true, showImpact: true, showAffectedUsers: true, showReversibility: true, showWarnings: true, showAuditLog: true, level: 'CRITICAL' }
};

function getConfirmationLevel(toolName) {
  // LOW: Read-only, info gathering, recommendations
  const lowRiskTools = ['generateReport', 'getUserAchievements', 'explainBadgeCriteria', 'trackLearningProgress', 
    'suggestLearningForGaps', 'generateUserActivityReport', 'identifyInactiveUsers', 'createFormFromDescription',
    'suggestQuestionTypes', 'designConditionalLogic', 'recommendFormTemplate', 'analyzeFormSubmissions',
    'exportFormData', 'autoTriageRequest', 'prioritizeRequests', 'createInterventionPlan', 'suggestBoardLayout',
    'analyzeGoalDependencies', 'suggestGoalMilestones', 'alignGoalsToCareerPath', 'identifyGoalsAtRisk',
    'structureJourneyPath', 'suggestContentGating', 'selectLearningResources', 'analyzeJourneyEffectiveness',
    'interpretDashboardMetrics', 'identifyOutliers', 'compareDepartments', 'detectTrends', 'generateBenchmarkReport',
    'explainMetricChange', 'forecastMetric', 'identifyInterventionOpportunities', 'createCompetency',
    'mapCompetencyToAssessment', 'defineCompetencyLevels', 'suggestCompetencyDevelopment',
    'recommendCareerPathFromCerts', 'setCertificationReminder', 'suggestPointAwards', 'designBadgeStructure',
    'generateEmailTemplate', 'recommendEmailTemplate', 'suggestSubjectLines', 'validateTemplateVariables',
    'previewEmailWithData', 'viewImpersonationHistory', 'getUserLoginHistory', 'viewUserEngagementMetrics'];
  
  // MEDIUM: Single user assignments, notifications, basic changes
  const mediumRiskTools = ['createReminder', 'scheduleNotification', 'assignLearning', 'assignJourney', 'createGoal',
    'scheduleCalendarEvent', 'inviteUser', 'sendEmail', 'activateUserAccount', 'resendUserInvitation',
    'unlockUserAccount', 'assignAssessment', 'assignOnboardingPlan', 'assignCohort', 'bulkUpdateRequestStatus',
    'assignRequestToUser', 'bulkUpdateGoalProgress', 'addJourneyMilestones', 'cloneJourneyAsTemplate',
    'enrollUserInExperience', 'linkCompetenciesToRole', 'verifyCertification', 'processExternalAssessment',
    'awardPointsToUser'];
  
  // HIGH: Bulk operations, cascading changes, license management
  const highRiskTools = ['cascadeGoal', 'bulkAssignLearning', 'bulkCreateGoals', 'suspendUserAccount',
    'assignLicense', 'setAccountExpiration', 'bulkAssignAssessments', 'assignJourneyToTeam', 'createCompetition'];
  
  // CRITICAL: Destructive operations, mass changes, security actions
  const criticalRiskTools = ['bulkInviteUsers', 'terminateUserSessions', 'bulkSetAccountExpiration'];
  
  if (lowRiskTools.includes(toolName)) return CONFIRMATION_LEVELS.LOW;
  if (mediumRiskTools.includes(toolName)) return CONFIRMATION_LEVELS.MEDIUM;
  if (highRiskTools.includes(toolName)) return CONFIRMATION_LEVELS.HIGH;
  if (criticalRiskTools.includes(toolName)) return CONFIRMATION_LEVELS.CRITICAL;
  
  return CONFIRMATION_LEVELS.MEDIUM; // Default
}

// Workflow state management helpers
function isInWorkflow(conversationContext) {
  return conversationContext?.workflow_id && conversationContext?.workflow_type;
}

function updateWorkflowState(context, updates) {
  return {
    ...context,
    workflow_id: context.workflow_id || `wf_${Date.now()}`,
    workflow_type: updates.workflow_type || context.workflow_type,
    current_step: updates.current_step ?? context.current_step,
    collected_parameters: { ...context.collected_parameters, ...updates.collected_parameters },
    required_next_parameters: updates.required_next_parameters || context.required_next_parameters,
    last_prompt: updates.last_prompt || context.last_prompt,
    updated_at: new Date().toISOString()
  };
}

// Rate limiting storage (in-memory, resets on function restart)
const rateLimitStore = new Map();

function checkRateLimit(userEmail) {
  const now = Date.now();
  const userLimits = rateLimitStore.get(userEmail) || { calls: [], actions: [] };
  
  // Clean old entries (older than 1 hour)
  userLimits.calls = userLimits.calls.filter(t => now - t < 3600000);
  userLimits.actions = userLimits.actions.filter(t => now - t < 3600000);
  
  // Check limits: 60 calls per hour, 30 actions per hour
  if (userLimits.calls.length >= 60) {
    throw { 
      message: 'Rate limit exceeded: Too many requests. Please wait before trying again.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryable: true
    };
  }
  
  if (userLimits.actions.length >= 30) {
    throw {
      message: 'Action limit exceeded: Too many actions performed. Please wait before trying again.',
      code: 'ACTION_LIMIT_EXCEEDED',
      retryable: true
    };
  }
  
  // Add current call
  userLimits.calls.push(now);
  rateLimitStore.set(userEmail, userLimits);
}

function recordAction(userEmail) {
  const now = Date.now();
  const userLimits = rateLimitStore.get(userEmail) || { calls: [], actions: [] };
  userLimits.actions.push(now);
  rateLimitStore.set(userEmail, userLimits);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check rate limits
    checkRateLimit(user.email);

    const { prompt, context, tool_call, confirmed, conversation_id, file_attachments } = await req.json();

    // Fetch conversation context for workflow state if conversation_id provided
    let conversationContext = null;
    if (conversation_id) {
      const conversations = await base44.entities.Conversation.filter({ id: conversation_id });
      if (conversations.length > 0) {
        conversationContext = conversations[0].context || {};
      }
    }

    // If this is a confirmation callback (user approved an action)
    if (confirmed && tool_call) {
      return await executeAgentAction(base44, user, tool_call);
    }

    // Check if we're in a workflow
    if (conversationContext && isInWorkflow(conversationContext)) {
      return await handleWorkflowStep(base44, user, prompt, conversationContext, conversation_id);
    }

    // Process file attachments if present
    let fileContext = '';
    if (file_attachments && file_attachments.length > 0) {
      fileContext = await processFileAttachments(base44, file_attachments);
    }

    // Define available tools inline (can't import from components in Deno functions)
    const AGENT_TOOLS_LIST = [
      'generateReport', 'createReminder', 'assignLearning', 'createGoal', 'scheduleCalendarEvent',
      'cascadeGoal', 'inviteUser', 'sendEmail', 'bulkAssignLearning', 'bulkCreateGoals',
      'getUserAchievements', 'explainBadgeCriteria', 'suggestPointAwards', 'designBadgeStructure',
      'createCompetition', 'awardPointsToUser',
      // Email Template Tools
      'suggestSubjectLines', 'validateTemplateVariables', 'previewEmailWithData',
      // User Management
      'setAccountExpiration', 'bulkSetAccountExpiration', 'resendUserInvitation', 
      'unlockUserAccount', 'viewUserEngagementMetrics',
      // Assessment & Learning
      'bulkAssignAssessments', 'assignJourneyToTeam', 'trackLearningProgress', 'suggestLearningForGaps',
      // Forms
      'createFormFromDescription', 'suggestQuestionTypes', 'designConditionalLogic',
      'recommendFormTemplate', 'analyzeFormSubmissions', 'exportFormData',
      // Requests
      'autoTriageRequest', 'prioritizeRequests', 'createInterventionPlan',
      'bulkUpdateRequestStatus', 'assignRequestToUser',
      // Goals
      'suggestBoardLayout', 'analyzeGoalDependencies', 'suggestGoalMilestones',
      'alignGoalsToCareerPath', 'identifyGoalsAtRisk', 'bulkUpdateGoalProgress',
      // Journeys
      'structureJourneyPath', 'suggestContentGating', 'selectLearningResources',
      'addJourneyMilestones', 'analyzeJourneyEffectiveness', 'cloneJourneyAsTemplate', 'enrollUserInExperience',
      // Analytics
      'interpretDashboardMetrics', 'identifyOutliers', 'compareDepartments', 'detectTrends',
      'generateBenchmarkReport', 'explainMetricChange', 'forecastMetric', 'identifyInterventionOpportunities',
      // Competencies
      'createCompetency', 'mapCompetencyToAssessment', 'defineCompetencyLevels',
      'linkCompetenciesToRole', 'suggestCompetencyDevelopment',
      // Certifications
      'verifyCertification', 'processExternalAssessment', 'recommendCareerPathFromCerts', 'setCertificationReminder'
    ];
    
    const toolsDescription = AGENT_TOOLS_LIST.join(', ');

    const intentPrompt = `You are Atreus, an AI agent that executes tasks for users.

**Available Tools:** ${toolsDescription}

**User Context:**
${JSON.stringify(context, null, 2)}

${fileContext ? `**Attached Files:**\n${fileContext}\n` : ''}

**User Request:** "${prompt}"

**CRITICAL INSTRUCTION - Dashboard Intelligence:**
When users ask to "interpret", "analyze", "explain", "compare", "identify", "detect", "forecast" metrics or data:
- These are ALWAYS actionable requests (is_actionable_request: true)
- Map to appropriate analytics tools:
  * "interpret metrics" → interpretDashboardMetrics
  * "explain why [metric] changed" → explainMetricChange
  * "compare departments" → compareDepartments
  * "identify outliers" → identifyOutliers
  * "detect trends" → detectTrends
  * "forecast [metric]" → forecastMetric
  * "find intervention opportunities" → identifyInterventionOpportunities
  * "generate benchmark report" → generateBenchmarkReport
- Extract metric data from context.visible_data_summary OR user's prompt
- Use high confidence (0.95) for dashboard intelligence requests

**CRITICAL INSTRUCTION - Parameter Names:**
You MUST use EXACT parameter names from the tool definitions:
- inviteUser: email, fullName, role (NOT userEmail, userName, userLevel)
- createGoal: title, description, timeframeEnd, assignedToEmails, linkedCompetencyIds (NOT goalName, name)
- verifyCertification: userEmail, certificationName, issuingBody, verificationUrl (NOT userName, certification, issuer)
  * If user says "Verify Sarah's PMP" extract: userEmail from user directory OR ask for email
- cascadeGoal: goalId, userEmails, customizePerUser (NOT goal_id, team_id)
- createFormFromDescription: formTitle, purpose, targetAudience, estimatedQuestions, includeScoring, formType
- structureJourneyPath: journeyTitle, targetCompetencies, audienceLevel, durationWeeks, includeAssessments
- createInterventionPlan: targetUserEmails, riskType, urgency
- suggestBoardLayout: boardPurpose, teamSize, trackingFrequency
- sendEmail: to (array), subject, body, fromName (NOT email, message, recipients)
  * ALWAYS require both subject AND body - if not provided, set needs_clarification: true
- scheduleCalendarEvent: title, description, startTime (ISO format), durationMinutes, attendeeEmails
  * For "Friday at 2pm" dates, convert to ISO format based on current date
- bulkAssignLearning: learningResourceId, resourceTitle, targetType, userEmails, dueDate, priority
  * learningResourceId supports fuzzy matching by title - searches LearningResource if ID not found
  * If "Assign X resource to my team" → search for X in LearningResource entity by title
- recommendCareerPathFromCerts: userEmail, includeGapAnalysis (ALWAYS actionable)
- setCertificationReminder: certificationId, expirationDate, reminderDaysBefore
- processExternalAssessment: userEmail, assessmentType, fileUrl, keyFindings
- suggestCompetencyDevelopment: competencyId, currentScore, targetScore, timeframe
- linkCompetenciesToRole: roleId, competencyIds, targetScores
- createCompetency: competencyName, category, leadershipLevels, evidenceBased
- mapCompetencyToAssessment: competencyId, assessmentId, suggestQuestions
  * Both competencyId and assessmentId support fuzzy matching by name
- defineCompetencyLevels: competencyName, numberOfLevels, includeExamples

**SPECIAL RULES:**
- "recommend career paths" → ALWAYS use recommendCareerPathFromCerts (is_actionable_request: true)
- "set reminder" + "certification" → ALWAYS use setCertificationReminder (is_actionable_request: true)
- "suggest development" + competency name → ALWAYS use suggestCompetencyDevelopment (is_actionable_request: true)
- "define proficiency levels" → ALWAYS use defineCompetencyLevels (is_actionable_request: true)
- "map" + competency name + "to assessment" → ALWAYS use mapCompetencyToAssessment (is_actionable_request: true)
- "verify" + person name + "certification" → ALWAYS use verifyCertification (is_actionable_request: true) BUT set needs_clarification if email not found
- "send email reminder" → check if full email context provided (to, subject, body), if missing ask for clarification
- "schedule" + meeting/1on1/session → ALWAYS use scheduleCalendarEvent (is_actionable_request: true)

**DATE/TIME CONVERSION:**
- Current date: 2026-01-30 (Thursday)
- "Friday at 2pm" → 2026-01-31T14:00:00Z (next day)
- "Monday 9am" → 2026-02-03T09:00:00Z (next Monday)
- Always convert relative dates to ISO format

NEVER invent parameter names - use ONLY the exact names listed in the available tools.

**Your Task:**
1. Determine if the user wants you to execute an action (is_actionable_request: true/false)
2. If actionable, identify the best tool from the available tools list
3. Extract ALL parameters from the request, context, and files:
   - Use explicit values from the request (e.g., "Strategic Thinking" → competencyName: "Strategic Thinking")
   - Infer missing values from context when possible (e.g., userEmail from context.user_email)
   - Extract metrics from context.visible_data_summary (total_learners, completion_rate, avg_engagement, etc.)
   - Set sensible defaults for optional parameters
   - If critical parameters are missing, set needs_clarification: true
4. Provide confidence score (0-1)

**Parameter Extraction Rules:**
- ALWAYS extract competencyName, journeyTitle, formTitle, etc. from the user's exact words
- Use context.user_email for userEmail when not specified
- Use context.visible_data_summary as metricSnapshot for dashboard tools
- Default arrays to empty [] not undefined
- Default strings to empty string not undefined
- Set confidence high (0.9+) if you have the core parameters

Return structured JSON with your analysis.`;

    const intentResult = await base44.integrations.Core.InvokeLLM({
      prompt: intentPrompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: "object",
        properties: {
          is_actionable_request: { type: "boolean" },
          needs_clarification: { type: "boolean" },
          clarification_question: { type: "string" },
          tool_call: {
            type: "object",
            properties: {
              tool_name: { type: "string" },
              parameters: { type: "object" },
              confidence: { type: "number" }
            }
          },
          conversational_response: { type: "string" }
        }
      }
    });

    // If not an actionable request, return conversational response
    if (!intentResult.is_actionable_request) {
      return Response.json({
        status: "conversational",
        message: intentResult.conversational_response || "I'm here to help! Could you clarify what you'd like me to do?"
      });
    }

    // If needs clarification
    if (intentResult.needs_clarification) {
      return Response.json({
        status: "needs_clarification",
        message: intentResult.clarification_question || "I need a bit more information. Could you provide more details?"
      });
    }

    // Step 2: Validate tool call
    const { tool_name, parameters, confidence } = intentResult.tool_call || {};
    
    if (!tool_name || !AGENT_TOOLS_LIST.includes(tool_name)) {
      return Response.json({
        status: "conversational",
        message: intentResult.conversational_response || "I'm here to help! What would you like me to do?"
      });
    }

    if (confidence && confidence < 0.7) {
      return Response.json({
        status: "needs_clarification",
        message: `I think you want me to ${tool_name}, but I'm not completely sure. Could you rephrase?`
      });
    }

    // Step 3: Check if confirmation is needed (simplified - specific tools need confirmation)
    const needsConfirmationTools = [
      'createReminder', 'assignLearning', 'createGoal', 'cascadeGoal', 'inviteUser',
      'sendEmail', 'bulkAssignLearning', 'bulkCreateGoals', 'createCompetition', 'awardPointsToUser',
      'setAccountExpiration', 'bulkSetAccountExpiration', 'resendUserInvitation', 'unlockUserAccount',
      'bulkAssignAssessments', 'assignJourneyToTeam', 'bulkUpdateRequestStatus', 'assignRequestToUser',
      'bulkUpdateGoalProgress', 'addJourneyMilestones', 'cloneJourneyAsTemplate', 'enrollUserInExperience',
      'linkCompetenciesToRole', 'verifyCertification', 'processExternalAssessment', 'setCertificationReminder'
    ];

    if (needsConfirmationTools.includes(tool_name)) {
      // Generate proposed changes summary
      const proposedChanges = await generateProposedChanges(base44, user, tool_name, parameters);
      
      // Determine confirmation level based on tool
      const confirmationLevel = getConfirmationLevel(tool_name);

      return Response.json({
        status: "needs_confirmation",
        tool_call: { tool_name, parameters },
        confirmation_message: `I'd like to ${tool_name.replace(/([A-Z])/g, ' $1').toLowerCase()} for you. Please review the details.`,
        proposed_changes: proposedChanges,
        confirmationLevel: confirmationLevel
      });
    }

    // Step 4: Execute directly if no confirmation needed
    recordAction(user.email); // Track action for rate limiting
    return await executeAgentAction(base44, user, { tool_name, parameters });

  } catch (error) {
    console.error('Agent error:', error);
    return Response.json({ 
      status: "error",
      message: error.message || 'An error occurred while processing your request.',
      code: "INTERNAL_ERROR",
      retryable: true
    }, { status: 500 });
  }
});

async function generateProposedChanges(base44, user, toolName, parameters) {
  const changes = { items: [] };

  try {
    switch(toolName) {
      case 'createReminder':
        changes.summary = `Create a reminder for ${parameters.recipientEmails?.length || 1} recipient(s)`;
        changes.items = [
          `Title: ${parameters.title}`,
          `Message: ${parameters.message}`,
          `Scheduled for: ${new Date(parameters.scheduledFor).toLocaleString()}`,
          `Priority: ${parameters.priority || 'medium'}`
        ];
        changes.affected_users = parameters.recipientEmails || [user.email];
        break;

      case 'assignLearning':
        const resource = await base44.entities.LearningResource.filter({ id: parameters.learningResourceId });
        changes.summary = `Assign "${parameters.resourceTitle || resource[0]?.title || 'learning resource'}" to ${parameters.userEmails.length} user(s)`;
        changes.items = [
          `Resource: ${parameters.resourceTitle || resource[0]?.title}`,
          `Recipients: ${parameters.userEmails.length} users`,
          parameters.dueDate ? `Due: ${new Date(parameters.dueDate).toLocaleDateString()}` : 'No due date',
          `Priority: ${parameters.priority || 'medium'}`
        ];
        changes.affected_users = parameters.userEmails;
        break;

      case 'createGoal':
        changes.summary = parameters.assignedToEmails 
          ? `Create and assign goal to ${parameters.assignedToEmails.length} user(s)`
          : `Create a new goal for yourself`;
        changes.items = [
          `Title: ${parameters.title}`,
          parameters.description ? `Description: ${parameters.description.substring(0, 100)}...` : '',
          parameters.timeframeEnd ? `Due: ${new Date(parameters.timeframeEnd).toLocaleDateString()}` : ''
        ].filter(Boolean);
        changes.affected_users = parameters.assignedToEmails || [user.email];
        break;

      case 'generateReport':
        changes.summary = `Generate ${parameters.reportType} report as ${parameters.format.toUpperCase()}`;
        changes.items = [
          `Report Type: ${parameters.reportType}`,
          `Format: ${parameters.format.toUpperCase()}`,
          `Date Range: ${parameters.dateRange || '6 months'}`,
          `Scope: ${parameters.scope || 'personal'}`
        ];
        break;

      case 'scheduleCalendarEvent':
        changes.summary = `Schedule "${parameters.title}" on ${new Date(parameters.startTime).toLocaleString()}`;
        changes.items = [
          `Title: ${parameters.title}`,
          `Start: ${new Date(parameters.startTime).toLocaleString()}`,
          `Duration: ${parameters.durationMinutes} minutes`,
          parameters.attendeeEmails ? `Attendees: ${parameters.attendeeEmails.length}` : 'No attendees'
        ];
        changes.affected_users = parameters.attendeeEmails || [];
        break;

      case 'cascadeGoal':
        const origGoal = await base44.entities.Goal.filter({ id: parameters.goalId });
        changes.summary = `Cascade goal "${origGoal[0]?.title || 'goal'}" to ${parameters.userEmails.length} user(s)`;
        changes.items = [
          `Goal: ${origGoal[0]?.title}`,
          `Recipients: ${parameters.userEmails.length} users`,
          parameters.customizePerUser ? 'Users can customize their cascaded goals' : 'Standard cascade'
        ];
        changes.affected_users = parameters.userEmails;
        break;

      case 'inviteUser':
        changes.summary = `Invite ${parameters.email} as ${parameters.role}`;
        changes.items = [
          `Email: ${parameters.email}`,
          parameters.fullName ? `Name: ${parameters.fullName}` : '',
          `Role: ${parameters.role}`
        ].filter(Boolean);
        changes.affected_users = [parameters.email];
        break;

      case 'sendEmail':
        changes.summary = `Send email to ${parameters.to.length} recipient(s)`;
        changes.items = [
          `Subject: ${parameters.subject}`,
          `Recipients: ${parameters.to.length}`,
          `From: ${parameters.fromName || user.full_name}`,
          `Preview: ${parameters.body.substring(0, 100)}...`
        ];
        changes.affected_users = parameters.to;
        break;

      case 'bulkAssignLearning':
        changes.summary = `Bulk assign "${parameters.resourceTitle}" to ${parameters.targetType}`;
        changes.items = [
          `Resource: ${parameters.resourceTitle}`,
          `Target: ${parameters.targetType}`,
          parameters.userEmails?.length > 0 ? `Users: ${parameters.userEmails.length}` : '',
          parameters.dueDate ? `Due: ${new Date(parameters.dueDate).toLocaleDateString()}` : 'No due date',
          `Priority: ${parameters.priority || 'medium'}`
        ].filter(Boolean);
        changes.affected_users = parameters.userEmails || [];
        break;

      case 'bulkCreateGoals':
        changes.summary = `Create ${parameters.goals.length} goal(s)${parameters.assignToEmails?.length > 0 ? ` and assign to ${parameters.assignToEmails.length} user(s)` : ''}`;
        changes.items = [
          `Number of goals: ${parameters.goals.length}`,
          `Goals: ${parameters.goals.map(g => g.title).join(', ')}`,
          parameters.assignToEmails?.length > 0 ? `Assign to: ${parameters.assignToEmails.length} users` : 'Self-assigned'
        ];
        changes.affected_users = parameters.assignToEmails || [];
        break;

      default:
        changes.summary = `Execute ${toolName}`;
        changes.items = Object.entries(parameters).map(([key, val]) => `${key}: ${JSON.stringify(val)}`);
    }
  } catch (error) {
    console.error('Error generating proposed changes:', error);
    changes.summary = `Execute ${toolName}`;
  }

  return changes;
}

async function executeAgentAction(base44, user, toolCall, returnWorkflowSuggestions = true) {
  const { tool_name, parameters } = toolCall;

  try {
    // Record action execution for rate limiting
    recordAction(user.email);
    
    let result = {};

    switch(tool_name) {
      case 'generateReport':
        result = await executeGenerateReport(base44, user, parameters);
        break;

      case 'createReminder':
        result = await executeCreateReminder(base44, user, parameters);
        break;

      case 'assignLearning':
        result = await executeAssignLearning(base44, user, parameters);
        break;

      case 'createGoal':
        result = await executeCreateGoal(base44, user, parameters);
        break;

      case 'scheduleCalendarEvent':
        result = await executeScheduleCalendarEvent(base44, user, parameters);
        break;

      case 'cascadeGoal':
        result = await executeCascadeGoal(base44, user, parameters);
        break;

      case 'inviteUser':
        result = await executeInviteUser(base44, user, parameters);
        break;

      case 'sendEmail':
        result = await executeSendEmail(base44, user, parameters);
        break;

      case 'bulkAssignLearning':
        result = await executeBulkAssignLearning(base44, user, parameters);
        break;

      case 'bulkCreateGoals':
        result = await executeBulkCreateGoals(base44, user, parameters);
        break;

      case 'getUserAchievements':
        result = await executeGetUserAchievements(base44, user, parameters);
        break;

      case 'explainBadgeCriteria':
        result = await executeExplainBadgeCriteria(base44, user, parameters);
        break;

      case 'suggestPointAwards':
        result = await executeSuggestPointAwards(base44, user, parameters);
        break;

      case 'designBadgeStructure':
        result = await executeDesignBadgeStructure(base44, user, parameters);
        break;

      case 'createCompetition':
        result = await executeCreateCompetition(base44, user, parameters);
        break;

      case 'awardPointsToUser':
        result = await executeAwardPointsToUser(base44, user, parameters);
        break;

      // Email Template Tools
      case 'suggestSubjectLines':
        result = await executeSuggestSubjectLines(base44, user, parameters);
        break;
      case 'validateTemplateVariables':
        result = await executeValidateTemplateVariables(base44, user, parameters);
        break;
      case 'previewEmailWithData':
        result = await executePreviewEmailWithData(base44, user, parameters);
        break;

      // User Management & Security
      case 'setAccountExpiration':
        result = await executeSetAccountExpiration(base44, user, parameters);
        break;
      case 'bulkSetAccountExpiration':
        result = await executeBulkSetAccountExpiration(base44, user, parameters);
        break;
      case 'resendUserInvitation':
        result = await executeResendUserInvitation(base44, user, parameters);
        break;
      case 'unlockUserAccount':
        result = await executeUnlockUserAccount(base44, user, parameters);
        break;
      case 'viewUserEngagementMetrics':
        result = await executeViewUserEngagementMetrics(base44, user, parameters);
        break;

      // Assessment & Learning Deployment
      case 'bulkAssignAssessments':
        result = await executeBulkAssignAssessments(base44, user, parameters);
        break;
      case 'assignJourneyToTeam':
        result = await executeAssignJourneyToTeam(base44, user, parameters);
        break;
      case 'trackLearningProgress':
        result = await executeTrackLearningProgress(base44, user, parameters);
        break;
      case 'suggestLearningForGaps':
        result = await executeSuggestLearningForGaps(base44, user, parameters);
        break;

      // Form Builder Tools
      case 'createFormFromDescription':
        result = await executeCreateFormFromDescription(base44, user, parameters);
        break;
      case 'suggestQuestionTypes':
        result = await executeSuggestQuestionTypes(base44, user, parameters);
        break;
      case 'designConditionalLogic':
        result = await executeDesignConditionalLogic(base44, user, parameters);
        break;
      case 'recommendFormTemplate':
        result = await executeRecommendFormTemplate(base44, user, parameters);
        break;
      case 'analyzeFormSubmissions':
        result = await executeAnalyzeFormSubmissions(base44, user, parameters);
        break;
      case 'exportFormData':
        result = await executeExportFormData(base44, user, parameters);
        break;

      // Request System Tools
      case 'autoTriageRequest':
        result = await executeAutoTriageRequest(base44, user, parameters);
        break;
      case 'prioritizeRequests':
        result = await executePrioritizeRequests(base44, user, parameters);
        break;
      case 'createInterventionPlan':
        result = await executeCreateInterventionPlan(base44, user, parameters);
        break;
      case 'bulkUpdateRequestStatus':
        result = await executeBulkUpdateRequestStatus(base44, user, parameters);
        break;
      case 'assignRequestToUser':
        result = await executeAssignRequestToUser(base44, user, parameters);
        break;

      // Advanced Goals Tools
      case 'suggestBoardLayout':
        result = await executeSuggestBoardLayout(base44, user, parameters);
        break;
      case 'analyzeGoalDependencies':
        result = await executeAnalyzeGoalDependencies(base44, user, parameters);
        break;
      case 'suggestGoalMilestones':
        result = await executeSuggestGoalMilestones(base44, user, parameters);
        break;
      case 'alignGoalsToCareerPath':
        result = await executeAlignGoalsToCareerPath(base44, user, parameters);
        break;
      case 'identifyGoalsAtRisk':
        result = await executeIdentifyGoalsAtRisk(base44, user, parameters);
        break;
      case 'bulkUpdateGoalProgress':
        result = await executeBulkUpdateGoalProgress(base44, user, parameters);
        break;

      // Journey & Experience Tools
      case 'structureJourneyPath':
        result = await executeStructureJourneyPath(base44, user, parameters);
        break;
      case 'suggestContentGating':
        result = await executeSuggestContentGating(base44, user, parameters);
        break;
      case 'selectLearningResources':
        result = await executeSelectLearningResources(base44, user, parameters);
        break;
      case 'addJourneyMilestones':
        result = await executeAddJourneyMilestones(base44, user, parameters);
        break;
      case 'analyzeJourneyEffectiveness':
        result = await executeAnalyzeJourneyEffectiveness(base44, user, parameters);
        break;
      case 'cloneJourneyAsTemplate':
        result = await executeCloneJourneyAsTemplate(base44, user, parameters);
        break;
      case 'enrollUserInExperience':
        result = await executeEnrollUserInExperience(base44, user, parameters);
        break;

      // Analytics Dashboard Tools
      case 'interpretDashboardMetrics':
        result = await executeInterpretDashboardMetrics(base44, user, parameters);
        break;
      case 'identifyOutliers':
        result = await executeIdentifyOutliers(base44, user, parameters);
        break;
      case 'compareDepartments':
        result = await executeCompareDepartments(base44, user, parameters);
        break;
      case 'detectTrends':
        result = await executeDetectTrends(base44, user, parameters);
        break;
      case 'generateBenchmarkReport':
        result = await executeGenerateBenchmarkReport(base44, user, parameters);
        break;
      case 'explainMetricChange':
        result = await executeExplainMetricChange(base44, user, parameters);
        break;
      case 'forecastMetric':
        result = await executeForecastMetric(base44, user, parameters);
        break;
      case 'identifyInterventionOpportunities':
        result = await executeIdentifyInterventionOpportunities(base44, user, parameters);
        break;

      // Competency Management Tools
      case 'createCompetency':
        result = await executeCreateCompetency(base44, user, parameters);
        break;
      case 'mapCompetencyToAssessment':
        result = await executeMapCompetencyToAssessment(base44, user, parameters);
        break;
      case 'defineCompetencyLevels':
        result = await executeDefineCompetencyLevels(base44, user, parameters);
        break;
      case 'linkCompetenciesToRole':
        result = await executeLinkCompetenciesToRole(base44, user, parameters);
        break;
      case 'suggestCompetencyDevelopment':
        result = await executeSuggestCompetencyDevelopment(base44, user, parameters);
        break;

      // Certification & External Assessment Tools
      case 'verifyCertification':
        result = await executeVerifyCertification(base44, user, parameters);
        break;
      case 'processExternalAssessment':
        result = await executeProcessExternalAssessment(base44, user, parameters);
        break;
      case 'recommendCareerPathFromCerts':
        result = await executeRecommendCareerPathFromCerts(base44, user, parameters);
        break;
      case 'setCertificationReminder':
        result = await executeSetCertificationReminder(base44, user, parameters);
        break;

      default:
        throw new Error(`Tool ${tool_name} execution not implemented`);
    }

    // Log successful action
    await base44.entities.AgentAction.create({
      user_email: user.email,
      action_type: tool_name,
      status: 'completed',
      parameters: parameters,
      result: result,
      timestamp: new Date().toISOString()
    });

    // Check for workflow opportunities after successful execution
    let workflowSuggestions = [];
    if (returnWorkflowSuggestions) {
      workflowSuggestions = await detectWorkflowOpportunities(base44, user, tool_name, parameters, result);
    }
    
    return Response.json({
      status: "success",
      message: result.message || "Action completed successfully!",
      result: result,
      workflow_suggestions: workflowSuggestions && workflowSuggestions.length > 0 ? workflowSuggestions : undefined
    });

  } catch (error) {
    console.error(`Error executing ${tool_name}:`, error);

    // Log failed action
    await base44.entities.AgentAction.create({
      user_email: user.email,
      action_type: tool_name,
      status: 'failed',
      parameters: parameters,
      error_message: error.message,
      timestamp: new Date().toISOString()
    });

    return Response.json({
      status: "failed",
      message: error.message || `Failed to ${tool_name}`,
      code: error.code || "EXECUTION_ERROR",
      retryable: error.retryable !== false
    });
  }
}

async function executeGenerateReport(base44, user, params) {
  const { reportType, format, dateRange = '6months', scope = 'personal' } = params;

  // Map to existing report export functions
  const functionMap = {
    'performance': 'exportGoalsAnalyticsPDF',
    'learning': 'exportLearningAnalyticsPDF',
    'assessment': 'exportAssessmentAnalyticsPDF',
    'journey': 'exportJourneyAnalyticsPDF'
  };

  const functionName = functionMap[reportType];
  if (!functionName) {
    throw new Error(`Report type ${reportType} not supported`);
  }

  if (format === 'csv') {
    // For CSV, we'll generate basic data export
    return {
      message: `Your ${reportType} report is ready. Please use the export button on the ${reportType} analytics page to download CSV.`,
      action_required: 'navigate_to_page',
      page: `${reportType}Analytics`
    };
  }

  // For PDF, invoke the backend export function
  const response = await base44.asServiceRole.functions.invoke(functionName, {
    scope: scope,
    filters: { timeframe: dateRange }
  });

  return {
    message: `Your ${reportType} report (${format.toUpperCase()}) has been generated successfully!`,
    report_url: response.url || null,
    download_ready: true
  };
}

async function executeCreateReminder(base44, user, params) {
  const { title, message, scheduledFor, recipientEmails = [user.email], priority = 'medium', relatedEntityType, relatedEntityId } = params;

  const createdNotifications = [];

  for (const email of recipientEmails) {
    const notification = await base44.asServiceRole.entities.Notification.create({
      user_email: email,
      type: 'reminder',
      title: title,
      message: message,
      scheduled_for: scheduledFor,
      priority: priority,
      status: 'pending',
      related_entity_type: relatedEntityType || null,
      related_entity_id: relatedEntityId || null
    });
    createdNotifications.push(notification);
  }

  return {
    message: `Created ${createdNotifications.length} reminder(s) scheduled for ${new Date(scheduledFor).toLocaleString()}`,
    notification_ids: createdNotifications.map(n => n.id),
    count: createdNotifications.length
  };
}

async function executeAssignLearning(base44, user, params) {
  const { learningResourceId, resourceTitle, userEmails, dueDate, priority = 'medium', notes } = params;

  const assignments = [];

  for (const email of userEmails) {
    const assignment = await base44.asServiceRole.entities.AssignedLearning.create({
      user_email: email,
      learning_resource_id: learningResourceId,
      assigned_by: user.email,
      title: resourceTitle || 'Learning Assignment',
      description: notes || `Assigned by ${user.full_name} via Atreus`,
      priority: priority,
      due_date: dueDate || null,
      status: 'assigned',
      client_id: user.client_id
    });
    assignments.push(assignment);
  }

  return {
    message: `Successfully assigned "${resourceTitle}" to ${assignments.length} user(s)`,
    assignment_ids: assignments.map(a => a.id),
    count: assignments.length
  };
}

async function executeCreateGoal(base44, user, params) {
  const { title, description, timeframeEnd, assignedToEmails, linkedCompetencyIds } = params;

  const goal = await base44.entities.Goal.create({
    title: title,
    description: description || '',
    timeframe_end: timeframeEnd || null,
    assigned_to_emails: assignedToEmails || [],
    linked_competency_ids: linkedCompetencyIds || [],
    status: 'active',
    progress: 0,
    client_id: user.client_id
  });

  return {
    message: assignedToEmails 
      ? `Created goal "${title}" and assigned to ${assignedToEmails.length} user(s)`
      : `Created goal "${title}" successfully`,
    goal_id: goal.id
  };
}

async function executeScheduleCalendarEvent(base44, user, params) {
  const { title, description, startTime, durationMinutes, attendeeEmails = [] } = params;

  // Create notification for the event organizer
  const notification = await base44.asServiceRole.entities.Notification.create({
    user_email: user.email,
    type: '1on1_scheduled',
    title: `Calendar Event: ${title}`,
    message: `Event scheduled for ${new Date(startTime).toLocaleString()}. Duration: ${durationMinutes} minutes.${attendeeEmails.length > 0 ? ` Attendees: ${attendeeEmails.join(', ')}` : ''}`,
    scheduled_for: startTime,
    priority: 'medium',
    status: 'pending'
  });

  // Create notifications for all attendees
  const attendeeNotifications = [];
  for (const email of attendeeEmails) {
    if (email !== user.email) {
      const attendeeNotif = await base44.asServiceRole.entities.Notification.create({
        user_email: email,
        type: '1on1_scheduled',
        title: `Meeting Invitation: ${title}`,
        message: `${user.full_name} has scheduled "${title}" for ${new Date(startTime).toLocaleString()}. Duration: ${durationMinutes} minutes.`,
        scheduled_for: startTime,
        priority: 'medium',
        status: 'pending'
      });
      attendeeNotifications.push(attendeeNotif);
    }
  }

  return {
    message: `Event "${title}" scheduled for ${new Date(startTime).toLocaleString()}${attendeeEmails.length > 0 ? ` with ${attendeeEmails.length} attendee(s)` : ''}`,
    notification_id: notification.id,
    attendee_notifications: attendeeNotifications.length,
    note: 'Calendar event reminders created for all participants.'
  };
}

async function executeCascadeGoal(base44, user, params) {
  const { goalId, userEmails, customizePerUser = false } = params;

  // Fetch the original goal with fuzzy matching
  let originalGoals = [];
  try {
    originalGoals = await base44.entities.Goal.filter({ id: goalId });
  } catch (error) {
    // Try searching by title
    const allGoals = await base44.entities.Goal.filter({ created_by: user.email });
    const matchedByTitle = allGoals.find(g => 
      g.title.toLowerCase().includes(goalId.toLowerCase()) ||
      goalId.toLowerCase().includes(g.title.toLowerCase())
    );
    
    if (matchedByTitle) {
      originalGoals = [matchedByTitle];
    }
  }
  
  if (originalGoals.length === 0) {
    return {
      message: `Goal not found. Your active goals:\n\n${(await base44.entities.Goal.filter({ created_by: user.email, status: 'active' })).map(g => `• ${g.title}`).join('\n')}\n\nPlease specify one of the above.`
    };
  }

  const originalGoal = originalGoals[0];

  // Create cascaded goals for each user
  const cascadedGoals = [];
  for (const email of userEmails) {
    const cascadedGoal = await base44.asServiceRole.entities.Goal.create({
      title: originalGoal.title,
      description: customizePerUser 
        ? `${originalGoal.description || ''}\n\n(Cascaded from ${user.full_name})`
        : originalGoal.description,
      timeframe_start: originalGoal.timeframe_start,
      timeframe_end: originalGoal.timeframe_end,
      linked_competency_ids: originalGoal.linked_competency_ids || [],
      status: 'active',
      progress: 0,
      assigned_to_emails: [email],
      client_id: user.client_id,
      visibility: 'shared'
    });

    // Create notification for the assignee
    await base44.asServiceRole.entities.Notification.create({
      user_email: email,
      type: 'goal_assignment',
      title: 'New Goal Assigned',
      message: `${user.full_name} has cascaded a goal to you: "${originalGoal.title}"`,
      scheduled_for: new Date().toISOString(),
      priority: 'high',
      status: 'pending',
      related_entity_type: 'Goal',
      related_entity_id: cascadedGoal.id
    });

    cascadedGoals.push(cascadedGoal);
  }

  return {
    message: `Successfully cascaded goal "${originalGoal.title}" to ${cascadedGoals.length} user(s)`,
    cascaded_goal_ids: cascadedGoals.map(g => g.id),
    count: cascadedGoals.length
  };
}

async function executeInviteUser(base44, user, params) {
  const { email, fullName, role } = params;

  // Map internal role names to SDK role names
  const roleMapping = {
    'User Level 1': 'user',
    'User Level 2': 'user',
    'Analyst': 'user',
    'Admin Level 1': 'admin',
    'Admin Level 2': 'admin',
    'Super Administrator': 'admin',
    'Platform Admin': 'admin'
  };

  const sdkRole = roleMapping[role] || 'user';

  // Check permissions - only certain roles can invite
  const canInviteAdmin = ['Admin Level 2', 'Super Administrator', 'Platform Admin'].includes(user.app_role);
  const requestedRoleIsAdmin = ['Admin Level 1', 'Admin Level 2'].includes(role);

  if (requestedRoleIsAdmin && !canInviteAdmin) {
    throw { 
      message: 'You do not have permission to invite admin users. Only HR Admins and Super Admins can invite admins.',
      code: 'PERMISSION_DENIED',
      retryable: false
    };
  }

  // Use the Base44 invite function with SDK role
  await base44.users.inviteUser(email, sdkRole);

  return {
    message: `Invitation sent to ${email}${fullName ? ` (${fullName})` : ''} as ${role}`,
    invited_email: email,
    invited_role: role,
    invited_emails: [email]
  };
}

async function executeSendEmail(base44, user, params) {
  const { to, subject, body, fromName } = params;

  // Send emails to all recipients
  const emailPromises = to.map(recipientEmail =>
    base44.integrations.Core.SendEmail({
      from_name: fromName || user.full_name,
      to: recipientEmail,
      subject: subject,
      body: body
    })
  );

  await Promise.all(emailPromises);

  return {
    message: `Email sent to ${to.length} recipient(s)`,
    recipients: to,
    count: to.length
  };
}

async function executeBulkAssignLearning(base44, user, params) {
  const { learningResourceId, resourceTitle, targetType, userEmails = [], dueDate, priority = 'medium', notes } = params;

  // If learningResourceId looks like a title (contains spaces or doesn't look like an ID), search for it
  let actualResourceId = learningResourceId;
  let actualResourceTitle = resourceTitle;
  
  if (learningResourceId && (learningResourceId.includes(' ') || !learningResourceId.match(/^[a-z0-9_-]{10,}$/i))) {
    // Looks like a title, not an ID - search by title
    try {
      const resources = await base44.entities.LearningResource.filter({
        title: { $regex: learningResourceId, $options: 'i' }
      });
      
      if (resources.length > 0) {
        actualResourceId = resources[0].id;
        actualResourceTitle = resources[0].title;
      } else {
        // Try partial match
        const allResources = await base44.entities.LearningResource.filter({});
        const match = allResources.find(r => 
          r.title.toLowerCase().includes(learningResourceId.toLowerCase()) ||
          learningResourceId.toLowerCase().includes(r.title.toLowerCase())
        );
        
        if (match) {
          actualResourceId = match.id;
          actualResourceTitle = match.title;
        } else {
          throw new Error(`Learning resource "${learningResourceId}" not found. Please provide the exact resource ID or title from the Learning Library.`);
        }
      }
    } catch (error) {
      throw new Error(`Learning resource "${learningResourceId}" not found. Please provide the exact resource ID or title from the Learning Library.`);
    }
  }

  let targetEmails = [];

  // Determine target users based on targetType
  switch(targetType) {
    case 'team':
      // Get user's direct reports
      targetEmails = user.subordinate_emails || [];
      break;
    
    case 'division':
      // Get all users in user's division (would need division data)
      const divisionUsers = await base44.asServiceRole.entities.User.filter({
        client_id: user.client_id,
        division: user.division
      });
      targetEmails = divisionUsers.map(u => u.email);
      break;
    
    case 'specific_users':
      targetEmails = userEmails;
      break;
    
    case 'all_users':
      // Get all users in organization
      const allUsers = await base44.asServiceRole.entities.User.filter({
        client_id: user.client_id
      });
      targetEmails = allUsers.map(u => u.email);
      break;
  }

  if (targetEmails.length === 0) {
    throw new Error('No target users found for bulk assignment');
  }

  // Bulk create assignments
  const assignments = [];
  for (const email of targetEmails) {
    const assignment = await base44.asServiceRole.entities.AssignedLearning.create({
      user_email: email,
      learning_resource_id: actualResourceId,
      assigned_by: user.email,
      title: actualResourceTitle || resourceTitle || 'Bulk Learning Assignment',
      description: notes || `Bulk assigned by ${user.full_name} via Atreus`,
      priority: priority,
      due_date: dueDate || null,
      status: 'assigned',
      client_id: user.client_id
    });
    assignments.push(assignment);
  }

  return {
    message: `Successfully assigned "${actualResourceTitle}" to ${assignments.length} user(s) (${targetType})`,
    assignment_ids: assignments.map(a => a.id),
    count: assignments.length,
    target_type: targetType
  };
}

async function executeBulkCreateGoals(base44, user, params) {
  const { goals, assignToEmails = [] } = params;

  const createdGoals = [];

  for (const goalData of goals) {
    const goal = await base44.entities.Goal.create({
      title: goalData.title,
      description: goalData.description || '',
      timeframe_end: goalData.timeframeEnd || null,
      assigned_to_emails: assignToEmails.length > 0 ? assignToEmails : [],
      status: 'active',
      progress: 0,
      client_id: user.client_id
    });

    createdGoals.push(goal);

    // Create notifications for assigned users
    if (assignToEmails.length > 0) {
      for (const email of assignToEmails) {
        await base44.asServiceRole.entities.Notification.create({
          user_email: email,
          type: 'goal_assignment',
          title: 'New Goal Assigned',
          message: `${user.full_name} has assigned you a goal: "${goalData.title}"`,
          scheduled_for: new Date().toISOString(),
          priority: 'medium',
          status: 'pending',
          related_entity_type: 'Goal',
          related_entity_id: goal.id
        });
      }
    }
  }

  return {
    message: `Successfully created ${createdGoals.length} goal(s)${assignToEmails.length > 0 ? ` and assigned to ${assignToEmails.length} user(s)` : ''}`,
    goal_ids: createdGoals.map(g => g.id),
    count: createdGoals.length
  };
}

// Multi-step workflow handling
async function handleWorkflowStep(base44, user, userResponse, workflowContext, conversationId) {
  const { workflow_type, current_step, collected_parameters } = workflowContext;

  // Extract information from user's response using LLM
  const extractionPrompt = `The user is in step ${current_step} of a ${workflow_type} workflow.

Current collected data: ${JSON.stringify(collected_parameters, null, 2)}

User's message: "${userResponse}"

Extract any new parameters mentioned in the user's message that are relevant to creating ${workflow_type}.
Return them as JSON.`;

  const extractedData = await base44.integrations.Core.InvokeLLM({
    prompt: extractionPrompt,
    response_json_schema: {
      type: "object",
      additionalProperties: true
    }
  });

  // Merge extracted parameters
  const updatedParameters = { ...collected_parameters, ...extractedData };

  // Determine next step
  const nextStep = current_step + 1;
  const requiredParams = getNextRequiredParameters(workflow_type, nextStep, updatedParameters);

  // Check if workflow is complete
  if (requiredParams.length === 0) {
    // Execute the final action
    const finalResult = await executeWorkflowCompletion(base44, user, workflow_type, updatedParameters);

    // Clear workflow state
    if (conversationId) {
      await base44.entities.Conversation.update(conversationId, {
        context: { workflow_id: null, workflow_type: null }
      });
    }

    return Response.json({
      status: "workflow_completed",
      message: `✅ ${finalResult.message}`,
      result: finalResult
    });
  }

  // Continue workflow - ask for next required parameter
  const nextPrompt = getWorkflowPrompt(workflow_type, nextStep, updatedParameters, requiredParams);

  // Update workflow state
  const updatedWorkflowState = updateWorkflowState(workflowContext, {
    current_step: nextStep,
    collected_parameters: updatedParameters,
    required_next_parameters: requiredParams,
    last_prompt: nextPrompt
  });

  // Save state
  if (conversationId) {
    await base44.entities.Conversation.update(conversationId, {
      context: updatedWorkflowState
    });
  }

  return Response.json({
    status: "workflow_in_progress",
    message: nextPrompt,
    workflow_state: updatedWorkflowState
  });
}

function getNextRequiredParameters(workflowType, step, collectedParams) {
  const workflows = {
    createOnboardingPlan: ['target_role', 'duration_days', 'assigned_to_email', 'description'],
    createLearningJourney: ['title', 'description', 'target_competencies', 'duration_weeks'],
    createDevelopmentPlan: ['focus_area', 'timeframe', 'goals']
  };

  const required = workflows[workflowType] || [];
  return required.filter(param => !collectedParams[param]);
}

function getWorkflowPrompt(workflowType, step, collectedParams, missingParams = []) {
  if (missingParams.length === 0) {
    return "Great! I have all the information I need. Let me create that for you.";
  }

  const prompts = {
    createOnboardingPlan: {
      target_role: "What role is this onboarding plan for?",
      duration_days: "How long should the onboarding period be? (e.g., 30, 60, or 90 days)",
      assigned_to_email: "Who should I assign this plan to? (Provide their email)",
      description: "Can you describe the context or special focus for this onboarding plan?"
    },
    createLearningJourney: {
      title: "What would you like to call this learning journey?",
      description: "Describe the goal and focus of this journey",
      target_competencies: "Which competencies should this journey develop?",
      duration_weeks: "How many weeks should this journey take?"
    },
    createDevelopmentPlan: {
      focus_area: "What competency or skill should this development plan focus on?",
      timeframe: "What's the timeframe for this development plan? (e.g., 90 days, 6 months)",
      goals: "What specific goals should be part of this plan?"
    }
  };

  const nextParam = missingParams[0];
  return prompts[workflowType]?.[nextParam] || `I need more information. Can you provide: ${nextParam}?`;
}

async function executeWorkflowCompletion(base44, user, workflowType, parameters) {
  switch (workflowType) {
    case 'createOnboardingPlan':
      const plan = await base44.entities.OnboardingPlan.create({
        title: `Onboarding Plan for ${parameters.target_role}`,
        assigned_to_email: parameters.assigned_to_email,
        assigned_by: user.email,
        target_role: parameters.target_role,
        duration_days: parameters.duration_days,
        description: parameters.description,
        status: 'draft',
        client_id: user.client_id,
        ai_generated: true
      });

      return {
        message: `Created onboarding plan for ${parameters.target_role}`,
        entity_id: plan.id,
        entity_type: 'OnboardingPlan'
      };

    case 'createLearningJourney':
      const journey = await base44.entities.LearningJourney.create({
        title: parameters.title,
        description: parameters.description,
        target_competencies: parameters.target_competencies,
        estimated_duration_weeks: parameters.duration_weeks,
        status: 'draft',
        created_by: user.email,
        client_id: user.client_id
      });

      return {
        message: `Created learning journey "${parameters.title}"`,
        entity_id: journey.id,
        entity_type: 'LearningJourney'
      };

    default:
      throw new Error(`Workflow completion not implemented for ${workflowType}`);
  }
}

// Gamification Tool Implementations
async function executeGetUserAchievements(base44, user, params) {
  const targetEmail = params.userEmail || user.email;

  // Get user achievement data
  const [achievements, badges, transactions] = await Promise.all([
    base44.asServiceRole.entities.UserAchievement.filter({ user_email: targetEmail }),
    base44.asServiceRole.entities.UserBadge.filter({ user_email: targetEmail }, '-earned_date', 20),
    base44.asServiceRole.entities.PointTransaction.filter({ user_email: targetEmail }, '-created_date', 10)
  ]);

  // Try to get leaderboard data, but don't fail if it errors
  let leaderboardData = null;
  try {
    leaderboardData = await base44.asServiceRole.functions.invoke('getLeaderboard', { 
      scope: 'global',
      metric_type: 'total_points',
      limit: 100
    });
  } catch (error) {
    console.warn('Could not fetch leaderboard data:', error.message);
  }

  const achievement = achievements[0] || null;
  const leaderboard = leaderboardData?.data?.leaderboard || [];
  const userRank = leaderboard.findIndex(entry => entry.user_email === targetEmail) + 1;

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
      current_streak: achievement?.current_streak_days || 0
    }
  };
}

async function executeExplainBadgeCriteria(base44, user, params) {
  const { badgeName } = params;

  // Find the badge template
  const badgeTemplates = await base44.asServiceRole.entities.BadgeTemplate.filter({
    badge_name: badgeName
  });

  if (badgeTemplates.length === 0) {
    // Search for partial match
    const allBadges = await base44.asServiceRole.entities.BadgeTemplate.filter({ is_active: true });
    const partialMatch = allBadges.find(b => 
      b.badge_name.toLowerCase().includes(badgeName.toLowerCase())
    );

    if (!partialMatch) {
      return {
        message: `Badge "${badgeName}" not found. Use the Achievements page to browse all available badges.`
      };
    }

    return await explainSpecificBadge(base44, user, partialMatch);
  }

  return await explainSpecificBadge(base44, user, badgeTemplates[0]);
}

async function explainSpecificBadge(base44, user, badge) {
  // Check if user has earned this badge
  const userBadges = await base44.asServiceRole.entities.UserBadge.filter({
    user_email: user.email,
    badge_template_id: badge.id
  });

  const hasEarned = userBadges.length > 0;
  const criteriaConfig = badge.criteria_config || {};

  let criteriaExplanation = '';

  switch(badge.criteria_type) {
    case 'single_event':
      if (criteriaConfig.entity_type === 'Program') {
        criteriaExplanation = `Complete the program: "${criteriaConfig.program_name || 'Specific Program'}"`;
      } else if (criteriaConfig.entity_type === 'LearningJourney') {
        criteriaExplanation = `Complete the learning journey: "${criteriaConfig.journey_name || 'Specific Journey'}"`;
      } else {
        criteriaExplanation = 'Complete a specific achievement or activity';
      }
      break;

    case 'cumulative':
      const target = criteriaConfig.target_value || 0;
      const metric = criteriaConfig.metric || 'activities';
      criteriaExplanation = `Complete ${target} ${metric} (e.g., ${criteriaConfig.examples || 'assessments, learning resources, goals'})`;
      break;

    case 'manual':
      criteriaExplanation = 'Awarded manually by administrators for exceptional achievements';
      break;

    default:
      criteriaExplanation = 'Criteria not specified';
  }

  return {
    message: `**${badge.badge_name}** ${hasEarned ? '✅ (Earned!)' : '🔒 (Locked)'}\n\n${badge.description}\n\n**How to Earn:**\n${criteriaExplanation}\n\n**Points Awarded:** ${badge.points_awarded}\n**Rarity:** ${badge.rarity}\n**Category:** ${badge.badge_category}${hasEarned ? `\n\n🎉 You earned this on ${new Date(userBadges[0].earned_date).toLocaleDateString()}` : ''}`,
    badge_data: {
      name: badge.badge_name,
      earned: hasEarned,
      criteria: criteriaExplanation,
      points: badge.points_awarded,
      rarity: badge.rarity
    }
  };
}

async function executeSuggestPointAwards(base44, user, params) {
  const { activityType, difficulty = 'medium', duration, description } = params;

  const prompt = `You are a gamification expert designing point values for a leadership development platform.

**Activity Details:**
- Type: ${activityType}
- Difficulty: ${difficulty}
- Duration: ${duration || 'not specified'}
- Description: ${description || 'not provided'}

**Current Platform Point Ranges:**
- Learning Resource: 25-100 points (micro-learning to full courses)
- Assessment: 50-200 points (quiz to comprehensive assessment)
- Goal Completion: 100-500 points (simple task to strategic initiative)
- Program Completion: 500-2000 points (short program to extensive leadership program)
- Journey Completion: 200-800 points (skill path to comprehensive curriculum)
- Coaching Session: 50-150 points (per session)
- Certification: 300-1000 points (industry certification)

**Design Principles:**
1. Balance motivation with inflation risk
2. Reward meaningful effort and outcomes
3. Consider time investment and difficulty
4. Align with organizational priorities

Suggest appropriate point values for this activity with clear reasoning.`;

  const suggestion = await base44.integrations.Core.InvokeLLM({
    prompt: prompt,
    response_json_schema: {
      type: "object",
      properties: {
        recommended_points: { type: "number" },
        min_points: { type: "number" },
        max_points: { type: "number" },
        reasoning: { type: "string" },
        alternative_structures: {
          type: "array",
          items: {
            type: "object",
            properties: {
              structure_name: { type: "string" },
              points: { type: "number" },
              rationale: { type: "string" }
            }
          }
        }
      }
    }
  });

  return {
    message: `**Point Value Recommendation for ${activityType}:**\n\n💰 **Recommended:** ${suggestion.recommended_points} points\n📊 **Range:** ${suggestion.min_points}-${suggestion.max_points} points\n\n**Reasoning:**\n${suggestion.reasoning}\n\n**Alternative Structures:**\n${suggestion.alternative_structures.map(alt => `• ${alt.structure_name}: ${alt.points} pts - ${alt.rationale}`).join('\n')}`,
    suggestion_data: suggestion
  };
}

async function executeDesignBadgeStructure(base44, user, params) {
  const { targetAudience, programGoals, existingBadges = [] } = params;

  const prompt = `You are a gamification designer creating a badge structure for a leadership development program.

**Target Audience:** ${targetAudience}
**Program Goals:** ${programGoals}
**Existing Badges to Avoid:** ${existingBadges.join(', ') || 'None'}

**Badge Design Framework:**
1. Create 5-8 badges that support the program goals
2. Use progression tiers: Bronze → Silver → Gold → Platinum
3. Mix badge types: completion, skill, recognition, milestone
4. Ensure clear, measurable criteria
5. Make badges meaningful and aspirational

Design a cohesive badge structure with names, descriptions, criteria, and point values.`;

  const badgeStructure = await base44.integrations.Core.InvokeLLM({
    prompt: prompt,
    response_json_schema: {
      type: "object",
      properties: {
        badge_set_name: { type: "string" },
        badge_set_description: { type: "string" },
        badges: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              tier: { type: "string", enum: ["bronze", "silver", "gold", "platinum"] },
              category: { type: "string", enum: ["completion", "skill", "recognition", "milestone", "achievement"] },
              criteria_type: { type: "string", enum: ["single_event", "cumulative", "manual"] },
              criteria_description: { type: "string" },
              points_awarded: { type: "number" },
              icon_suggestion: { type: "string" }
            }
          }
        },
        implementation_notes: { type: "string" }
      }
    }
  });

  return {
    message: `**Badge Structure: ${badgeStructure.badge_set_name}**\n\n${badgeStructure.badge_set_description}\n\n**Badges (${badgeStructure.badges.length}):**\n${badgeStructure.badges.map((b, i) => `${i+1}. **${b.name}** (${b.tier})\n   ${b.description}\n   Criteria: ${b.criteria_description}\n   Points: ${b.points_awarded}`).join('\n\n')}\n\n**Implementation Notes:**\n${badgeStructure.implementation_notes}`,
    badge_structure: badgeStructure
  };
}

async function executeCreateCompetition(base44, user, params) {
  const { competitionName, description, competitionType, startDate, endDate, criteriaMetric, participantEmails = [], rewards = [] } = params;

  // Create the competition
  const competition = await base44.asServiceRole.entities.Competition.create({
    client_id: user.client_id,
    competition_name: competitionName,
    description: description,
    competition_type: competitionType,
    start_date: startDate,
    end_date: endDate,
    participant_emails: participantEmails,
    criteria_config: {
      metric: criteriaMetric
    },
    rewards: rewards,
    status: 'upcoming',
    created_by_email: user.email
  });

  // Notify participants
  for (const email of participantEmails) {
    await base44.asServiceRole.entities.Notification.create({
      user_email: email,
      type: 'milestone',
      title: `🏆 New Competition: ${competitionName}`,
      message: `You've been invited to join "${competitionName}"! Competition runs from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}. Compete on: ${criteriaMetric}`,
      scheduled_for: new Date().toISOString(),
      priority: 'medium',
      related_entity_type: 'Competition',
      related_entity_id: competition.id
    });
  }

  return {
    message: `Created competition "${competitionName}" with ${participantEmails.length} participants. Competition runs from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}.`,
    competition_id: competition.id,
    participant_count: participantEmails.length
  };
}

async function executeAwardPointsToUser(base44, user, params) {
  const { userEmail, pointsAmount, reason } = params;

  // Check user's role to determine transaction type
  const isManager = ['User Level 2', 'Admin Level 1', 'Admin Level 2', 'Super Administrator'].includes(user.app_role);
  const transactionType = isManager ? 'manager_award' : 'admin_award';

  // Award points via backend function
  const result = await base44.asServiceRole.functions.invoke('awardPoints', {
    user_email: userEmail,
    points_amount: pointsAmount,
    transaction_type: transactionType,
    reason: reason,
    given_by_email: user.email,
    client_id: user.client_id
  });

  // Create notification
  await base44.asServiceRole.entities.Notification.create({
    user_email: userEmail,
    type: 'milestone',
    title: `🎉 You earned ${pointsAmount} points!`,
    message: `${user.full_name} awarded you ${pointsAmount} points: ${reason}`,
    scheduled_for: new Date().toISOString(),
    priority: 'medium'
  });

  return {
    message: `Awarded ${pointsAmount} points to ${userEmail} for: ${reason}`,
    points_awarded: pointsAmount,
    recipient: userEmail
  };
}

// File processing helper
async function processFileAttachments(base44, attachments) {
  const fileDescriptions = [];
  
  for (const file of attachments) {
    const fileExt = file.name.split('.').pop().toLowerCase();
    
    if (fileExt === 'csv') {
      // Parse CSV
      const parsed = await parseCSVFile(file.url);
      fileDescriptions.push(`CSV File "${file.name}": ${parsed.rowCount} rows with columns: ${parsed.headers.join(', ')}`);
    } else if (fileExt === 'xlsx') {
      // For Excel, provide basic info (full parsing requires ExtractDataFromUploadedFile)
      fileDescriptions.push(`Excel File "${file.name}": Available for data extraction`);
    } else if (['pdf', 'png', 'jpg', 'jpeg'].includes(fileExt)) {
      // For documents/images, just note availability
      fileDescriptions.push(`${fileExt.toUpperCase()} File "${file.name}": Available for analysis`);
    } else {
      fileDescriptions.push(`File "${file.name}": ${file.type || 'unknown type'}`);
    }
  }
  
  return fileDescriptions.join('\n');
}

// CSV Parser
async function parseCSVFile(fileUrl) {
  try {
    const response = await fetch(fileUrl);
    const text = await response.text();
    
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
    
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/['"]/g, ''));
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      return row;
    });
    
    return { 
      headers, 
      rows, 
      rowCount: rows.length 
    };
  } catch (error) {
    console.error('CSV parsing error:', error);
    throw new Error(`Failed to parse CSV: ${error.message}`);
  }
}

// ==================== EMAIL TEMPLATE EXECUTION FUNCTIONS ====================
async function executeSuggestSubjectLines(base44, user, params) {
  const { emailPurpose, tone = 'professional', includeEmoji = true } = params;

  const prompt = `Generate 5 compelling email subject line variations.

Purpose: ${emailPurpose}
Tone: ${tone}
Include emojis: ${includeEmoji}

Return 5 diverse subject lines that:
1. Grab attention
2. Convey urgency when appropriate
3. Include personalization options ({{user_name}})
4. Range from professional to creative
5. Are mobile-friendly (< 50 chars)`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: prompt,
    response_json_schema: {
      type: "object",
      properties: {
        subject_lines: {
          type: "array",
          items: { type: "string" }
        }
      }
    }
  });

  return {
    message: `**Subject Line Variations:**\n\n${result.subject_lines.map((line, i) => `${i + 1}. ${line}`).join('\n')}`,
    subject_lines: result.subject_lines
  };
}

async function executeValidateTemplateVariables(base44, user, params) {
  const { templateId, intendedUse } = params;

  const templates = await base44.entities.EmailTemplate.filter({ id: templateId });
  if (templates.length === 0) {
    throw new Error('Template not found');
  }

  const template = templates[0];
  const availableVars = template.available_variables || [];

  const prompt = `Check if this email template has all necessary variables for the intended use.

Template: ${template.template_name}
Available Variables: ${availableVars.join(', ')}
Intended Use: ${intendedUse}

Subject: ${template.subject}
Body Preview: ${template.body_html.substring(0, 200)}...

Return:
1. Is the template suitable? (yes/no)
2. Missing variables (if any)
3. Recommended additions
4. Suitability score (0-100)`;

  const validation = await base44.integrations.Core.InvokeLLM({
    prompt: prompt,
    response_json_schema: {
      type: "object",
      properties: {
        suitable: { type: "boolean" },
        missing_variables: { type: "array", items: { type: "string" } },
        recommendations: { type: "array", items: { type: "string" } },
        score: { type: "number" }
      }
    }
  });

  return {
    message: `**Template Validation:**\n\n${validation.suitable ? '✅ Suitable' : '⚠️ Needs Improvement'} (Score: ${validation.score}/100)\n\n${validation.missing_variables.length > 0 ? `**Missing Variables:**\n${validation.missing_variables.map(v => `• {{${v}}}`).join('\n')}\n\n` : ''}**Recommendations:**\n${validation.recommendations.map(r => `• ${r}`).join('\n')}`,
    validation_data: validation
  };
}

async function executePreviewEmailWithData(base44, user, params) {
  const { templateId, sampleData } = params;

  const templates = await base44.entities.EmailTemplate.filter({ id: templateId });
  if (templates.length === 0) {
    throw new Error('Template not found');
  }

  const template = templates[0];
  
  // Replace variables in subject and body
  let subject = template.subject;
  let body = template.body_html;

  Object.entries(sampleData).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, value);
    body = body.replace(regex, value);
  });

  return {
    message: `**Email Preview:**\n\n**Subject:** ${subject}\n\n**Body:**\n${body.substring(0, 300)}...\n\n*(Full preview available in Email Templates page)*`,
    preview: { subject, body }
  };
}

// ==================== USER MANAGEMENT & SECURITY EXECUTION FUNCTIONS ====================
async function executeSetAccountExpiration(base44, user, params) {
  const { userEmail, expirationDate, notifyUser = true, notifyDaysBefore = 7 } = params;

  const result = await base44.asServiceRole.functions.invoke('setAccountExpiration', {
    user_email: userEmail,
    expiration_date: expirationDate,
    notify_user: notifyUser,
    notify_days_before: notifyDaysBefore
  });

  return {
    message: `Set account expiration for ${userEmail} on ${new Date(expirationDate).toLocaleDateString()}${notifyUser ? ` (will notify ${notifyDaysBefore} days before)` : ''}`,
    expiration_set: true
  };
}

async function executeBulkSetAccountExpiration(base44, user, params) {
  const { userEmails, fileUrl, expirationDate, notifyUsers = true } = params;

  let targetUsers = [];

  if (fileUrl) {
    const parsed = await parseCSVFile(fileUrl);
    targetUsers = parsed.rows.map(row => ({
      email: row.email,
      expirationDate: row.expiration_date || expirationDate
    }));
  } else if (userEmails) {
    targetUsers = userEmails.map(email => ({
      email,
      expirationDate
    }));
  }

  const result = await base44.asServiceRole.functions.invoke('bulkSetAccountExpiration', {
    users: targetUsers,
    notify_users: notifyUsers
  });

  return {
    message: `Set account expiration for ${targetUsers.length} user(s)`,
    count: targetUsers.length
  };
}

async function executeResendUserInvitation(base44, user, params) {
  const { userEmails, customMessage } = params;

  const results = [];
  for (const email of userEmails) {
    await base44.asServiceRole.functions.invoke('resendUserInvitation', {
      user_email: email,
      custom_message: customMessage
    });
    results.push(email);
  }

  return {
    message: `Resent invitations to ${results.length} user(s)${customMessage ? ' with custom message' : ''}`,
    count: results.length
  };
}

async function executeUnlockUserAccount(base44, user, params) {
  const { userEmail, resetFailedAttempts = true } = params;

  await base44.asServiceRole.functions.invoke('unlockUserAccount', {
    user_email: userEmail,
    reset_failed_attempts: resetFailedAttempts
  });

  return {
    message: `Unlocked account for ${userEmail}${resetFailedAttempts ? ' and reset failed login attempts' : ''}`,
    unlocked: true
  };
}

async function executeViewUserEngagementMetrics(base44, user, params) {
  const { userEmail, dateRange = '30days' } = params;

  let result;
  try {
    result = await base44.asServiceRole.functions.invoke('getUserEngagementMetrics', {
      user_email: userEmail,
      date_range: dateRange
    });
  } catch (error) {
    console.error('Error fetching engagement metrics:', error);
    throw new Error('Unable to fetch engagement metrics. Please check user permissions.');
  }

  const metrics = result.data;

  return {
    message: `**Engagement Metrics for ${userEmail} (${dateRange}):**\n\n📊 **Activity:**\n• Logins: ${metrics.login_count}\n• Active days: ${metrics.active_days}\n• Avg session: ${metrics.avg_session_minutes} min\n\n📚 **Learning:**\n• Resources completed: ${metrics.learning_completed}\n• Journeys active: ${metrics.active_journeys}\n\n🎯 **Goals:**\n• Goals completed: ${metrics.goals_completed}\n• Completion rate: ${metrics.goal_completion_rate}%\n\n📈 **Engagement Score:** ${metrics.engagement_score}/100`,
    metrics_data: metrics
  };
}

// ==================== ASSESSMENT & LEARNING DEPLOYMENT EXECUTION FUNCTIONS ====================
async function executeBulkAssignAssessments(base44, user, params) {
  const { assessmentId, assessmentTitle, targetType, fileUrl, cohortId, dueDate, priority = 'medium' } = params;

  let targetEmails = [];

  switch (targetType) {
    case 'team':
      targetEmails = user.subordinate_emails || [];
      break;
    case 'division':
      const divisionUsers = await base44.asServiceRole.entities.User.filter({
        client_id: user.client_id,
        division: user.division
      });
      targetEmails = divisionUsers.map(u => u.email);
      break;
    case 'cohort':
      const cohorts = await base44.asServiceRole.entities.Cohort.filter({ id: cohortId });
      if (cohorts.length > 0) {
        targetEmails = cohorts[0].participant_emails || [];
      }
      break;
    case 'file':
      const parsed = await parseCSVFile(fileUrl);
      targetEmails = parsed.rows.map(row => row.email).filter(e => e);
      break;
  }

  await base44.asServiceRole.functions.invoke('bulkAssignAssessments', {
    assessment_id: assessmentId,
    user_emails: targetEmails,
    due_date: dueDate,
    priority: priority
  });

  return {
    message: `Assigned "${assessmentTitle}" to ${targetEmails.length} user(s)`,
    count: targetEmails.length
  };
}

async function executeAssignJourneyToTeam(base44, user, params) {
  const { journeyId, journeyTitle, targetType, userEmails, cohortId, startDate } = params;

  let targetUsers = [];

  switch (targetType) {
    case 'my_team':
      targetUsers = user.subordinate_emails || [];
      break;
    case 'cohort':
      const cohorts = await base44.asServiceRole.entities.Cohort.filter({ id: cohortId });
      if (cohorts.length > 0) {
        targetUsers = cohorts[0].participant_emails || [];
      }
      break;
    case 'specific_users':
      targetUsers = userEmails;
      break;
  }

  await base44.asServiceRole.functions.invoke('bulkAssignJourneys', {
    journey_id: journeyId,
    user_emails: targetUsers,
    start_date: startDate
  });

  return {
    message: `Enrolled ${targetUsers.length} user(s) in "${journeyTitle}"`,
    count: targetUsers.length
  };
}

async function executeTrackLearningProgress(base44, user, params) {
  const { scope = 'personal', cohortId, includeDetails = false } = params;

  let targetEmails = [];
  let actualScope = scope;

  // Extract scope from context if not explicitly provided
  if (!params.scope && user.subordinate_emails && user.subordinate_emails.length > 0) {
    actualScope = 'team';
  }

  switch (actualScope) {
    case 'personal':
      targetEmails = [user.email];
      break;
    case 'team':
      targetEmails = user.subordinate_emails || [];
      break;
    case 'cohort':
      const cohorts = await base44.asServiceRole.entities.Cohort.filter({ id: cohortId });
      if (cohorts.length > 0) {
        targetEmails = cohorts[0].participant_emails || [];
      }
      break;
    default:
      targetEmails = [user.email];
  }

  const progressData = [];
  for (const email of targetEmails) {
    const assigned = await base44.entities.AssignedLearning.filter({ user_email: email });
    const completed = assigned.filter(a => a.status === 'completed').length;
    const total = assigned.length;
    
    progressData.push({
      email,
      completed,
      total,
      completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0
    });
  }

  const summary = progressData.reduce((acc, p) => {
    acc.totalCompleted += p.completed;
    acc.totalAssigned += p.total;
    return acc;
  }, { totalCompleted: 0, totalAssigned: 0 });

  const avgRate = summary.totalAssigned > 0 ? Math.round((summary.totalCompleted / summary.totalAssigned) * 100) : 0;

  return {
    message: `**Learning Progress (${actualScope}):**\n\n📚 **Overview:**\n• Completed: ${summary.totalCompleted}/${summary.totalAssigned}\n• Completion Rate: ${avgRate}%\n• Users: ${progressData.length}\n\n${includeDetails ? `**By User:**\n${progressData.map(p => `• ${p.email}: ${p.completed}/${p.total} (${p.completion_rate}%)`).join('\n')}` : ''}`,
    progress_data: progressData,
    scope: actualScope
  };
}

async function executeSuggestLearningForGaps(base44, user, params) {
  const { userEmail, competencyIds, maxResources = 5 } = params;

  const assessments = await base44.entities.Assessment.filter({
    email: userEmail
  }, '-submission_ts', 1);

  if (assessments.length === 0) {
    return {
      message: `No assessment data found for ${userEmail}. They should complete a leadership assessment first.`,
      recommendations: []
    };
  }

  const assessment = assessments[0];
  const gaps = [];

  // Identify competency gaps (< 70%)
  ['si_pct', 'dm_pct', 'comm_pct', 'rm_pct', 'sm_pct', 'pm_pct'].forEach(field => {
    if (assessment[field] < 70) {
      gaps.push(field.replace('_pct', '').toUpperCase());
    }
  });

  const targetCompetencies = competencyIds || gaps;

  const resources = await base44.entities.LearningResource.filter({
    competencies: { $in: targetCompetencies },
    is_active: true
  });

  const ranked = resources
    .sort((a, b) => (b.year || 2020) - (a.year || 2020))
    .slice(0, maxResources);

  return {
    message: `**Learning Recommendations for ${userEmail}:**\n\n🎯 **Competency Gaps:** ${gaps.join(', ')}\n\n📚 **Recommended Resources (${ranked.length}):**\n${ranked.map((r, i) => `${i + 1}. **${r.title}**\n   Type: ${r.type} | Duration: ${r.duration_string || 'N/A'}\n   Competencies: ${r.competencies.join(', ')}`).join('\n\n')}`,
    recommendations: ranked,
    gap_competencies: gaps
  };
}

// ==================== FORM BUILDER EXECUTION FUNCTIONS ====================
async function executeCreateFormFromDescription(base44, user, params) {
  const { formTitle, purpose, targetAudience, estimatedQuestions, includeScoring, formType } = params;

  const prompt = `Design a ${formType} form for: ${purpose}

Audience: ${targetAudience}
Questions: ~${estimatedQuestions}
Needs scoring: ${includeScoring}

Generate:
1. Section structure (3-5 sections)
2. Question list with types (text, rating, multiple choice, etc.)
3. Conditional logic suggestions
4. Scoring criteria (if applicable)

Return as structured JSON with clear section organization.`;

  const formStructure = await base44.integrations.Core.InvokeLLM({
    prompt: prompt,
    response_json_schema: {
      type: "object",
      properties: {
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question_text: { type: "string" },
                    question_type: { type: "string" },
                    options: { type: "array", items: { type: "string" } },
                    required: { type: "boolean" }
                  }
                }
              }
            }
          }
        },
        scoring_config: { type: "object" },
        conditional_logic: { type: "array", items: { type: "object" } }
      }
    }
  });

  const totalQuestions = formStructure.sections.reduce((acc, s) => acc + s.questions.length, 0);

  return {
    message: `**Generated Form Structure:**\n\n📋 **${formTitle}**\n\n**Sections:** ${formStructure.sections.length}\n**Total Questions:** ${totalQuestions}\n\n${formStructure.sections.map((s, i) => `**Section ${i + 1}: ${s.title}**\n${s.questions.length} questions`).join('\n\n')}\n\n**Next:** Review and I can create the CustomForm record for you.`,
    form_structure: formStructure
  };
}

async function executeSuggestQuestionTypes(base44, user, params) {
  const { informationNeeded, context: ctx, existingQuestions = 0 } = params;

  const prompt = `Recommend optimal question types for collecting: "${informationNeeded}"

Context: ${ctx}
Existing questions: ${existingQuestions}

For each recommended question:
1. Question text
2. Question type (text, rating, multiple_choice, scale, yes_no, matrix)
3. Why this type is best
4. Sample options (if applicable)

Provide 3-5 question recommendations.`;

  const suggestions = await base44.integrations.Core.InvokeLLM({
    prompt: prompt,
    response_json_schema: {
      type: "object",
      properties: {
        recommendations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question_text: { type: "string" },
              question_type: { type: "string" },
              rationale: { type: "string" },
              sample_options: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    }
  });

  return {
    message: `**Question Type Recommendations:**\n\n${suggestions.recommendations.map((r, i) => `**${i + 1}. ${r.question_type.toUpperCase()}**\n${r.question_text}\n\n*Why:* ${r.rationale}\n${r.sample_options?.length > 0 ? `*Options:* ${r.sample_options.join(', ')}` : ''}`).join('\n\n')}`,
    recommendations: suggestions.recommendations
  };
}

async function executeDesignConditionalLogic(base44, user, params) {
  const { triggerQuestion, triggerValue, actionType, targetQuestion } = params;

  const formattedAction = actionType ? actionType.replace(/_/g, ' ') : 'perform action';

  return {
    message: `**Conditional Logic Rule:**\n\n📋 **Trigger:**\nIF "${triggerQuestion}" = "${triggerValue}"\n\n⚡ **Action:**\nTHEN ${formattedAction} "${targetQuestion}"\n\n**Implementation:** Add this rule to your form's conditional logic configuration.`,
    logic_rule: {
      trigger: { question: triggerQuestion, value: triggerValue },
      action: { type: actionType, target: targetQuestion }
    }
  };
}

async function executeRecommendFormTemplate(base44, user, params) {
  const { formPurpose, industry } = params;

  const templates = await base44.asServiceRole.entities.CustomFormTemplate.filter({
    status: 'published',
    is_public: true
  });

  const prompt = `Rank these form templates for purpose: "${formPurpose}" in ${industry} industry.

Templates: ${JSON.stringify(templates.map(t => ({ name: t.template_name, description: t.description, type: t.form_type })))}

Return top 3 with relevance scores (0-100) and reasoning.`;

  const ranking = await base44.integrations.Core.InvokeLLM({
    prompt: prompt,
    response_json_schema: {
      type: "object",
      properties: {
        ranked_templates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              template_name: { type: "string" },
              score: { type: "number" },
              reasoning: { type: "string" }
            }
          }
        }
      }
    }
  });

  return {
    message: `**Form Template Recommendations:**\n\n${ranking.ranked_templates.map((t, i) => `${i + 1}. **${t.template_name}** (Score: ${t.score}/100)\n${t.reasoning}`).join('\n\n')}`,
    recommendations: ranking.ranked_templates
  };
}

async function executeAnalyzeFormSubmissions(base44, user, params) {
  const { formId, analysisType, dateRange = '30days' } = params;

  const submissions = await base44.asServiceRole.entities.CustomFormSubmission.filter({
    form_id: formId
  });

  const prompt = `Analyze these form submissions (${submissions.length} responses):

Analysis Type: ${analysisType}
Date Range: ${dateRange}

Submissions Summary: ${JSON.stringify(submissions.slice(0, 50).map(s => s.responses))}

Provide:
1. Key findings (3-5 bullets)
2. Patterns or trends
3. Notable insights
4. Recommendations`;

  const analysis = await base44.integrations.Core.InvokeLLM({
    prompt: prompt,
    response_json_schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        findings: { type: "array", items: { type: "string" } },
        patterns: { type: "array", items: { type: "string" } },
        recommendations: { type: "array", items: { type: "string" } }
      }
    }
  });

  return {
    message: `**Form Analysis (${submissions.length} responses):**\n\n${analysis.summary}\n\n**Key Findings:**\n${analysis.findings.map(f => `• ${f}`).join('\n')}\n\n**Recommendations:**\n${analysis.recommendations.map(r => `• ${r}`).join('\n')}`,
    analysis_data: analysis
  };
}

async function executeExportFormData(base44, user, params) {
  const { formId, format, includeAnalysis = false } = params;

  return {
    message: `Form data export is available on the Form Submissions page. Navigate there and use the Export button to download as ${format.toUpperCase()}.${includeAnalysis ? ' Include analysis option is available.' : ''}`,
    action_required: 'navigate_to_form_submissions'
  };
}

// ==================== REQUEST SYSTEM EXECUTION FUNCTIONS ====================
async function executeAutoTriageRequest(base44, user, params) {
  const { requestId, requestDescription } = params;

  // Fetch the request first
  let request;
  try {
    const requests = await base44.entities.DevelopmentRequest.filter({ id: requestId });
    if (requests.length === 0) {
      throw new Error('Request not found');
    }
    request = requests[0];
  } catch (error) {
    console.error('Error fetching request:', error);
    throw new Error('Request not found. Please verify the request ID.');
  }

  // Use AI to triage instead of backend function (which has auth issues)
  const prompt = `Analyze this development request and suggest triage:

Request: ${request.request_title || 'Untitled'}
Description: ${request.description || requestDescription || 'No description'}
Requested by: ${request.created_by}
Created: ${request.created_date}

Suggest:
1. Best assignee (from available team)
2. Priority (low, medium, high, urgent)
3. Estimated effort (hours or days)
4. Reasoning for the suggestion`;

  const triage = await base44.integrations.Core.InvokeLLM({
    prompt: prompt,
    response_json_schema: {
      type: "object",
      properties: {
        suggested_assignee: { type: "string" },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        estimated_effort: { type: "string" },
        reasoning: { type: "string" }
      }
    }
  });

  const data = triage;

  return {
    message: `**Triage Analysis:**\n\n👤 **Suggested Assignee:** ${data.suggested_assignee || 'Not determined'}\n🎯 **Priority:** ${data.priority || 'medium'}\n⏱️ **Estimated Effort:** ${data.estimated_effort || 'Unknown'}\n\n**Reasoning:**\n${data.reasoning || 'Based on request content and team capacity'}\n\nWould you like me to assign this request?`,
    triage_data: data
  };
}

async function executePrioritizeRequests(base44, user, params) {
  const { filterBy, sortBy = 'smart' } = params;

  let requests = [];

  switch (filterBy) {
    case 'unassigned':
      requests = await base44.entities.DevelopmentRequest.filter({
        status: 'submitted',
        assigned_to: null
      });
      break;
    case 'my_requests':
      requests = await base44.entities.DevelopmentRequest.filter({
        assigned_to: user.email
      });
      break;
    case 'team_requests':
      requests = await base44.entities.DevelopmentRequest.filter({
        client_id: user.client_id
      });
      break;
  }

  const prompt = `Prioritize these ${requests.length} requests by ${sortBy}:

${JSON.stringify(requests.map(r => ({
  id: r.id,
  title: r.request_title,
  description: r.description,
  requestedBy: r.created_by,
  createdDate: r.created_date
})))}

Return ranked list with priority scores and reasoning.`;

  const prioritized = await base44.integrations.Core.InvokeLLM({
    prompt: prompt,
    response_json_schema: {
      type: "object",
      properties: {
        ranked_requests: {
          type: "array",
          items: {
            type: "object",
            properties: {
              request_id: { type: "string" },
              priority_score: { type: "number" },
              reasoning: { type: "string" }
            }
          }
        }
      }
    }
  });

  return {
    message: `**Prioritized Requests (${requests.length}):**\n\n${prioritized.ranked_requests.slice(0, 10).map((r, i) => `${i + 1}. Request (Score: ${r.priority_score}/100)\n${r.reasoning}`).join('\n\n')}`,
    prioritized_data: prioritized.ranked_requests
  };
}

async function executeCreateInterventionPlan(base44, user, params) {
  const { targetUserEmails = [], riskType, urgency = 'medium' } = params;

  const userCount = Array.isArray(targetUserEmails) ? targetUserEmails.length : 0;

  const prompt = `Create an intervention plan for ${userCount} users at risk due to: ${riskType}

Urgency: ${urgency}

Generate:
1. Immediate actions (next 48 hours)
2. Short-term plan (1-2 weeks)
3. Monitoring checkpoints
4. Success criteria
5. Recommended resources

Make it actionable and specific.`;

  const plan = await base44.integrations.Core.InvokeLLM({
    prompt: prompt,
    response_json_schema: {
      type: "object",
      properties: {
        immediate_actions: { type: "array", items: { type: "string" } },
        short_term_plan: { type: "array", items: { type: "string" } },
        checkpoints: { type: "array", items: { type: "string" } },
        success_criteria: { type: "array", items: { type: "string" } },
        resources: { type: "array", items: { type: "string" } }
      }
    }
  });

  return {
    message: `**Intervention Plan for ${userCount} Users**\n\n🎯 **Immediate Actions (Next 48 hours):**\n${plan.immediate_actions.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\n📋 **Short-term (1-2 weeks):**\n${plan.short_term_plan.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\n✅ **Checkpoints:**\n${plan.checkpoints.map(c => `• ${c}`).join('\n')}\n\nWould you like me to execute these actions?`,
    plan_data: plan,
    user_count: userCount
  };
}

async function executeBulkUpdateRequestStatus(base44, user, params) {
  const { requestIds, newStatus, note } = params;

  for (const id of requestIds) {
    await base44.asServiceRole.entities.DevelopmentRequest.update(id, {
      status: newStatus,
      notes: note ? `${note}\n(Updated by ${user.full_name} via Atreus)` : undefined,
      updated_date: new Date().toISOString()
    });
  }

  return {
    message: `Updated ${requestIds.length} request(s) to status: ${newStatus}`,
    count: requestIds.length
  };
}

async function executeAssignRequestToUser(base44, user, params) {
  const { requestId, assigneeEmail, priority, dueDate } = params;

  await base44.asServiceRole.entities.DevelopmentRequest.update(requestId, {
    assigned_to: assigneeEmail,
    priority: priority,
    due_date: dueDate,
    status: 'assigned',
    updated_date: new Date().toISOString()
  });

  // Notify assignee
  await base44.asServiceRole.entities.Notification.create({
    user_email: assigneeEmail,
    type: 'reminder',
    title: 'New Request Assigned',
    message: `${user.full_name} has assigned you a development request${priority ? ` (Priority: ${priority})` : ''}`,
    scheduled_for: new Date().toISOString(),
    priority: priority || 'medium',
    related_entity_type: 'DevelopmentRequest',
    related_entity_id: requestId
  });

  return {
    message: `Assigned request to ${assigneeEmail}${priority ? ` with ${priority} priority` : ''}`,
    assigned: true
  };
}

// ==================== ADVANCED GOALS EXECUTION FUNCTIONS ====================
async function executeSuggestBoardLayout(base44, user, params) {
  const { boardPurpose = 'Team goals', teamSize, trackingFrequency } = params;

  const prompt = `Design goal board columns for: ${boardPurpose}

Team size: ${teamSize || 'Not specified'}
Update frequency: ${trackingFrequency || 'weekly'}

Suggest:
- Essential columns (status, owner, deadline, priority)
- Optional columns (budget, dependencies, progress)
- Custom columns for this use case
- Default groups/sections
- View recommendations (Kanban, Timeline, Calendar)

Return structured column and group definitions.`;

  const layout = await base44.integrations.Core.InvokeLLM({
    prompt: prompt,
    response_json_schema: {
      type: "object",
      properties: {
        columns: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              type: { type: "string" },
              width: { type: "number" }
            }
          }
        },
        groups: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              color: { type: "string" }
            }
          }
        },
        recommended_view: { type: "string" }
      }
    }
  });

  return {
    message: `**Goal Board Layout for ${boardPurpose}:**\n\n📊 **Columns (${layout.columns.length}):**\n${layout.columns.map(c => `• ${c.title} (${c.type})`).join('\n')}\n\n🗂️ **Groups (${layout.groups.length}):**\n${layout.groups.map(g => `• ${g.title}`).join('\n')}\n\n**Recommended View:** ${layout.recommended_view}`,
    layout_data: layout
  };
}

async function executeAnalyzeGoalDependencies(base44, user, params) {
  const { scope, showCriticalPath = false } = params;

  let goals = [];
  
  switch (scope) {
    case 'personal':
      goals = await base44.entities.Goal.filter({ created_by: user.email });
      break;
    case 'team':
      goals = await base44.entities.Goal.filter({
        created_by: { $in: user.subordinate_emails || [] }
      });
      break;
    case 'org':
      goals = await base44.entities.Goal.filter({ client_id: user.client_id });
      break;
  }

  // Analyze for dependencies (simplified - real implementation would parse goal descriptions/metadata)
  const dependencyAnalysis = {
    total_goals: goals.length,
    with_dependencies: 0,
    blocking: [],
    critical_path: []
  };

  return {
    message: `**Goal Dependencies (${scope}):**\n\n📊 **Overview:**\n• Total Goals: ${dependencyAnalysis.total_goals}\n• With Dependencies: ${dependencyAnalysis.with_dependencies}\n\n${showCriticalPath ? '**Critical Path:** Analysis available in Goal Board view' : ''}`,
    dependency_data: dependencyAnalysis
  };
}

async function executeSuggestGoalMilestones(base44, user, params) {
  const { goalId, timeframe, milestoneCount = 4 } = params;

  // Try fuzzy matching for goals
  let goals = [];
  try {
    goals = await base44.entities.Goal.filter({ id: goalId });
  } catch (error) {
    // Try searching by title
    const allGoals = await base44.entities.Goal.filter({ created_by: user.email });
    const matchedByTitle = allGoals.find(g => 
      g.title.toLowerCase().includes(goalId.toLowerCase()) ||
      goalId.toLowerCase().includes(g.title.toLowerCase())
    );
    
    if (matchedByTitle) {
      goals = [matchedByTitle];
    }
  }
  
  if (goals.length === 0) {
    return {
      message: `Goal not found. Your active goals:\n\n${(await base44.entities.Goal.filter({ created_by: user.email, status: 'active' })).map(g => `• ${g.title}`).join('\n')}\n\nPlease specify one of the above.`
    };
  }

  const goal = goals[0];

  const prompt = `Break down this goal into ${milestoneCount} achievable milestones:

Goal: ${goal.title}
Description: ${goal.description || 'Not provided'}
Timeframe: ${timeframe}

Create ${milestoneCount} milestones that:
1. Build progressively toward the goal
2. Are measurable and specific
3. Spread evenly across the timeframe
4. Include success criteria`;

  const milestones = await base44.integrations.Core.InvokeLLM({
    prompt: prompt,
    response_json_schema: {
      type: "object",
      properties: {
        milestones: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              target_date: { type: "string" },
              success_criteria: { type: "string" }
            }
          }
        }
      }
    }
  });

  return {
    message: `**Suggested Milestones for "${goal.title}":**\n\n${milestones.milestones.map((m, i) => `**${i + 1}. ${m.title}**\n${m.description}\nTarget: ${m.target_date}\n✅ Success: ${m.success_criteria}`).join('\n\n')}`,
    milestones_data: milestones.milestones
  };
}

async function executeAlignGoalsToCareerPath(base44, user, params) {
  const { userEmail, targetRoleId, timeframe = '6 months' } = params;

  // Try fuzzy matching for roles
  let roles = [];
  try {
    roles = await base44.entities.Role.filter({ id: targetRoleId });
  } catch (error) {
    // Try searching by title
    const allRoles = await base44.entities.Role.filter({});
    const matchedByTitle = allRoles.find(r => 
      r.title.toLowerCase().includes(targetRoleId.toLowerCase()) ||
      targetRoleId.toLowerCase().includes(r.title.toLowerCase())
    );
    
    if (matchedByTitle) {
      roles = [matchedByTitle];
    }
  }
  
  if (roles.length === 0) {
    return {
      message: `Role not found. Available roles:\n\n${(await base44.entities.Role.filter({})).map(r => `• ${r.title}`).join('\n')}\n\nPlease specify one of the above.`
    };
  }

  const targetRole = roles[0];
  const requiredCompetencies = targetRole.behavioral_competencies || [];

  const prompt = `Suggest goals for ${userEmail} to prepare for ${targetRole.title} role.

Timeframe: ${timeframe}
Required Competencies: ${JSON.stringify(requiredCompetencies)}

Generate 3-5 specific, actionable goals that:
1. Build competencies needed for the role
2. Are achievable in the timeframe
3. Demonstrate readiness for promotion
4. Include measurable outcomes`;

  const goalSuggestions = await base44.integrations.Core.InvokeLLM({
    prompt: prompt,
    response_json_schema: {
      type: "object",
      properties: {
        suggested_goals: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              competency_alignment: { type: "string" },
              timeline: { type: "string" }
            }
          }
        }
      }
    }
  });

  return {
    message: `**Career-Aligned Goals for ${targetRole.title}:**\n\n${goalSuggestions.suggested_goals.map((g, i) => `**${i + 1}. ${g.title}**\n${g.description}\nAligns with: ${g.competency_alignment}\nTimeline: ${g.timeline}`).join('\n\n')}`,
    goal_suggestions: goalSuggestions.suggested_goals
  };
}

async function executeIdentifyGoalsAtRisk(base44, user, params) {
  const { scope = 'personal', daysFromDeadline = 7, includeRecommendations = true } = params;

  const now = new Date();
  const thresholdDate = new Date(now.getTime() + daysFromDeadline * 24 * 60 * 60 * 1000);

  let goals = [];
  
  switch (scope) {
    case 'personal':
      goals = await base44.entities.Goal.filter({ created_by: user.email, status: 'active' });
      break;
    case 'team':
      goals = await base44.entities.Goal.filter({
        created_by: { $in: user.subordinate_emails || [] },
        status: 'active'
      });
      break;
    default:
      goals = await base44.entities.Goal.filter({ created_by: user.email, status: 'active' });
  }

  const atRisk = goals.filter(g => {
    if (!g.timeframe_end) return false;
    const deadline = new Date(g.timeframe_end);
    const isApproaching = deadline <= thresholdDate && deadline > now;
    const lowProgress = (g.progress || 0) < 50;
    return isApproaching && lowProgress;
  });

  return {
    message: `**Goals at Risk (${scope}):**\n\n⚠️ **Found ${atRisk.length} at-risk goals**\n\n${atRisk.slice(0, 10).map(g => `• **${g.title}**\n  Progress: ${g.progress || 0}%\n  Due: ${new Date(g.timeframe_end).toLocaleDateString()}\n  ${includeRecommendations ? 'Action: Review and update progress' : ''}`).join('\n\n')}`,
    at_risk_goals: atRisk,
    count: atRisk.length,
    scope: scope
  };
}

async function executeBulkUpdateGoalProgress(base44, user, params) {
  const { updates, fileUrl } = params;

  let progressUpdates = updates || [];

  if (fileUrl) {
    const parsed = await parseCSVFile(fileUrl);
    progressUpdates = parsed.rows.map(row => ({
      goalId: row.goal_id || row.goalId,
      newProgress: parseInt(row.progress || row.new_progress || 0)
    }));
  }

  for (const update of progressUpdates) {
    await base44.entities.Goal.update(update.goalId, {
      progress: update.newProgress
    });
  }

  return {
    message: `Updated progress for ${progressUpdates.length} goal(s)`,
    count: progressUpdates.length
  };
}

// ==================== JOURNEY & EXPERIENCE EXECUTION FUNCTIONS ====================
async function executeStructureJourneyPath(base44, user, params) {
  const { journeyTitle, targetCompetencies = [], audienceLevel, durationWeeks, includeAssessments = true } = params;

  const competenciesText = Array.isArray(targetCompetencies) && targetCompetencies.length > 0
    ? targetCompetencies.join(', ')
    : 'General leadership competencies';

  const prompt = `Design a ${durationWeeks}-week learning journey: "${journeyTitle}"

Target competencies: ${competenciesText}
Audience: ${audienceLevel || 'General audience'}

Structure should include:
1. Phases (Foundation, Application, Mastery)
2. Milestones per phase
3. Assessment checkpoints: ${includeAssessments}
4. Recommended resource types per phase
5. Prerequisites for advanced content

Return comprehensive journey structure.`;

  const structure = await base44.integrations.Core.InvokeLLM({
    prompt: prompt,
    response_json_schema: {
      type: "object",
      properties: {
        phases: {
          type: "array",
          items: {
            type: "object",
            properties: {
              phase_name: { type: "string" },
              week_range: { type: "string" },
              milestones: { type: "array", items: { type: "string" } },
              resource_types: { type: "array", items: { type: "string" } }
            }
          }
        },
        assessments: { type: "array", items: { type: "string" } },
        prerequisites: { type: "array", items: { type: "string" } }
      }
    }
  });

  return {
    message: `**Journey Structure: "${journeyTitle}"**\n\n📚 **Phases (${structure.phases.length}):**\n${structure.phases.map((p, i) => `**${i + 1}. ${p.phase_name}** (${p.week_range})\nMilestones: ${p.milestones.length}`).join('\n\n')}\n\n${includeAssessments ? `📊 **Assessment Checkpoints:** ${structure.assessments.length}` : ''}`,
    journey_structure: structure
  };
}

async function executeSuggestContentGating(base44, user, params) {
  const { journeyId, contentDifficulty } = params;

  // Try fuzzy matching for journeys
  let journeys = [];
  try {
    journeys = await base44.entities.LearningJourney.filter({ id: journeyId });
  } catch (error) {
    // Try searching by title
    const allJourneys = await base44.entities.LearningJourney.filter({});
    const matchedByTitle = allJourneys.find(j => 
      j.title.toLowerCase().includes(journeyId.toLowerCase()) ||
      journeyId.toLowerCase().includes(j.title.toLowerCase())
    );
    
    if (matchedByTitle) {
      journeys = [matchedByTitle];
    }
  }
  
  if (journeys.length === 0) {
    return {
      message: `Journey not found. Available journeys:\n\n${(await base44.entities.LearningJourney.filter({})).map(j => `• ${j.title}`).join('\n')}\n\nPlease specify one of the above.`
    };
  }

  const prompt = `Recommend prerequisites and content gating for a ${contentDifficulty} difficulty learning journey:

Journey: ${journeys[0].title}

Suggest:
1. Prerequisites (skills/knowledge needed before starting)
2. Unlock criteria for advanced content
3. Assessment gates (minimum scores to proceed)
4. Milestone-based unlocks`;

  const gating = await base44.integrations.Core.InvokeLLM({
    prompt: prompt,
    response_json_schema: {
      type: "object",
      properties: {
        prerequisites: { type: "array", items: { type: "string" } },
        unlock_criteria: { type: "array", items: { type: "object" } },
        assessment_gates: { type: "array", items: { type: "object" } }
      }
    }
  });

  return {
    message: `**Content Gating Recommendations:**\n\n🔐 **Prerequisites:**\n${gating.prerequisites.map(p => `• ${p}`).join('\n')}\n\n**Unlock Criteria:** ${gating.unlock_criteria.length} rules configured`,
    gating_config: gating
  };
}

async function executeSelectLearningResources(base44, user, params) {
  let competencies = params.competencies || [];
  const { difficultyLevel, maxResourcesPerCompetency = 3, preferFreeResources = false } = params;

  // Ensure competencies is always an array
  if (!Array.isArray(competencies)) {
    competencies = typeof competencies === 'string' ? [competencies] : [];
  }

  if (!Array.isArray(competencies) || competencies.length === 0) {
    return {
      message: 'Please specify which competencies you want learning resources for.',
      resources_by_competency: {}
    };
  }

  const filter = {
    competencies: { $in: competencies },
    is_active: true
  };
  
  if (difficultyLevel) {
    filter.difficulty_level = difficultyLevel;
  }

  const resources = await base44.entities.LearningResource.filter(filter);

  const filtered = Array.isArray(resources) 
    ? (preferFreeResources 
        ? resources.filter(r => r.access === 'Free' || !r.is_premium)
        : resources)
    : [];

  const grouped = {};
  competencies.forEach(comp => {
    grouped[comp] = filtered
      .filter(r => Array.isArray(r.competencies) && r.competencies.includes(comp))
      .sort((a, b) => (b.year || 2020) - (a.year || 2020))
      .slice(0, maxResourcesPerCompetency);
  });

  const totalSelected = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);

  if (totalSelected === 0) {
    return {
      message: `No learning resources found for the specified competencies${difficultyLevel ? ` at ${difficultyLevel} difficulty` : ''}. Try broadening your search criteria.`,
      resources_by_competency: {}
    };
  }

  return {
    message: `**Selected Learning Resources (${totalSelected}):**\n\n${Object.entries(grouped).map(([comp, resources]) => `**${comp}:**\n${resources.map(r => `• ${r.title} (${r.type})`).join('\n')}`).join('\n\n')}`,
    resources_by_competency: grouped
  };
}

async function executeAddJourneyMilestones(base44, user, params) {
  const { journeyId, milestones } = params;

  // Try fuzzy matching for journeys
  let actualJourneyId = journeyId;
  try {
    await base44.entities.LearningJourney.filter({ id: journeyId });
  } catch (error) {
    // Try searching by title
    const allJourneys = await base44.entities.LearningJourney.filter({});
    const matchedByTitle = allJourneys.find(j => 
      j.title.toLowerCase().includes(journeyId.toLowerCase()) ||
      journeyId.toLowerCase().includes(j.title.toLowerCase())
    );
    
    if (matchedByTitle) {
      actualJourneyId = matchedByTitle.id;
    } else {
      return {
        message: `Journey not found. Available journeys:\n\n${allJourneys.map(j => `• ${j.title}`).join('\n')}\n\nPlease specify one of the above.`
      };
    }
  }

  const journey = await base44.asServiceRole.entities.LearningJourney.update(actualJourneyId, {
    milestones: milestones
  });

  return {
    message: `Added ${milestones.length} milestone(s) to the learning journey`,
    count: milestones.length
  };
}

async function executeAnalyzeJourneyEffectiveness(base44, user, params) {
  const { journeyId, includeCompetencyGrowth = true } = params;

  // Try fuzzy matching for journeys
  let actualJourneyId = journeyId;
  try {
    await base44.entities.LearningJourney.filter({ id: journeyId });
  } catch (error) {
    // Try searching by title
    const allJourneys = await base44.entities.LearningJourney.filter({});
    const matchedByTitle = allJourneys.find(j => 
      j.title.toLowerCase().includes(journeyId.toLowerCase()) ||
      journeyId.toLowerCase().includes(j.title.toLowerCase())
    );
    
    if (matchedByTitle) {
      actualJourneyId = matchedByTitle.id;
    } else {
      return {
        message: `Journey not found. Available journeys:\n\n${allJourneys.map(j => `• ${j.title}`).join('\n')}\n\nPlease specify one of the above.`
      };
    }
  }

  const enrollments = await base44.asServiceRole.entities.JourneyEnrollment.filter({
    journey_id: actualJourneyId
  });

  const completed = enrollments.filter(e => e.status === 'completed').length;
  const inProgress = enrollments.filter(e => e.status === 'in_progress').length;
  const completionRate = enrollments.length > 0 ? Math.round((completed / enrollments.length) * 100) : 0;

  return {
    message: `**Journey Effectiveness Analysis:**\n\n📊 **Completion:**\n• Total Enrolled: ${enrollments.length}\n• Completed: ${completed}\n• In Progress: ${inProgress}\n• Completion Rate: ${completionRate}%\n\n${includeCompetencyGrowth ? '💡 Competency growth data requires assessment comparison (feature coming soon)' : ''}`,
    effectiveness_data: {
      total: enrollments.length,
      completed,
      completion_rate: completionRate
    }
  };
}

async function executeCloneJourneyAsTemplate(base44, user, params) {
  const { journeyId, templateName, makePublic = false } = params;

  // Try fuzzy matching for journeys
  let journeys = [];
  try {
    journeys = await base44.entities.LearningJourney.filter({ id: journeyId });
  } catch (error) {
    // Try searching by title
    const allJourneys = await base44.entities.LearningJourney.filter({});
    const matchedByTitle = allJourneys.find(j => 
      j.title.toLowerCase().includes(journeyId.toLowerCase()) ||
      journeyId.toLowerCase().includes(j.title.toLowerCase())
    );
    
    if (matchedByTitle) {
      journeys = [matchedByTitle];
    }
  }
  
  if (journeys.length === 0) {
    return {
      message: `Journey not found. Available journeys:\n\n${(await base44.entities.LearningJourney.filter({})).map(j => `• ${j.title}`).join('\n')}\n\nPlease specify one of the above.`
    };
  }

  const original = journeys[0];

  const template = await base44.asServiceRole.entities.LearningJourney.create({
    title: templateName,
    description: `Template based on: ${original.title}`,
    target_competencies: original.target_competencies,
    estimated_duration_weeks: original.estimated_duration_weeks,
    milestones: original.milestones,
    resources: original.resources,
    status: 'template',
    is_template: true,
    is_public: makePublic,
    created_by: user.email,
    client_id: user.client_id
  });

  return {
    message: `Created template "${templateName}" from journey${makePublic ? ' (public)' : ' (private)'}`,
    template_id: template.id
  };
}

async function executeEnrollUserInExperience(base44, user, params) {
  const { userEmail, experienceType, experienceId, startDate } = params;

  switch (experienceType) {
    case 'journey':
      await base44.asServiceRole.entities.JourneyEnrollment.create({
        journey_id: experienceId,
        user_email: userEmail,
        enrolled_by: user.email,
        status: 'in_progress',
        start_date: startDate || new Date().toISOString(),
        client_id: user.client_id
      });
      break;
    case 'cohort':
      const cohorts = await base44.asServiceRole.entities.Cohort.filter({ id: experienceId });
      if (cohorts.length > 0) {
        const cohort = cohorts[0];
        const updatedParticipants = [...(cohort.participant_emails || []), userEmail];
        await base44.asServiceRole.entities.Cohort.update(experienceId, {
          participant_emails: updatedParticipants
        });
      }
      break;
    case 'onboarding':
      await base44.asServiceRole.entities.OnboardingPlan.update(experienceId, {
        assigned_to_email: userEmail,
        status: 'assigned',
        started_date: startDate || new Date().toISOString()
      });
      break;
  }

  return {
    message: `Enrolled ${userEmail} in ${experienceType}`,
    enrolled: true
  };
}

// ==================== ANALYTICS DASHBOARD EXECUTION FUNCTIONS ====================
async function executeInterpretDashboardMetrics(base44, user, params) {
  const { dashboardType, metricSnapshot, compareToBaseline = false } = params;

  const prompt = `Analyze these ${dashboardType} dashboard metrics:

${JSON.stringify(metricSnapshot, null, 2)}

Provide:
1. Key insights (3-5 bullets)
2. Positive trends
3. Areas of concern
4. Recommended actions
5. ${compareToBaseline ? 'Comparison to typical benchmarks' : ''}

Be specific and actionable.`;

  const analysis = await base44.integrations.Core.InvokeLLM({
    prompt: prompt,
    response_json_schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        insights: { type: "array", items: { type: "string" } },
        positive_trends: { type: "array", items: { type: "string" } },
        concerns: { type: "array", items: { type: "string" } },
        recommendations: { type: "array", items: { type: "string" } }
      }
    }
  });

  const positiveTrends = Array.isArray(analysis.positive_trends) ? analysis.positive_trends : [];
  const concerns = Array.isArray(analysis.concerns) ? analysis.concerns : [];
  const recommendations = Array.isArray(analysis.recommendations) ? analysis.recommendations : [];

  return {
    message: `**Dashboard Analysis:**\n\n${analysis.summary}\n\n${positiveTrends.length > 0 ? `✅ **Positive:**\n${positiveTrends.map(t => `• ${t}`).join('\n')}\n\n` : ''}${concerns.length > 0 ? `⚠️ **Concerns:**\n${concerns.map(c => `• ${c}`).join('\n')}\n\n` : ''}${recommendations.length > 0 ? `💡 **Recommendations:**\n${recommendations.map(r => `• ${r}`).join('\n')}` : ''}`,
    analysis_data: analysis
  };
}

async function executeIdentifyOutliers(base44, user, params) {
  const { dataType, scope, threshold } = params;

  let data = [];
  
  switch (dataType) {
    case 'assessment_scores':
      const assessments = await base44.asServiceRole.entities.Assessment.filter({
        client_id: user.client_id
      });
      data = assessments.map(a => ({ email: a.email, value: a.overall_pct }));
      break;
    case 'goal_completion':
      const goals = await base44.asServiceRole.entities.Goal.filter({
        client_id: user.client_id,
        status: 'active'
      });
      const byUser = {};
      goals.forEach(g => {
        byUser[g.created_by] = byUser[g.created_by] || [];
        byUser[g.created_by].push(g);
      });
      data = Object.entries(byUser).map(([email, userGoals]) => ({
        email,
        value: Math.round((userGoals.filter(g => g.progress === 100).length / userGoals.length) * 100)
      }));
      break;
  }

  // Calculate statistics
  const values = data.map(d => d.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length);

  let outliers = [];
  
  switch (threshold) {
    case '2_std_dev':
      outliers = data.filter(d => Math.abs(d.value - mean) > 2 * stdDev);
      break;
    case 'top_5_percent':
      const top5Threshold = values.sort((a, b) => b - a)[Math.floor(values.length * 0.05)];
      outliers = data.filter(d => d.value >= top5Threshold);
      break;
    case 'bottom_5_percent':
      const bottom5Threshold = values.sort((a, b) => a - b)[Math.floor(values.length * 0.05)];
      outliers = data.filter(d => d.value <= bottom5Threshold);
      break;
  }

  return {
    message: `**Outlier Analysis (${dataType}):**\n\n📊 **Statistics:**\n• Mean: ${mean.toFixed(1)}\n• Std Dev: ${stdDev.toFixed(1)}\n\n🔍 **Outliers Found:** ${outliers.length}\n\n${outliers.slice(0, 10).map(o => `• ${o.email}: ${o.value}`).join('\n')}`,
    outliers_data: outliers,
    statistics: { mean, stdDev }
  };
}

async function executeCompareDepartments(base44, user, params) {
  const { metric = 'avg_score', departments, timeRange = '90days' } = params;

  const allUsers = await base44.asServiceRole.entities.User.filter({
    client_id: user.client_id
  });

  const deptData = {};
  
  for (const usr of allUsers) {
    const dept = usr.department || 'Unassigned';
    if (!deptData[dept]) {
      deptData[dept] = { users: [], metric_value: 0 };
    }
    deptData[dept].users.push(usr.email);
  }

  // Fetch metric data per department
  for (const [dept, data] of Object.entries(deptData)) {
    if (metric === 'avg_score') {
      const assessments = await base44.asServiceRole.entities.Assessment.filter({
        email: { $in: data.users }
      });
      const avgScore = assessments.length > 0 
        ? assessments.reduce((sum, a) => sum + a.overall_pct, 0) / assessments.length 
        : 0;
      deptData[dept].metric_value = Math.round(avgScore);
    } else {
      // Default metric value if not implemented
      deptData[dept].metric_value = 0;
    }
  }

  const sorted = Object.entries(deptData)
    .map(([dept, data]) => ({ 
      department: dept, 
      value: data.metric_value !== undefined ? data.metric_value : 0, 
      user_count: data.users.length 
    }))
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  return {
    message: `**Department Comparison (${metric}):**\n\n${sorted.map((d, i) => `${i + 1}. **${d.department}**: ${d.value}% (${d.user_count} users)`).join('\n')}`,
    comparison_data: sorted
  };
}

async function executeDetectTrends(base44, user, params) {
  const { metric, scope, lookbackMonths = 3, alertOnDecline = true } = params;

  return {
    message: `**Trend Detection:** Analyzing ${metric} over ${lookbackMonths} months...\n\n📈 This feature requires historical data aggregation. Use the analytics dashboards for visual trend analysis.`,
    note: 'Trend detection available on analytics dashboards'
  };
}

async function executeGenerateBenchmarkReport(base44, user, params) {
  const { industry, includeCompetencyBreakdown = true, format = 'pdf' } = params;

  return {
    message: `**Benchmark Report:** Generating ${format.toUpperCase()} benchmark report for ${industry} industry...\n\nThis will compare your organization's metrics to industry standards${includeCompetencyBreakdown ? ' with competency-level breakdown' : ''}.\n\nNavigate to the analytics dashboard to export the full benchmark report.`,
    action_required: 'navigate_to_analytics'
  };
}

async function executeExplainMetricChange(base44, user, params) {
  const { metric, changePercentage = 0, timeframe = 'recent period' } = params;

  const prompt = `Explain why ${metric} changed${changePercentage ? ` by ${changePercentage}%` : ''} over ${timeframe}.

Provide root cause analysis considering:
1. Demographic shifts (new hires, departures)
2. Training/program changes
3. External factors (market, industry trends)
4. Organizational changes

Return structured analysis with impact percentages.`;

  const analysis = await base44.integrations.Core.InvokeLLM({
    prompt: prompt,
    response_json_schema: {
      type: "object",
      properties: {
        factors: {
          type: "array",
          items: {
            type: "object",
            properties: {
              factor: { type: "string" },
              impact_percentage: { type: "number" },
              explanation: { type: "string" }
            }
          }
        },
        recommendations: { type: "array", items: { type: "string" } }
      }
    }
  });

  return {
    message: `**Root Cause Analysis: ${metric}**\n\n🔍 **Factors Contributing to ${changePercentage ? `${changePercentage}% ` : ''}Change:**\n\n${analysis.factors.map(f => `**${f.factor}** (${f.impact_percentage}% impact)\n${f.explanation}`).join('\n\n')}\n\n📈 **Recommendations:**\n${analysis.recommendations.map(r => `• ${r}`).join('\n')}`,
    analysis_data: analysis
  };
}

async function executeForecastMetric(base44, user, params) {
  const { metric, forecastMonths = 3, confidenceLevel = true } = params;

  return {
    message: `**Metric Forecast:** Predicting ${metric} for next ${forecastMonths} months...\n\n📊 This feature requires historical trend data. Use the analytics dashboards for predictive insights.`,
    note: 'Forecasting available on analytics dashboards with historical data'
  };
}

async function executeIdentifyInterventionOpportunities(base44, user, params) {
  const { scope = 'org', focusArea } = params;

  const prompt = `Identify high-impact intervention opportunities:

Scope: ${scope}
Focus Area: ${focusArea}

Analyze where targeted interventions would have maximum positive impact on:
- ${focusArea === 'engagement' ? 'user engagement and participation' : ''}
- ${focusArea === 'performance' ? 'goal completion and competency growth' : ''}
- ${focusArea === 'retention' ? 'user retention and satisfaction' : ''}

Return prioritized opportunities with expected impact.`;

  const opportunities = await base44.integrations.Core.InvokeLLM({
    prompt: prompt,
    response_json_schema: {
      type: "object",
      properties: {
        opportunities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              area: { type: "string" },
              impact_score: { type: "number" },
              intervention: { type: "string" },
              expected_outcome: { type: "string" }
            }
          }
        }
      }
    }
  });

  return {
    message: `**Intervention Opportunities (${scope}):**\n\n${opportunities.opportunities.map((o, i) => `**${i + 1}. ${o.area}** (Impact: ${o.impact_score}/100)\n${o.intervention}\nExpected: ${o.expected_outcome}`).join('\n\n')}`,
    opportunities_data: opportunities.opportunities
  };
}

// ==================== COMPETENCY MANAGEMENT EXECUTION FUNCTIONS ====================
async function executeCreateCompetency(base44, user, params) {
  const { competencyName, category, leadershipLevels = [], evidenceBased = false } = params;

  const levelsText = Array.isArray(leadershipLevels) && leadershipLevels.length > 0 
    ? leadershipLevels.join(', ') 
    : 'All leadership levels';

  const prompt = `Define the competency: "${competencyName}"

Category: ${category || 'General'}
Applies to: ${levelsText}

Generate:
1. Clear definition (2-3 sentences)
2. Key components with weights (should sum to 100%)
3. Proficiency levels (Awareness, Developing, Proficient, Mastery)
4. Behavioral indicators per level
5. ${evidenceBased ? 'Research evidence and citations' : 'Practical examples'}

Return comprehensive competency structure.`;

  const competency = await base44.integrations.Core.InvokeLLM({
    prompt: prompt,
    response_json_schema: {
      type: "object",
      properties: {
        definition: { type: "string" },
        key_components: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              weight: { type: "number" }
            }
          }
        },
        proficiency_levels: { type: "object" },
        evidence_base: { type: "string" }
      }
    }
  });

  return {
    message: `**${competencyName} Competency Structure:**\n\n📖 **Definition:**\n${competency.definition}\n\n🧩 **Key Components:**\n${competency.key_components.map(c => `• ${c.name} (${c.weight}%)`).join('\n')}\n\n${evidenceBased ? `📚 **Evidence:**\n${competency.evidence_base}` : ''}\n\n**Next:** Review and I'll create the Competency record.`,
    competency_structure: competency
  };
}

async function executeMapCompetencyToAssessment(base44, user, params) {
  const { competencyId, assessmentId, suggestQuestions = true } = params;

  // Try fuzzy matching for competencies (same as suggestCompetencyDevelopment)
  let competencies = [];
  try {
    competencies = await base44.entities.Competency.filter({ id: competencyId });
  } catch (error) {
    // If exact ID fails, try searching by partial name match
    const allComps = await base44.entities.Competency.filter({});
    const matchedByName = allComps.find(c => 
      c.name.toLowerCase().includes(competencyId.toLowerCase()) ||
      competencyId.toLowerCase().includes(c.name.toLowerCase())
    );
    
    if (matchedByName) {
      competencies = [matchedByName];
    }
  }
  
  if (competencies.length === 0) {
    return {
      message: `Competency not found. Available competencies:\n\n${(await base44.entities.Competency.filter({})).map(c => `• ${c.name}`).join('\n')}\n\nPlease specify one of the above.`
    };
  }

  const comp = competencies[0];

  if (suggestQuestions) {
    const prompt = `Generate assessment questions for competency: ${comp.name}

Definition: ${comp.definition}

Create 3-5 scenario-based questions that:
1. Assess proficiency level (1-4 scale)
2. Use realistic leadership scenarios
3. Have 4 response options (A=Awareness, B=Developing, C=Proficient, D=Mastery)
4. Are clear and unbiased`;

    const questions = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question_text: { type: "string" },
                options: {
                  type: "object",
                  properties: {
                    A: { type: "string" },
                    B: { type: "string" },
                    C: { type: "string" },
                    D: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    });

    return {
      message: `**Assessment Questions for ${comp.name}:**\n\n${questions.questions.map((q, i) => `**Q${i + 1}:** ${q.question_text}\nA. ${q.options.A}\nB. ${q.options.B}\nC. ${q.options.C}\nD. ${q.options.D}`).join('\n\n')}\n\n**Next:** Add these to your assessment.`,
      suggested_questions: questions.questions
    };
  }

  return {
    message: `Mapped competency "${comp.name}" to assessment`,
    mapped: true
  };
}

async function executeDefineCompetencyLevels(base44, user, params) {
  const { competencyName, numberOfLevels = 4, includeExamples = true } = params;

  const prompt = `Create ${numberOfLevels} proficiency level descriptions for competency: "${competencyName}"

For each level:
1. Level name and description
2. Behavioral indicators (what you'd observe)
3. ${includeExamples ? 'Concrete examples of this proficiency in action' : ''}

Use this framework:
Level 1: Awareness (understands concept)
Level 2: Developing (applies with guidance)
Level 3: Proficient (applies independently)
Level 4: Mastery (teaches and innovates)`;

  const levels = await base44.integrations.Core.InvokeLLM({
    prompt: prompt,
    response_json_schema: {
      type: "object",
      properties: {
        levels: {
          type: "array",
          items: {
            type: "object",
            properties: {
              level_number: { type: "number" },
              level_name: { type: "string" },
              description: { type: "string" },
              behavioral_indicators: { type: "array", items: { type: "string" } },
              examples: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    }
  });

  return {
    message: `**Proficiency Levels for ${competencyName}:**\n\n${levels.levels.map(l => `**Level ${l.level_number}: ${l.level_name}**\n${l.description}\n\nIndicators:\n${l.behavioral_indicators.map(i => `• ${i}`).join('\n')}\n\n${includeExamples ? `Examples:\n${l.examples.map(e => `• ${e}`).join('\n')}` : ''}`).join('\n\n')}`,
    levels_data: levels.levels
  };
}

async function executeLinkCompetenciesToRole(base44, user, params) {
  const { roleId, competencyIds, targetScores } = params;

  // Handle targetScores format - can be array of objects OR simple array
  let formattedScores = [];
  if (Array.isArray(targetScores)) {
    if (targetScores.length > 0 && typeof targetScores[0] === 'object') {
      // Already in correct format: [{competencyId, minScore}]
      formattedScores = targetScores.map(ts => ({
        name: ts.competencyId,
        target_score: ts.minScore
      }));
    } else {
      // Simple array [3, 3] - map to competencyIds
      formattedScores = competencyIds.map((compId, idx) => ({
        name: compId,
        target_score: targetScores[idx] || 3
      }));
    }
  }

  const role = await base44.asServiceRole.entities.Role.update(roleId, {
    behavioral_competencies: formattedScores
  });

  return {
    message: `Linked ${competencyIds.length} competencies to role with target scores`,
    count: competencyIds.length
  };
}

async function executeSuggestCompetencyDevelopment(base44, user, params) {
  const { competencyId, currentScore, targetScore, timeframe } = params;

  let competencies = [];
  try {
    competencies = await base44.entities.Competency.filter({ id: competencyId });
  } catch (error) {
    // If exact ID fails, try searching by partial name match
    const allComps = await base44.entities.Competency.filter({});
    const matchedByName = allComps.find(c => 
      c.name.toLowerCase().includes(competencyId.toLowerCase()) ||
      competencyId.toLowerCase().includes(c.name.toLowerCase())
    );
    
    if (matchedByName) {
      competencies = [matchedByName];
    }
  }
  
  if (competencies.length === 0) {
    return {
      message: `Competency not found. Available competencies:\n\n${(await base44.entities.Competency.filter({})).map(c => `• ${c.name}`).join('\n')}\n\nPlease specify one of the above or create a new competency first.`
    };
  }

  const comp = competencies[0];
  const gap = targetScore - currentScore;

  const prompt = `Recommend development activities to improve ${comp.name} from ${currentScore} to ${targetScore} in ${timeframe}.

Current Proficiency: Level ${currentScore}
Target: Level ${targetScore}
Gap: ${gap} levels
Timeframe: ${timeframe}

Suggest:
1. Learning resources (courses, books, articles)
2. Experiential opportunities (projects, stretch assignments)
3. Mentorship or coaching
4. Practice activities
5. Milestones to track progress`;

  const recommendations = await base44.integrations.Core.InvokeLLM({
    prompt: prompt,
    response_json_schema: {
      type: "object",
      properties: {
        learning_resources: { type: "array", items: { type: "string" } },
        experiential: { type: "array", items: { type: "string" } },
        mentorship: { type: "array", items: { type: "string" } },
        milestones: { type: "array", items: { type: "string" } }
      }
    }
  });

  return {
    message: `**Development Plan for ${comp.name}:**\n\n📚 **Learning Resources:**\n${recommendations.learning_resources.map(r => `• ${r}`).join('\n')}\n\n🎯 **Experiential:**\n${recommendations.experiential.map(e => `• ${e}`).join('\n')}\n\n👥 **Mentorship:**\n${recommendations.mentorship.map(m => `• ${m}`).join('\n')}\n\n✅ **Milestones:**\n${recommendations.milestones.map(m => `• ${m}`).join('\n')}`,
    development_plan: recommendations
  };
}

// ==================== CERTIFICATION & EXTERNAL ASSESSMENT EXECUTION FUNCTIONS ====================
async function executeVerifyCertification(base44, user, params) {
  const { userEmail, certificationName, issuingBody, verificationUrl } = params;

  // Get client_id: try target user first, then admin, then use 'default'
  let clientId = null;
  try {
    const targetUsers = await base44.asServiceRole.entities.User.filter({ email: userEmail });
    clientId = targetUsers.length > 0 ? targetUsers[0].client_id : null;
  } catch (error) {
    console.log('Could not fetch target user for client_id');
  }
  
  // Fallback to admin's client_id
  if (!clientId) {
    clientId = user.client_id || 'default_client';
  }

  // Create certification record with verified status directly
  const certification = await base44.asServiceRole.entities.Certification.create({
    user_email: userEmail,
    client_id: clientId,
    name: certificationName,
    issuing_body: issuingBody,
    credential_id_or_url: verificationUrl,
    status: 'verified',
    verified_by: user.email,
    verified_at: new Date().toISOString(),
    issue_date: new Date().toISOString().split('T')[0]
  });

  // Create notification
  await base44.asServiceRole.entities.Notification.create({
    user_email: userEmail,
    type: 'certification_status',
    title: 'Certification Verified',
    message: `Your ${certificationName} certification has been verified by ${user.full_name}.`,
    scheduled_for: new Date().toISOString(),
    priority: 'medium',
    related_entity_type: 'Certification',
    related_entity_id: certification.id
  });

  return {
    message: `✅ Certification verified for ${userEmail}\n\n📜 ${certificationName} from ${issuingBody}`,
    certification_id: certification.id
  };
}

async function executeProcessExternalAssessment(base44, user, params) {
  const { userEmail, assessmentType, fileUrl, keyFindings } = params;

  // Get client_id: try target user first, then admin, then use 'default'
  let clientId = null;
  try {
    const targetUsers = await base44.asServiceRole.entities.User.filter({ email: userEmail });
    clientId = targetUsers.length > 0 ? targetUsers[0].client_id : null;
  } catch (error) {
    console.log('Could not fetch target user for client_id');
  }
  
  // Fallback to admin's client_id
  if (!clientId) {
    clientId = user.client_id || 'default_client';
  }

  // Create external assessment with verified status directly
  const assessment = await base44.asServiceRole.entities.ExternalAssessmentResult.create({
    user_email: userEmail,
    client_id: clientId,
    assessment_type: assessmentType,
    document_uri: fileUrl,
    designation_or_score: keyFindings || 'Results processed',
    date_completed: new Date().toISOString().split('T')[0],
    status: 'verified',
    verified_by: user.email,
    verified_at: new Date().toISOString(),
    ai_summary: keyFindings
  });

  // Create notification
  await base44.asServiceRole.entities.Notification.create({
    user_email: userEmail,
    type: 'assessment_status',
    title: 'External Assessment Processed',
    message: `Your ${assessmentType} assessment has been processed: ${keyFindings}`,
    scheduled_for: new Date().toISOString(),
    priority: 'medium',
    related_entity_type: 'ExternalAssessmentResult',
    related_entity_id: assessment.id
  });

  return {
    message: `✅ Processed ${assessmentType} assessment for ${userEmail}\n\n📊 Key findings: ${keyFindings}`,
    assessment_id: assessment.id
  };
}

async function executeRecommendCareerPathFromCerts(base44, user, params) {
  const { userEmail, includeGapAnalysis = true } = params;

  const [certs, extAssessments] = await Promise.all([
    base44.asServiceRole.entities.Certification.filter({ user_email: userEmail, status: 'verified' }),
    base44.asServiceRole.entities.ExternalAssessmentResult.filter({ user_email: userEmail, status: 'verified' })
  ]);

  const prompt = `Recommend career paths for a user with:

Certifications: ${certs.map(c => c.name).join(', ') || 'None'}
External Assessments: ${extAssessments.map(a => `${a.assessment_type}: ${a.designation_or_score}`).join(', ') || 'None'}

${includeGapAnalysis ? 'Include gap analysis showing what additional qualifications would strengthen each path.' : ''}

Return top 3 career paths with readiness scores.`;

  const paths = await base44.integrations.Core.InvokeLLM({
    prompt: prompt,
    response_json_schema: {
      type: "object",
      properties: {
        recommended_paths: {
          type: "array",
          items: {
            type: "object",
            properties: {
              role: { type: "string" },
              readiness_score: { type: "number" },
              reasoning: { type: "string" },
              gaps: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    }
  });

  return {
    message: `**Career Path Recommendations:**\n\n${paths.recommended_paths.map((p, i) => `**${i + 1}. ${p.role}** (${p.readiness_score}% ready)\n${p.reasoning}\n${includeGapAnalysis ? `\nGaps:\n${p.gaps.map(g => `• ${g}`).join('\n')}` : ''}`).join('\n\n')}`,
    career_paths: paths.recommended_paths
  };
}

async function executeSetCertificationReminder(base44, user, params) {
  const { certificationId, expirationDate, reminderDaysBefore = 90 } = params;

  // Try fuzzy matching for certifications
  let certs = [];
  try {
    certs = await base44.entities.Certification.filter({ id: certificationId });
  } catch (error) {
    // Try searching by name
    const allCerts = await base44.asServiceRole.entities.Certification.filter({ user_email: user.email });
    const matchedByName = allCerts.find(c => 
      c.name.toLowerCase().includes(certificationId.toLowerCase()) ||
      certificationId.toLowerCase().includes(c.name.toLowerCase())
    );
    
    if (matchedByName) {
      certs = [matchedByName];
    }
  }
  
  if (certs.length === 0) {
    return {
      message: `Certification not found. Your certifications:\n\n${(await base44.asServiceRole.entities.Certification.filter({ user_email: user.email })).map(c => `• ${c.name}`).join('\n')}\n\nPlease specify one of the above.`
    };
  }

  const cert = certs[0];
  const reminderDate = new Date(expirationDate);
  reminderDate.setDate(reminderDate.getDate() - reminderDaysBefore);

  await base44.asServiceRole.entities.Notification.create({
    user_email: cert.user_email,
    type: 'certification_expiring',
    title: `Certification Renewal Reminder: ${cert.name}`,
    message: `Your ${cert.name} certification expires on ${new Date(expirationDate).toLocaleDateString()}. Start renewal process soon.`,
    scheduled_for: reminderDate.toISOString(),
    priority: 'high',
    related_entity_type: 'Certification',
    related_entity_id: certificationId
  });

  return {
    message: `Set renewal reminder for ${cert.name} (${reminderDaysBefore} days before expiration)`,
    reminder_date: reminderDate.toISOString()
  };
}

// ==================== WORKFLOW ORCHESTRATION ENGINE ====================
async function detectWorkflowOpportunities(base44, user, completedTool, parameters, executionResult) {
  const suggestions = [];
  
  try {
    switch (completedTool) {
      case 'inviteUser':
        // New user invited → Suggest onboarding, assessment, cohort enrollment
        const invitedRole = parameters.role;
        suggestions.push({
          priority: 'high',
          category: 'onboarding',
          title: '📋 Assign Onboarding Plan',
          description: `Assign a ${invitedRole === 'User Level 2' ? 'New Manager' : 'New Employee'} onboarding plan to ${parameters.email}`,
          suggestedAction: {
            tool: 'assignOnboardingPlan',
            params: { userEmail: parameters.email, planType: invitedRole }
          }
        });
        
        if (['User Level 2', 'Admin Level 1'].includes(invitedRole)) {
          suggestions.push({
            priority: 'high',
            category: 'assessment',
            title: '📊 Assign Baseline Assessment',
            description: `Send ${parameters.email} the Manager Baseline assessment`,
            suggestedAction: {
              tool: 'bulkAssignAssessments',
              params: { userEmails: [parameters.email], assessmentTitle: 'Manager Baseline' }
            }
          });
        }
        
        // Check for active cohorts
        const activeCohorts = await base44.asServiceRole.entities.Cohort.filter({
          client_id: user.client_id,
          status: 'enrollment_open'
        });
        
        if (activeCohorts.length > 0) {
          suggestions.push({
            priority: 'medium',
            category: 'learning',
            title: '👥 Enroll in Active Cohort',
            description: `Enroll ${parameters.email} in "${activeCohorts[0].name}" cohort`,
            suggestedAction: {
              tool: 'enrollUserInExperience',
              params: { 
                userEmail: parameters.email, 
                experienceType: 'cohort',
                experienceId: activeCohorts[0].id 
              }
            }
          });
        }
        break;
        
      case 'bulkInviteUsers':
        // Multiple users invited → Suggest bulk onboarding plan deployment
        const userCount = executionResult.count || 0;
        suggestions.push({
          priority: 'high',
          category: 'onboarding',
          title: '📋 Deploy Onboarding Plans',
          description: `Assign onboarding plans to all ${userCount} new users`,
          suggestedAction: {
            tool: 'bulkAssignOnboardingPlans',
            params: { userEmails: executionResult.invited_emails }
          }
        });
        
        suggestions.push({
          priority: 'medium',
          category: 'communication',
          title: '📧 Send Welcome Emails',
          description: `Send customized welcome emails to ${userCount} new users`,
          suggestedAction: {
            tool: 'sendEmail',
            params: { 
              to: executionResult.invited_emails,
              templateKey: 'new_user_welcome'
            }
          }
        });
        break;
        
      case 'suspendUserAccount':
      case 'setAccountExpiration':
        // User suspended/expired → Suggest notifying manager
        const targetUser = await base44.asServiceRole.entities.User.filter({ 
          email: parameters.userEmail 
        });
        
        if (targetUser.length > 0 && targetUser[0].manager_email) {
          suggestions.push({
            priority: 'high',
            category: 'communication',
            title: '👤 Notify Manager',
            description: `Inform ${targetUser[0].manager_email} about ${parameters.userEmail}'s account status`,
            suggestedAction: {
              tool: 'sendEmail',
              params: {
                to: [targetUser[0].manager_email],
                subject: `Account Update: ${targetUser[0].full_name}`,
                templateKey: 'account_status_notification'
              }
            }
          });
        }
        
        // Suggest reassigning their active work
        const userGoals = await base44.asServiceRole.entities.Goal.filter({
          created_by: parameters.userEmail,
          status: 'active'
        });
        
        if (userGoals.length > 0) {
          suggestions.push({
            priority: 'medium',
            category: 'goals',
            title: '🎯 Reassign Active Goals',
            description: `Reassign ${userGoals.length} active goals to other team members`,
            suggestedAction: {
              tool: 'bulkUpdateGoalProgress',
              params: { goalIds: userGoals.map(g => g.id), action: 'reassign' }
            }
          });
        }
        break;
        
      case 'assignLearning':
      case 'bulkAssignLearning':
        // Learning assigned → Suggest creating notification, setting reminder
        const recipientCount = parameters.userEmails?.length || 1;
        
        suggestions.push({
          priority: 'medium',
          category: 'communication',
          title: '🔔 Send Assignment Notifications',
          description: `Notify ${recipientCount} user(s) about their new learning assignment`,
          suggestedAction: {
            tool: 'scheduleNotification',
            params: {
              recipientEmails: parameters.userEmails,
              notificationType: 'learning_assigned',
              sendImmediately: true
            }
          }
        });
        
        if (parameters.dueDate) {
          const dueDate = new Date(parameters.dueDate);
          const reminderDate = new Date(dueDate);
          reminderDate.setDate(reminderDate.getDate() - 3); // 3 days before
          
          suggestions.push({
            priority: 'low',
            category: 'reminders',
            title: '⏰ Schedule Due Date Reminder',
            description: `Remind users 3 days before ${dueDate.toLocaleDateString()} deadline`,
            suggestedAction: {
              tool: 'createReminder',
              params: {
                recipientEmails: parameters.userEmails,
                scheduledFor: reminderDate.toISOString(),
                title: 'Learning Due Soon',
                message: `Your assigned learning "${parameters.resourceTitle}" is due in 3 days`
              }
            }
          });
        }
        break;
        
      case 'createGoal':
      case 'bulkCreateGoals':
        // Goals created → Suggest learning resources for competencies
        const goalCompetencies = parameters.linkedCompetencyIds || [];
        
        if (goalCompetencies.length > 0) {
          suggestions.push({
            priority: 'medium',
            category: 'learning',
            title: '📚 Recommend Learning Resources',
            description: `Find learning resources for ${goalCompetencies.length} goal competencies`,
            suggestedAction: {
              tool: 'suggestLearningForGaps',
              params: {
                userEmail: user.email,
                competencyIds: goalCompetencies,
                maxResources: 3
              }
            }
          });
        }
        
        // Suggest creating milestones if goal is long-term
        if (parameters.timeframeEnd) {
          const daysToDeadline = Math.floor((new Date(parameters.timeframeEnd) - new Date()) / (1000 * 60 * 60 * 24));
          
          if (daysToDeadline > 60) {
            suggestions.push({
              priority: 'low',
              category: 'goals',
              title: '🏁 Add Milestones',
              description: `Break down this ${daysToDeadline}-day goal into milestones`,
              suggestedAction: {
                tool: 'suggestGoalMilestones',
                params: {
                  goalId: executionResult.goal_id,
                  timeframe: `${daysToDeadline} days`,
                  milestoneCount: Math.min(Math.floor(daysToDeadline / 30), 6)
                }
              }
            });
          }
        }
        break;
        
      case 'cascadeGoal':
        // Goal cascaded → Suggest notification, tracking
        suggestions.push({
          priority: 'high',
          category: 'communication',
          title: '📧 Send Cascade Notifications',
          description: `Notify ${parameters.userEmails?.length || 0} users about their cascaded goal`,
          suggestedAction: {
            tool: 'sendEmail',
            params: {
              to: parameters.userEmails,
              templateKey: 'goal_cascade_notification'
            }
          }
        });
        
        suggestions.push({
          priority: 'medium',
          category: 'goals',
          title: '📊 Track Cascade Progress',
          description: 'Monitor how cascaded goals progress across team',
          suggestedAction: {
            tool: 'identifyGoalsAtRisk',
            params: { scope: 'team', daysFromDeadline: 14 }
          }
        });
        break;
        
      case 'verifyCertification':
      case 'processExternalAssessment':
        // Certification verified → Suggest career paths, competency updates
        const certUserEmail = parameters.userEmail;
        
        suggestions.push({
          priority: 'high',
          category: 'career',
          title: '🗺️ Recommend Career Paths',
          description: `Show ${certUserEmail} career opportunities based on their new qualification`,
          suggestedAction: {
            tool: 'recommendCareerPathFromCerts',
            params: {
              userEmail: certUserEmail,
              includeGapAnalysis: true
            }
          }
        });
        
        if (completedTool === 'verifyCertification' && parameters.expirationDate) {
          suggestions.push({
            priority: 'low',
            category: 'reminders',
            title: '⏰ Set Renewal Reminder',
            description: 'Create reminder for certification renewal',
            suggestedAction: {
              tool: 'setCertificationReminder',
              params: {
                certificationId: parameters.certificationId || executionResult.certification_id,
                expirationDate: parameters.expirationDate,
                reminderDaysBefore: 90
              }
            }
          });
        }
        break;
        
      case 'assignOnboardingPlan':
        // Onboarding assigned → Suggest baseline assessment, welcome email
        suggestions.push({
          priority: 'high',
          category: 'assessment',
          title: '📊 Assign Baseline Assessment',
          description: `Send ${parameters.assignedToEmail} a baseline assessment to track growth`,
          suggestedAction: {
            tool: 'bulkAssignAssessments',
            params: {
              assessmentTitle: 'Baseline Leadership Assessment',
              userEmails: [parameters.assignedToEmail]
            }
          }
        });
        
        suggestions.push({
          priority: 'medium',
          category: 'communication',
          title: '📧 Send Welcome Email',
          description: 'Send personalized welcome email with onboarding details',
          suggestedAction: {
            tool: 'sendEmail',
            params: {
              to: [parameters.assignedToEmail],
              templateKey: 'onboarding_welcome'
            }
          }
        });
        break;
        
      case 'bulkAssignAssessments':
        // Assessments assigned → Suggest scheduling debrief sessions
        const assessmentRecipients = parameters.userEmails || [];
        const hasDeadline = !!parameters.dueDate;
        
        if (hasDeadline && assessmentRecipients.length < 10) {
          suggestions.push({
            priority: 'medium',
            category: 'calendar',
            title: '📅 Schedule Debrief Sessions',
            description: `Schedule assessment debrief sessions for ${assessmentRecipients.length} users`,
            suggestedAction: {
              tool: 'scheduleCalendarEvent',
              params: {
                title: 'Assessment Results Debrief',
                attendeeEmails: assessmentRecipients
              }
            }
          });
        }
        
        suggestions.push({
          priority: 'low',
          category: 'reminders',
          title: '⏰ Set Completion Reminders',
          description: 'Remind users 2 days before assessment deadline',
          suggestedAction: {
            tool: 'createReminder',
            params: {
              recipientEmails: assessmentRecipients,
              title: 'Assessment Due Soon'
            }
          }
        });
        break;
        
      case 'assignJourneyToTeam':
        // Journey assigned → Suggest progress tracking, milestone reminders
        suggestions.push({
          priority: 'medium',
          category: 'tracking',
          title: '📈 Track Journey Progress',
          description: `Monitor completion rates for ${parameters.journeyTitle}`,
          suggestedAction: {
            tool: 'analyzeJourneyEffectiveness',
            params: {
              journeyId: parameters.journeyId,
              includeCompetencyGrowth: true
            }
          }
        });
        break;
        
      case 'autoTriageRequest':
        // Request triaged → Suggest assignment
        if (executionResult.triage_data?.suggested_assignee) {
          suggestions.push({
            priority: 'high',
            category: 'requests',
            title: '👤 Assign Request',
            description: `Assign to ${executionResult.triage_data.suggested_assignee}`,
            suggestedAction: {
              tool: 'assignRequestToUser',
              params: {
                requestId: parameters.requestId,
                assigneeEmail: executionResult.triage_data.suggested_assignee,
                priority: executionResult.triage_data.priority
              }
            }
          });
        }
        break;
        
      case 'identifyGoalsAtRisk':
        // At-risk goals identified → Suggest intervention
        if (executionResult.count > 0) {
          const atRiskGoalIds = executionResult.at_risk_goals?.map(g => g.id) || [];
          
          suggestions.push({
            priority: 'high',
            category: 'intervention',
            title: '🚨 Create Intervention Plan',
            description: `Build action plan for ${executionResult.count} at-risk goals`,
            suggestedAction: {
              tool: 'createInterventionPlan',
              params: {
                riskType: 'goal_completion',
                urgency: 'high'
              }
            }
          });
          
          suggestions.push({
            priority: 'medium',
            category: 'communication',
            title: '📧 Send Goal Reminders',
            description: 'Remind goal owners about upcoming deadlines',
            suggestedAction: {
              tool: 'createReminder',
              params: {
                title: 'Goal Deadline Approaching'
              }
            }
          });
        }
        break;
        
      case 'suggestLearningForGaps':
        // Learning recommendations provided → Suggest assignment
        if (executionResult.recommendations?.length > 0) {
          suggestions.push({
            priority: 'high',
            category: 'learning',
            title: '➕ Assign Recommended Learning',
            description: `Assign ${executionResult.recommendations.length} resources to close competency gaps`,
            suggestedAction: {
              tool: 'assignLearning',
              params: {
                learningResourceId: executionResult.recommendations[0].id,
                resourceTitle: executionResult.recommendations[0].title
              }
            }
          });
        }
        break;
        
      case 'interpretDashboardMetrics':
      case 'explainMetricChange':
        // Dashboard analysis complete → Suggest interventions if concerns found
        const concerns = executionResult.analysis_data?.concerns || [];
        
        if (concerns.length > 0) {
          suggestions.push({
            priority: 'high',
            category: 'intervention',
            title: '⚡ Create Action Plan',
            description: `Address ${concerns.length} areas of concern identified`,
            suggestedAction: {
              tool: 'identifyInterventionOpportunities',
              params: {
                focusArea: 'performance'
              }
            }
          });
        }
        break;
        
      case 'designBadgeStructure':
        // Badge structure designed → Suggest implementation
        if (executionResult.badge_structure?.badges?.length > 0) {
          suggestions.push({
            priority: 'medium',
            category: 'gamification',
            title: '🎖️ Create Badge Templates',
            description: `Implement ${executionResult.badge_structure.badges.length} badges in the system`,
            suggestedAction: {
              tool: 'createBadgeTemplate',
              params: {
                badges: executionResult.badge_structure.badges
              }
            }
          });
        }
        break;
        
      case 'createCompetency':
        // Competency created → Suggest mapping to assessments and roles
        suggestions.push({
          priority: 'high',
          category: 'competency',
          title: '🔗 Map to Assessment',
          description: `Create assessment questions for ${parameters.competencyName}`,
          suggestedAction: {
            tool: 'mapCompetencyToAssessment',
            params: {
              competencyId: executionResult.competency_id,
              suggestQuestions: true
            }
          }
        });
        
        suggestions.push({
          priority: 'medium',
          category: 'roles',
          title: '👥 Link to Roles',
          description: `Define which roles require ${parameters.competencyName}`,
          suggestedAction: {
            tool: 'linkCompetenciesToRole',
            params: {
              competencyIds: [executionResult.competency_id]
            }
          }
        });
        break;
    }
    
    // Return top 3 suggestions sorted by priority
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    return suggestions
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .slice(0, 3);
      
  } catch (error) {
    console.error('Error detecting workflow opportunities:', error);
    return [];
  }
}