/**
 * Generated from the live entity schemas on 6 November 2026 by scanning every
 * base44/entities/*.jsonc file: 163 schemas, 155 of which carry `client_id`.
 *
 * C = client-owned (shared inside one client)
 * U = user-owned within a client (a person's own record; the rule is bound to
 *     their email or id rather than to a role, so a tenant-wide read is
 *     deliberately absent and must not be reported as a gap)
 *
 * Eight entity types carry no client field and are not listed: they are
 * platform-shared or platform plumbing (BlogPost, Client, FeatureSuggestion,
 * IntegrationDoc, Partner, Prospect, UATTestCase, WorkbookLead).
 *
 * Regenerate this list when an entity gains or loses `client_id`; the rollout
 * status document records the same totals so a drift shows up as a mismatch.
 */
export const TENANT_ENTITY_MAP = `ActiveSession:U,ActivityLog:U,AgentAction:U,Assessment:C,AssessmentInsights:U,AssessmentQuestion:C,AssessmentSubmission:U,AssignedLearning:U,AtreusConversationTurn:U,AtreusMemorySummary:U,Automation:U,Badge:U,BadgeTemplate:U,BrandingChangeLog:U,BrandingConfiguration:C,BrandingTheme:C,CalibrationCase:C,CalibrationJudgment:C,CalibrationSession:C,CandidateSelfDisclosure:C,CareerPath:C,Certificate:U,Certification:U,CheckInCustomQuestion:U,CheckInLeaderNote:U,Class:C,CoachMessage:C,CoachReflection:C,CoachingEngagement:C,CoachingRequest:C,CoachingSession:C,Cohort:U,Competency:C,Competition:U,Conversation:U,ConversationState:U,ConversationalLearningModule:U,Course:U,CourseProgress:C,CourseVersion:C,CriticalRole:C,CriticalRoleRequirement:C,CrossTenantAccessGrant:C,CustomAssessment:U,CustomForm:U,CustomFormSubmission:U,CustomFormTemplate:C,CustomRole:C,CustomerAccount:C,DailyCheckIn:U,DecisionJournal:U,DelegationPlan:U,DevelopmentAction:C,DevelopmentExperience:U,DevelopmentPlan:U,DevelopmentPlanLink:C,DevelopmentRequest:C,DiagnosticSession:C,EffectiveBlueprintSnapshot:C,EffectiveRequirementSnapshot:C,EmailTemplate:C,EmployeeAssignment:C,EvidenceRecord:C,EvidenceReviewDecision:C,ExternalAssessmentResult:U,ExternalLearningRecord:U,GamificationLevel:U,GamificationSettings:C,Goal:U,GovernanceApproval:C,HRBPDelegation:C,HRBPIntervention:C,HRBPPortfolio:C,ICRoster:U,IdempotencyKey:C,ImpersonationLog:C,Item:U,Journey:U,JourneyEnrollment:U,KPI:U,KnowledgeTransferPlan:C,LeaderboardTemplate:C,LeadershipIndexRequirementMapping:C,LeadershipProfileReport:U,LearnerProgress:U,LearningCertificate:U,LearningJourney:U,LearningRecommendation:U,LearningRecordEvent:C,LearningResource:U,LoginHistory:U,ManagerMemory:U,ManagerPortfolio:U,ManagerPulse:U,ManagerTrends:U,MeetingRecord:U,Milestone:U,Notification:U,OnboardingPlan:U,OrgBusinessGoal:C,OrgPosition:C,OrgPositionChange:C,OrgRole:C,PartnerCommission:C,PendingInvitation:C,Permission:C,PointTransaction:U,PositionAssignment:C,ProfileDataConflict:C,Program:U,ProvisioningApiKey:C,ProvisioningBatch:C,ProvisioningRole:C,ProvisioningUser:C,PulseAccessLog:C,ReadinessConclusion:C,ReadinessCondition:C,ReadinessEvidenceCitation:C,ReportTemplate:U,RequestNonce:C,ReviewCalibration:C,ReviewCycleEvent:C,ReviewParticipant:U,Role:C,RoleRequirement:C,RoleSuccessBlueprint:C,RoleTaxonomy:C,ScheduledReport:U,SnapshotIntegrityIncident:C,SuccessionAuditEvent:C,SuccessionCandidateNotice:C,SuccessionCycle:C,SuccessionDecisionRecord:C,SuccessionLegalHold:C,SuccessionMonitorAlert:C,SuccessionOperation:C,SuccessionReviewRecord:C,SuccessionSealedDemographic:C,SuccessorCandidacy:C,SyncState:U,TalentPool:C,TalentPoolMembership:C,TonePreference:U,TransitionInitiation:C,TransitionPlan:C,UATSubmission:U,User:C,UserAchievement:U,UserActivity:U,UserBadge:U,UserPreference:U,UserProfile:U,UserRoleAssignment:U,WeeklyCheckIn:U,WorkforceMetrics:C`;

export type EntityClass = "C" | "U";

export function tenantEntities(): Array<{ name: string; cls: EntityClass }> {
  return TENANT_ENTITY_MAP.split(",").map((entry) => {
    const [name, cls] = entry.split(":");
    return { name, cls: cls as EntityClass };
  });
}