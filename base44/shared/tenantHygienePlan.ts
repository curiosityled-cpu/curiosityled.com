/**
 * Tenant hygiene plan — the single, declarative description of what demo and
 * test data exists, which tenant it is allowed to belong to, and what to do
 * with it.
 *
 * Three actions, and only three:
 *
 *   purge    Activity records (check-ins, progress, insights, memory, results,
 *            goals, reviews). Anything outside the test tenant is removed,
 *            along with orphaned automated-test-harness records.
 *
 *   rehome   Seed content (catalog resources, experiences, journeys, courses,
 *            signals, forms). These records carry no tenant, so they are
 *            visible to every client as "global". Rather than deleting authored
 *            content — which the rollout forbids for ambiguous ownership — they
 *            are re-stamped onto the test tenant, which makes them appear only
 *            there.
 *
 *   preserve Settings and configuration. Never touched.
 *
 * The test tenant is matched by name (HealthCo) so this plan never hardcodes an
 * id. Everything not matching it is treated as a customer tenant.
 */

export type HygieneAction = "purge" | "rehome" | "preserve";

export interface HygieneTarget {
  /** Entity name, exactly as the SDK exposes it. */
  entity: string;
  action: HygieneAction;
  /** Person-scoped email field, used to find orphaned test-harness records. */
  userField?: string;
  /** Coarse product area, for grouping in the review console. */
  area: string;
  /** What this record type holds, in plain language. */
  note: string;
}

export const TEST_TENANT_NAME = "healthco";
export const TEST_HARNESS_DOMAIN = "@testagent.base44.com";

