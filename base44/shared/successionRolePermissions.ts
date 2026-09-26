/**
 * successionRolePermissions — SERVER-OWNED permission derivation.
 *
 * The authoritative source of permissions is the user's app_role (set by
 * admins, not self-settable via updateMe) plus their assigned CustomRole
 * (managed by admins via assignAddonRole). This module replicates the
 * BASE_ROLE_PERMISSIONS mapping from the frontend constants so the backend
 * authorization layer can derive permissions from server-owned sources
 * WITHOUT trusting user.data.permissions (which is self-settable via the
 * platform-owned updateMe SDK method).
 *
 * CRITICAL: This mapping MUST stay in sync with
 * src/components/constants/permissions.jsx (BASE_ROLE_PERMISSIONS).
 * Any change to one file MUST be mirrored in the other.
 *
 * Why this exists: base44.auth.updateMe() is a platform-owned SDK method
 * that can persist arbitrary extra data on the User entity, including a
 * `permissions` array. If the backend authorization layer trusts
 * user.data.permissions, an ordinary user can self-grant any permission
 * by calling updateMe({ permissions: ["succession.cycles.view"] }). This
 * module closes that vector by deriving permissions exclusively from
 * server-owned sources (app_role + CustomRole entity).
 */

export const BASE_ROLE_PERMISSIONS: Record<string, string[]> = {
  'Platform Admin': ['*'],
  'Super Administrator': [
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'analytics.view_client', 'analytics.export',
    'content.view', 'content.create', 'content.edit', 'content.delete', 'content.publish',
    'programs.view', 'programs.create', 'programs.edit', 'programs.delete', 'programs.manage_participants',
    'assessments.view', 'assessments.create', 'assessments.deploy', 'assessments.view_results',
    'learning.view', 'learning.assign', 'learning.track_progress',
    'goals.view', 'goals.create', 'goals.assign', 'goals.cascade',
    'settings.view', 'settings.edit', 'settings.branding',
    'billing.view', 'billing.manage',
    'roles.view', 'roles.assign',
    'analytics.view_org', 'analytics.assessments.view', 'analytics.journeys.view',
    'analytics.development.view', 'analytics.performance.view', 'analytics.insights.view',
    'experiences.manage_org',
    'experiences.create_journey',
    'experiences.create_onboarding',
    'experiences.create_forms',
    'experiences.create_assessments',
    'experiences.deploy',
    'experiences.view_analytics',
    'succession.cycles.view', 'succession.cycles.manage',
    'succession.roles.view', 'succession.roles.manage',
    'succession.blueprints.approve',
    'succession.critical_role_requirements.approve',
    'succession.candidates.view', 'succession.candidates.manage',
    'succession.evidence.view', 'succession.evidence.attest',
    'succession.calibration.view', 'succession.calibration.manage',
    'succession.readiness.propose', 'succession.readiness.ratify',
    'succession.governance.view', 'succession.governance.manage',
    'succession.monitor.view', 'succession.monitor.manage',
    'succession.export',
    'succession.discovery.view', 'succession.discovery.manage',
    'succession.discovery.disclose',
    'succession.evidence.view', 'succession.evidence.manage',
    'succession.development.view', 'succession.development.manage',
    'succession.transition.view', 'succession.transition.manage',
    'succession.view_executive_aggregate', 'succession.compliance_view', 'succession.partner_aggregate_view'
  ],
  'Partner Business Administrator': [
    'users.view', 'users.create', 'users.edit',
    'analytics.view_client', 'analytics.export',
    'content.view', 'content.create', 'content.edit', 'content.publish',
    'programs.view', 'programs.create', 'programs.edit', 'programs.manage_participants',
    'assessments.view', 'assessments.deploy', 'assessments.view_results',
    'learning.view', 'learning.assign', 'learning.track_progress',
    'goals.view', 'goals.assign',
    'billing.view',
    'team.dashboard.view', 'team.assessments.view', 'team.journeys.view',
    'team.development.view', 'team.performance.view', 'team.insights.view',
    'team.goals.view', 'team.learning.view',
    'analytics.view_org', 'analytics.assessments.view', 'analytics.journeys.view',
    'analytics.development.view', 'analytics.performance.view', 'analytics.insights.view',
    'experiences.manage_org',
    'experiences.create_journey',
    'experiences.create_onboarding',
    'experiences.create_forms',
    'experiences.create_assessments',
    'experiences.deploy',
    'experiences.view_analytics',
    'succession.partner_aggregate_view'
  ],
  'Leadership Coach': [
    'classes.view', 'classes.create', 'classes.edit', 'classes.delete',
    'classes.schedule', 'classes.manage_enrollment', 'classes.mark_attendance', 'classes.issue_certificates',
    'programs.view', 'programs.create', 'programs.edit', 'programs.manage_participants',
    'journeys.view', 'journeys.create', 'journeys.edit', 'journeys.assign', 'journeys.manage',
    'coaching.view', 'coaching.create', 'coaching.manage',
    'coaching.action_plans.create', 'coaching.action_plans.manage',
    'coaching.goals.create', 'coaching.goals.manage',
    'coaching.sessions.schedule', 'coaching.sessions.manage',
    'coaching.engagements.create', 'coaching.engagements.manage',
    'cohorts.view', 'cohorts.create', 'cohorts.edit', 'cohorts.manage_participants',
    'certificates.view', 'certificates.issue', 'certificates.revoke',
    'analytics.view_team', 'analytics.program.view', 'analytics.coaching.view',
    'analytics.engagement.view', 'analytics.content.view',
    'reports.program.view', 'reports.program.create', 'reports.program.schedule', 'reports.program.download',
    'assessments.view', 'assessments.view_results',
    'learning.view', 'learning.assign', 'learning.track_progress',
    'goals.view', 'goals.create', 'goals.assign',
    'program_goals.view', 'program_goals.manage', 'program_goals.approve', 'program_goals.comment',
    'program_performance.view', 'program_performance.export', 'program_performance.reports',
    'experiences.manage_org', 'experiences.create_journey', 'experiences.create_onboarding',
    'experiences.deploy', 'experiences.view_analytics',
    'coaching.notes.private',
    'coaching.message',
    'coaching.brief.view'
  ],
  'Consultant': [
    'classes.view', 'classes.create', 'classes.edit', 'classes.delete',
    'classes.schedule', 'classes.manage_enrollment', 'classes.mark_attendance', 'classes.issue_certificates',
    'programs.view', 'programs.create', 'programs.edit', 'programs.manage_participants',
    'journeys.view', 'journeys.create', 'journeys.edit', 'journeys.assign', 'journeys.manage',
    'coaching.view', 'coaching.create', 'coaching.manage',
    'coaching.action_plans.create', 'coaching.action_plans.manage',
    'coaching.goals.create', 'coaching.goals.manage',
    'coaching.sessions.schedule', 'coaching.sessions.manage',
    'coaching.engagements.create', 'coaching.engagements.manage',
    'cohorts.view', 'cohorts.create', 'cohorts.edit', 'cohorts.manage_participants',
    'certificates.view', 'certificates.issue', 'certificates.revoke',
    'analytics.view_team', 'analytics.program.view', 'analytics.coaching.view',
    'analytics.engagement.view', 'analytics.content.view',
    'reports.program.view', 'reports.program.create', 'reports.program.schedule', 'reports.program.download',
    'assessments.view', 'assessments.view_results',
    'learning.view', 'learning.assign', 'learning.track_progress',
    'goals.view', 'goals.create', 'goals.assign',
    'program_goals.view', 'program_goals.manage', 'program_goals.approve', 'program_goals.comment',
    'program_performance.view', 'program_performance.export', 'program_performance.reports',
    'experiences.manage_org', 'experiences.create_journey', 'experiences.create_onboarding',
    'experiences.deploy', 'experiences.view_analytics',
    'coaching.notes.private',
    'coaching.message',
    'coaching.brief.view'
  ],
  'Admin Level 2': [
    'users.view', 'users.create', 'users.edit',
    'analytics.view_client', 'analytics.export',
    'content.view', 'content.create', 'content.edit', 'content.publish',
    'programs.view', 'programs.create', 'programs.edit', 'programs.manage_participants',
    'assessments.view', 'assessments.deploy', 'assessments.view_results',
    'learning.view', 'learning.assign', 'learning.track_progress',
    'goals.view', 'goals.assign', 'goals.cascade',
    'settings.view',
    'analytics.view_org', 'analytics.assessments.view', 'analytics.journeys.view',
    'analytics.development.view', 'analytics.performance.view', 'analytics.insights.view',
    'experiences.manage_org',
    'experiences.create_journey',
    'experiences.create_onboarding',
    'experiences.create_forms',
    'experiences.create_assessments',
    'experiences.deploy',
    'experiences.view_analytics',
    'leadership_index.assign',
    'leadership_index.approve_requests',
    'leadership_index.view_analytics',
    'succession.cycles.view', 'succession.cycles.manage',
    'succession.roles.view', 'succession.roles.manage',
    'succession.blueprints.approve',
    'succession.critical_role_requirements.approve',
    'succession.discovery.view', 'succession.discovery.manage',
    'succession.discovery.disclose',
    'succession.evidence.view', 'succession.evidence.manage',
    'succession.development.view', 'succession.development.manage',
    'succession.transition.view', 'succession.transition.manage',
    'succession.monitor.view', 'succession.monitor.manage'
  ],
  'Admin Level 1': [
    'classes.view', 'classes.create', 'classes.edit', 'classes.delete',
    'classes.schedule', 'classes.manage_enrollment', 'classes.mark_attendance', 'classes.issue_certificates',
    'programs.view', 'programs.create', 'programs.edit', 'programs.manage_participants',
    'journeys.view', 'journeys.create', 'journeys.edit', 'journeys.assign', 'journeys.manage',
    'coaching.view', 'coaching.create', 'coaching.manage',
    'coaching.action_plans.create', 'coaching.action_plans.manage',
    'coaching.goals.create', 'coaching.goals.manage',
    'coaching.sessions.schedule', 'coaching.sessions.manage',
    'coaching.engagements.create', 'coaching.engagements.manage',
    'cohorts.view', 'cohorts.create', 'cohorts.edit', 'cohorts.manage_participants',
    'certificates.view', 'certificates.issue', 'certificates.revoke',
    'analytics.view_team', 'analytics.program.view', 'analytics.coaching.view',
    'analytics.engagement.view', 'analytics.content.view',
    'reports.program.view', 'reports.program.create', 'reports.program.schedule', 'reports.program.download',
    'assessments.view', 'assessments.view_results',
    'learning.view', 'learning.assign', 'learning.track_progress',
    'goals.view', 'goals.create', 'goals.assign',
    'program_goals.view', 'program_goals.manage', 'program_goals.approve', 'program_goals.comment',
    'program_performance.view', 'program_performance.export', 'program_performance.reports',
    'experiences.manage_org',
    'experiences.create_journey',
    'experiences.create_onboarding',
    'experiences.deploy',
    'experiences.view_analytics',
    'succession.cycles.view', 'succession.cycles.manage',
    'succession.roles.view', 'succession.roles.manage',
    'succession.discovery.view', 'succession.discovery.manage',
    'succession.discovery.disclose',
    'succession.evidence.view', 'succession.evidence.manage',
    'succession.development.view', 'succession.development.manage',
    'succession.transition.view', 'succession.transition.manage',
    'succession.monitor.view'
  ],
  'Executive': [
    'analytics.view_client',
    'analytics.view_org',
    'analytics.export',
    'users.view',
    'content.view',
    'programs.view',
    'assessments.view',
    'learning.view',
    'goals.view',
    'analytics.assessments.view', 'analytics.journeys.view',
    'analytics.development.view', 'analytics.performance.view', 'analytics.insights.view',
    'leadership_index.view_analytics'
  ],
  'Analyst': [
    'analytics.view_client',
    'analytics.view_org',
    'analytics.export',
    'users.view',
    'content.view',
    'programs.view',
    'assessments.view',
    'learning.view',
    'goals.view',
    'analytics.assessments.view', 'analytics.journeys.view',
    'analytics.development.view', 'analytics.performance.view', 'analytics.insights.view',
    'leadership_index.view_analytics'
  ],
  'HRBP': [
    'analytics.view_client',
    'analytics.view_org',
    'users.view',
    'content.view',
    'programs.view',
    'assessments.view',
    'learning.view',
    'goals.view'
  ],
  'User Level 2': [
    'analytics.view_team',
    'users.view',
    'content.view',
    'learning.view',
    'goals.view',
    'team.dashboard.view', 'team.assessments.view', 'team.journeys.view',
    'team.development.view', 'team.performance.view', 'team.insights.view',
    'team.goals.view', 'team.learning.view',
    'personal.dashboard.view', 'personal.assessments.view', 'personal.journeys.view',
    'personal.development.view', 'personal.performance.view', 'personal.insights.view',
    'personal.goals.view', 'personal.learning.view',
    'experiences.view_personal',
    'experiences.take',
    'experiences.view_team',
    'experiences.track_team_progress',
    'succession.discovery.disclose'
  ],
  'User Level 1': [
    'content.view',
    'learning.view',
    'goals.view',
    'personal.dashboard.view', 'personal.assessments.view', 'personal.journeys.view',
    'personal.development.view', 'personal.performance.view', 'personal.insights.view',
    'personal.goals.view', 'personal.learning.view',
    'experiences.view_personal',
    'experiences.take',
    'succession.discovery.disclose'
  ]
};

