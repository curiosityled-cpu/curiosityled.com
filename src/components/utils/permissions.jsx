/**
 * Permission configuration for assignment features
 * Maps user roles to their assignment capabilities and scope
 */

export const ASSIGNMENT_PERMISSIONS = {
  'User Level 2': {
    canAssignOnboarding: true,
    canAssignJourneys: true,
    canAssignAssessments: true,
    scope: 'team_hierarchy',
    scopeDescription: 'Direct reports and nested teams (up to 10 levels deep)',
    maxTeamDepth: 10
  },
  'Admin Level 1': {
    canAssignOnboarding: true,
    canAssignJourneys: true,
    canAssignAssessments: true,
    scope: 'programs',
    scopeDescription: 'All users in managed programs and cohorts',
    maxTeamDepth: null
  },
  'Admin Level 2': {
    canAssignOnboarding: true,
    canAssignJourneys: true,
    canAssignAssessments: true,
    scope: 'all_divisions',
    scopeDescription: 'All divisions and teams within organization',
    maxTeamDepth: null
  },
  'Super Administrator': {
    canAssignOnboarding: true,
    canAssignJourneys: true,
    canAssignAssessments: true,
    scope: 'organization_wide',
    scopeDescription: 'All users within the organization',
    maxTeamDepth: null
  },
  'Partner Business Administrator': {
    canAssignOnboarding: true,
    canAssignJourneys: true,
    canAssignAssessments: true,
    scope: 'partner_clients',
    scopeDescription: 'All users across partner-managed client organizations',
    maxTeamDepth: null
  },
  'Platform Admin': {
    canAssignOnboarding: true,
    canAssignJourneys: true,
    canAssignAssessments: true,
    scope: 'platform_wide',
    scopeDescription: 'All users across all organizations on the platform',
    maxTeamDepth: null
  },
  'default': {
    canAssignOnboarding: false,
    canAssignJourneys: false,
    canAssignAssessments: false,
    scope: 'none',
    scopeDescription: 'No assignment permissions',
    maxTeamDepth: null
  }
};

export function hasAssignmentPermission(userRole, assignmentType) {
  const permissions = ASSIGNMENT_PERMISSIONS[userRole] || ASSIGNMENT_PERMISSIONS.default;
  
  switch (assignmentType) {
    case 'onboarding':
      return permissions.canAssignOnboarding;
    case 'journey':
      return permissions.canAssignJourneys;
    case 'assessment':
      return permissions.canAssignAssessments;
    default:
      return false;
  }
}

export function getAssignmentScope(userRole) {
  const permissions = ASSIGNMENT_PERMISSIONS[userRole] || ASSIGNMENT_PERMISSIONS.default;
  return {
    scope: permissions.scope,
    description: permissions.scopeDescription,
    maxTeamDepth: permissions.maxTeamDepth
  };
}

export function canAssignToUser(assignerRole, assignerEmail, targetUser, teamHierarchy = null) {
  const permissions = ASSIGNMENT_PERMISSIONS[assignerRole] || ASSIGNMENT_PERMISSIONS.default;
  
  if (permissions.scope === 'platform_wide') return true;
  if (permissions.scope === 'organization_wide' || permissions.scope === 'all_divisions') return true;
  if (permissions.scope === 'partner_clients') return true;
  if (permissions.scope === 'programs') return true;
  
  if (permissions.scope === 'team_hierarchy') {
    if (!teamHierarchy) return false;
    return teamHierarchy.subordinate_emails.includes(targetUser.email);
  }
  
  return false;
}

export function getAssignmentActionLabel(userRole, assignmentType) {
  const scope = getAssignmentScope(userRole);
  
  const typeLabels = {
    onboarding: 'Onboarding Plan',
    journey: 'Learning Journey',
    assessment: 'Assessment'
  };
  
  const scopeLabels = {
    team_hierarchy: 'to Your Team',
    programs: 'to Program Participants',
    all_divisions: 'to Organization',
    organization_wide: 'to Organization',
    partner_clients: 'to Clients',
    platform_wide: 'Platform-wide'
  };
  
  return `Assign ${typeLabels[assignmentType]} ${scopeLabels[scope.scope] || ''}`;
}