/**
 * Confirmation policy for Atreus agent tools.
 *
 * Extracted from invokeAgent so the policy is one readable table rather than a
 * block inside a 3,800-line function. Behaviour is unchanged: the four levels,
 * the tool lists, and the MEDIUM default are the same values that shipped.
 */

export const CONFIRMATION_LEVELS = {
  LOW: { display: 'toast_only', requireConfirm: false, level: 'LOW' },
  MEDIUM: { display: 'simple_modal', requireConfirm: true, showImpact: true, showAffectedUsers: true, level: 'MEDIUM' },
  HIGH: { display: 'detailed_modal', requireConfirm: true, showImpact: true, showAffectedUsers: true, showReversibility: true, showPreview: true, level: 'HIGH' },
  CRITICAL: { display: 'full_impact_modal', requireConfirm: true, requireTypedConfirmation: true, showImpact: true, showAffectedUsers: true, showReversibility: true, showWarnings: true, showAuditLog: true, level: 'CRITICAL' },
};

// LOW: Read-only, info gathering, recommendations
const LOW_RISK_TOOLS = ['generateReport', 'getUserAchievements', 'explainBadgeCriteria', 'trackLearningProgress',
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
const MEDIUM_RISK_TOOLS = ['createReminder', 'scheduleNotification', 'assignLearning', 'assignJourney', 'createGoal',
  'scheduleCalendarEvent', 'inviteUser', 'sendEmail', 'activateUserAccount', 'resendUserInvitation',
  'unlockUserAccount', 'assignAssessment', 'assignOnboardingPlan', 'assignCohort', 'bulkUpdateRequestStatus',
  'assignRequestToUser', 'bulkUpdateGoalProgress', 'addJourneyMilestones', 'cloneJourneyAsTemplate',
  'enrollUserInExperience', 'linkCompetenciesToRole', 'verifyCertification', 'processExternalAssessment',
  'awardPointsToUser'];

// HIGH: Bulk operations, cascading changes, license management
const HIGH_RISK_TOOLS = ['cascadeGoal', 'bulkAssignLearning', 'bulkCreateGoals', 'suspendUserAccount',
  'assignLicense', 'setAccountExpiration', 'bulkAssignAssessments', 'assignJourneyToTeam', 'createCompetition'];

// CRITICAL: Destructive operations, mass changes, security actions
const CRITICAL_RISK_TOOLS = ['bulkInviteUsers', 'terminateUserSessions', 'bulkSetAccountExpiration'];

export function getConfirmationLevel(toolName: string) {
  if (LOW_RISK_TOOLS.includes(toolName)) return CONFIRMATION_LEVELS.LOW;
  if (MEDIUM_RISK_TOOLS.includes(toolName)) return CONFIRMATION_LEVELS.MEDIUM;
  if (HIGH_RISK_TOOLS.includes(toolName)) return CONFIRMATION_LEVELS.HIGH;
  if (CRITICAL_RISK_TOOLS.includes(toolName)) return CONFIRMATION_LEVELS.CRITICAL;

  return CONFIRMATION_LEVELS.MEDIUM; // Default
}