/**
 * Derive the authoritative permission list for a user from SERVER-OWNED
 * sources only: the user's app_role (admin-set, not self-settable) and
 * their assigned CustomRole (admin-managed via assignAddonRole).
 *
 * This function NEVER reads user.data.permissions or user.permissions —
 * those fields are self-settable via the platform-owned updateMe SDK
 * method and are NOT trusted for authorization decisions.
 *
 * @param user The authenticated user object from base44.auth.me()
 * @param base44 The base44 client (for asServiceRole CustomRole lookup)
 * @returns Merged permission array from role + CustomRole
 */
export async function deriveServerOwnedPermissions(
  user: any,
  base44: any
): Promise<string[]> {
  // SECURITY: Read ONLY the top-level app_role (server-owned, set by admin
  // functions via asServiceRole). Never read user.data?.app_role — it is
  // self-settable via the platform-owned updateMe SDK method. If app_role
  // is absent, default to 'User Level 1' (least privilege / fail closed).
  const role = user.app_role || 'User Level 1';

  // Step 1: Base permissions from app_role (server-side mapping)
  const basePermissions: string[] = BASE_ROLE_PERMISSIONS[role] || [];

  // Step 2: Addon permissions from CustomRole (server-owned entity,
  // managed by admins via assignAddonRole). Read via asServiceRole to
  // bypass RLS — this is the authorization bootstrap layer.
  let addonPermissions: string[] = [];
  const customRoleId = user.custom_role_id || user.data?.custom_role_id;
  if (customRoleId) {
    try {
      const roles = await base44.asServiceRole.entities.CustomRole.filter({
        id: customRoleId,
      });
      if (roles && roles.length > 0 && Array.isArray(roles[0].permissions)) {
        addonPermissions = roles[0].permissions;
      }
    } catch {
      // CustomRole may not exist or lookup may fail — fall back to base only
    }
  }

  // Step 3: Merge (deduplicated)
  return [...new Set([...basePermissions, ...addonPermissions])];
}