export const HYGIENE_TARGETS: HygieneTarget[] = [
  // ── Lead / daily rhythm ───────────────────────────────────────────────────
  { entity: "DailyCheckIn", action: "purge", userField: "user_email", area: "Lead", note: "Daily morning and evening check-ins" },
  { entity: "CheckInLeaderNote", action: "purge", area: "Lead", note: "Leader notes attached to check-ins" },
  { entity: "WeeklyCheckIn", action: "purge", userField: "user_email", area: "Lead", note: "Weekly rhythm reflections" },
  { entity: "MeetingRecord", action: "purge", area: "Lead", note: "One-on-one meeting records" },
  { entity: "ManagerMemory", action: "purge", userField: "user_email", area: "Lead", note: "Atreus memory of each manager" },
  { entity: "ManagerPulse", action: "purge", area: "Lead", note: "Manager pulse signals" },
  { entity: "ManagerTrends", action: "purge", area: "Lead", note: "Rolled-up manager trends" },
  { entity: "AtreusConversationTurn", action: "purge", userField: "user_email", area: "Lead", note: "Atreus conversation transcript" },
  { entity: "AtreusMemorySummary", action: "purge", userField: "user_email", area: "Lead", note: "Atreus memory summaries" },
  { entity: "Conversation", action: "purge", userField: "user_email", area: "Lead", note: "Coaching conversations" },
  { entity: "CoachMessage", action: "purge", area: "Lead", note: "Coach messages" },
  { entity: "CoachReflection", action: "purge", area: "Lead", note: "Coach reflections" },

  // ── Team & practice ───────────────────────────────────────────────────────
  { entity: "DevelopmentPlan", action: "purge", area: "Team & Practice", note: "Development plans" },
  { entity: "DevelopmentAction", action: "purge", area: "Team & Practice", note: "Development actions and follow-through" },
  { entity: "DevelopmentRequest", action: "purge", area: "Team & Practice", note: "Coaching and consulting requests" },
  { entity: "DevelopmentExperience", action: "rehome", area: "Team & Practice", note: "External development experiences" },
  { entity: "TalentPool", action: "purge", area: "Team & Practice", note: "Talent pools" },
  { entity: "CareerPath", action: "purge", area: "Team & Practice", note: "Career paths" },

  // ── Leadership Intelligence Hub ───────────────────────────────────────────
  { entity: "AssessmentInsights", action: "purge", area: "Leadership Intelligence Hub", note: "Generated assessment insights" },
  { entity: "LeadershipProfileReport", action: "purge", area: "Leadership Intelligence Hub", note: "Leadership profile reports" },
  { entity: "WorkforceMetrics", action: "purge", area: "Leadership Intelligence Hub", note: "Workforce metrics snapshots" },
  { entity: "OrgBusinessGoal", action: "purge", area: "Leadership Intelligence Hub", note: "Organisation business goals" },

  // ── Development Manager ───────────────────────────────────────────────────
  { entity: "LearningResource", action: "rehome", area: "Development Manager", note: "Catalog resources and courses" },
  { entity: "Course", action: "rehome", area: "Development Manager", note: "Multi-module courses" },
  { entity: "CourseProgress", action: "purge", userField: "user_email", area: "Development Manager", note: "Course progress" },
  { entity: "LearnerProgress", action: "purge", userField: "user_email", area: "Development Manager", note: "Learner progress" },
  { entity: "LearningCertificate", action: "purge", userField: "user_email", area: "Development Manager", note: "Issued learning certificates" },
  { entity: "AssignedLearning", action: "purge", area: "Development Manager", note: "Learning assignments" },
  { entity: "LearningRecordEvent", action: "purge", area: "Development Manager", note: "Learning evidence log" },
  { entity: "Journey", action: "rehome", area: "Development Manager", note: "Learning journeys" },
  { entity: "JourneyEnrollment", action: "purge", userField: "user_email", area: "Development Manager", note: "Journey enrolments" },
  { entity: "LearningJourney", action: "rehome", area: "Development Manager", note: "Legacy learning journeys" },
  { entity: "ConversationalLearningModule", action: "rehome", area: "Development Manager", note: "Conversational learning modules" },
  { entity: "Program", action: "rehome", area: "Development Manager", note: "Programs" },
  { entity: "Class", action: "rehome", area: "Development Manager", note: "Live classes" },
  { entity: "Cohort", action: "rehome", area: "Development Manager", note: "Cohorts" },
  { entity: "CustomAssessment", action: "rehome", area: "Development Manager", note: "Custom signals and assessments" },
  { entity: "AssessmentSubmission", action: "purge", area: "Development Manager", note: "Signal responses" },
  { entity: "Assessment", action: "purge", userField: "email", area: "Development Manager", note: "Assessment results and history" },
  { entity: "AssessmentQuestion", action: "rehome", area: "Development Manager", note: "Assessment question bank" },
  { entity: "CustomForm", action: "rehome", area: "Development Manager", note: "Custom forms" },
  { entity: "CustomFormTemplate", action: "rehome", area: "Development Manager", note: "Custom form templates" },
  { entity: "CustomFormSubmission", action: "purge", area: "Development Manager", note: "Custom form responses" },

  // ── Performance Manager ───────────────────────────────────────────────────
  { entity: "Goal", action: "purge", userField: "user_email", area: "Performance Manager", note: "Goals, KPIs and OKRs" },
  { entity: "KPI", action: "purge", area: "Performance Manager", note: "KPI definitions" },
  { entity: "Notification", action: "purge", userField: "user_email", area: "Performance Manager", note: "In-app notifications" },
  { entity: "UserActivity", action: "purge", userField: "user_email", area: "Performance Manager", note: "Activity tracking" },
  { entity: "PointTransaction", action: "purge", userField: "user_email", area: "Performance Manager", note: "Gamification points" },
  { entity: "UserAchievement", action: "purge", userField: "user_email", area: "Performance Manager", note: "User achievements" },
  { entity: "UserBadge", action: "purge", userField: "user_email", area: "Performance Manager", note: "Awarded badges" },

  // ── Reviews & Overview ────────────────────────────────────────────────────
  { entity: "ReviewParticipant", action: "purge", userField: "participant_email", area: "Reviews & Overview", note: "Review cycle participants" },
  { entity: "ReviewCycleEvent", action: "purge", area: "Reviews & Overview", note: "Review cycle events" },
  { entity: "ReviewCalibration", action: "purge", area: "Reviews & Overview", note: "Calibration sessions and judgments" },

  // ── Preserved configuration ───────────────────────────────────────────────
  { entity: "CheckInCustomQuestion", action: "preserve", area: "Configuration", note: "Check-In questions and targeting — kept as configured" },
];

/** Entities whose records carry a tenant key. */
export const TENANT_KEY = "client_id";

/** The test tenant name match, lowercased for comparison. */
export function isTestTenant(client: { name?: string; slug?: string } | null | undefined): boolean {
  if (!client) return false;
  const name = String(client.name || "").toLowerCase();
  const slug = String(client.slug || "").toLowerCase();
  return name.includes(TEST_TENANT_NAME) || slug === TEST_TENANT_NAME;
}