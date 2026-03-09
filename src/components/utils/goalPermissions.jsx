/**
 * Goal Permission Management
 * Defines granular permissions for goals based on user roles
 */

export const GOAL_PERMISSIONS = {
  'User Level 1': {
    canCreate: 'own',
    canView: 'own_and_member',
    canEdit: 'own_and_editor',
    canDelete: 'own_and_owner',
    canInvite: 'own',
    canManageCollaborators: 'own',
    analyticsScope: 'own',
    description: 'User'
  },
  'User Level 2': {
    canCreate: 'own_and_direct_reports',
    canView: 'own_direct_reports_team',
    canEdit: 'own_direct_reports_editor',
    canDelete: 'own_direct_reports',
    canInvite: 'own_and_direct_reports',
    canManageCollaborators: 'own_and_direct_reports',
    analyticsScope: 'team',
    description: 'Team Leader'
  },
  'Analyst': {
    canCreate: 'no',
    canView: 'organization_readonly',
    canEdit: 'no',
    canDelete: 'no',
    canInvite: 'no',
    canManageCollaborators: 'no',
    analyticsScope: 'organization',
    description: 'Analyst (Read-Only)'
  },
  'Admin Level 1': {
    canCreate: 'programs',
    canView: 'programs',
    canEdit: 'programs',
    canDelete: 'programs',
    canInvite: 'programs',
    canManageCollaborators: 'programs',
    analyticsScope: 'programs',
    description: 'Program Admin'
  },
  'Admin Level 2': {
    canCreate: 'hr_initiatives',
    canView: 'organization_readonly',
    canEdit: 'hr_owned',
    canDelete: 'hr_owned',
    canInvite: 'hr_only',
    canManageCollaborators: 'hr_only',
    analyticsScope: 'organization_aggregated',
    description: 'HR Admin'
  },
  'Super Administrator': {
    canCreate: 'yes',
    canView: 'organization',
    canEdit: 'organization',
    canDelete: 'organization',
    canInvite: 'yes',
    canManageCollaborators: 'yes',
    analyticsScope: 'organization',
    description: 'Super Administrator (Tenant-bound)'
  },
  'Partner Business Administrator': {
    canCreate: 'yes',
    canView: 'managed_clients',
    canEdit: 'managed_clients',
    canDelete: 'managed_clients',
    canInvite: 'yes',
    canManageCollaborators: 'yes',
    analyticsScope: 'managed_clients',
    description: 'Partner Business Admin'
  },
  'Platform Admin': {
    canCreate: 'yes',
    canView: 'platform',
    canEdit: 'platform',
    canDelete: 'platform',
    canInvite: 'yes',
    canManageCollaborators: 'yes',
    analyticsScope: 'platform',
    description: 'Platform Administrator (Global)'
  }
};

/**
 * Check if user can create a goal
 */
export function canCreateGoal(userRole, context = {}) {
  const permissions = GOAL_PERMISSIONS[userRole];
  if (!permissions) return false;
  
  const capability = permissions.canCreate;
  
  if (capability === 'yes') return true;
  if (capability === 'own' || capability === 'own_and_direct_reports' || capability === 'own_and_strategic') return true;
  if (capability === 'programs' && context.programId) return true;
  if (capability === 'hr_initiatives') return true;
  if (capability === 'no') return false;
  
  return false;
}

/**
 * Check if user can view a specific goal
 */
export function canViewGoal(userRole, goal, user, context = {}) {
  const permissions = GOAL_PERMISSIONS[userRole];
  if (!permissions) return false;
  
  const capability = permissions.canView;
  
  // Platform Admin can view everything
  if (capability === 'platform') return true;
  
  // Super Admin can view everything in their organization
  if (capability === 'organization' && goal.client_id === user.client_id) return true;
  
  // Partner Business Admin can view goals in managed clients
  if (capability === 'managed_clients' && context.partnerClientIds?.includes(goal.client_id)) return true;
  
  // HR Admin and Analyst can view all organization goals (readonly)
  if (capability === 'organization_readonly' && goal.client_id === user.client_id) return true;
  
  // Team Leader can view team goals
  if (capability === 'own_direct_reports_team') {
    if (goal.created_by === user.email) return true;
    if (goal.assigned_to_emails?.includes(user.email)) return true;
    if (goal.members?.some(m => m.user_email === user.email)) return true;
    if (context.subordinateEmails?.includes(goal.created_by)) return true;
  }
  
  // Program Admin can view program goals
  if (capability === 'programs' && context.managedProgramIds?.includes(goal.program_id)) return true;
  
  // Individual can view own and member goals
  if (capability === 'own_and_member') {
    if (goal.created_by === user.email) return true;
    if (goal.assigned_to_emails?.includes(user.email)) return true;
    if (goal.members?.some(m => m.user_email === user.email)) return true;
    if (goal.visibility === 'shared') return true;
  }
  
  return false;
}

/**
 * Check if user can edit a specific goal
 */
export function canEditGoal(userRole, goal, user, context = {}) {
  const permissions = GOAL_PERMISSIONS[userRole];
  if (!permissions) return false;
  
  const capability = permissions.canEdit;
  
  // Analyst has no edit permissions
  if (capability === 'no') return false;
  
  // Platform Admin can edit everything
  if (capability === 'platform') return true;
  
  // Super Admin can edit everything in their organization
  if (capability === 'organization' && goal.client_id === user.client_id) return true;
  
  // Partner Business Admin can edit goals in managed clients
  if (capability === 'managed_clients' && context.partnerClientIds?.includes(goal.client_id)) return true;
  
  // HR Admin can edit only HR-owned goals
  if (capability === 'hr_owned' && goal.created_by === user.email) return true;
  
  // Team Leader can edit own, direct reports, and editor goals
  if (capability === 'own_direct_reports_editor') {
    if (goal.created_by === user.email) return true;
    if (context.subordinateEmails?.includes(goal.created_by)) return true;
    if (goal.members?.some(m => m.user_email === user.email && (m.role === 'owner' || m.role === 'editor'))) return true;
  }
  
  // Program Admin can edit program goals
  if (capability === 'programs' && context.managedProgramIds?.includes(goal.program_id)) return true;
  
  // Individual can edit own and editor goals
  if (capability === 'own_and_editor') {
    if (goal.created_by === user.email) return true;
    if (goal.members?.some(m => m.user_email === user.email && (m.role === 'owner' || m.role === 'editor'))) return true;
  }
  
  return false;
}

/**
 * Check if user can delete a specific goal
 */
export function canDeleteGoal(userRole, goal, user, context = {}) {
  const permissions = GOAL_PERMISSIONS[userRole];
  if (!permissions) return false;
  
  const capability = permissions.canDelete;
  
  // Analyst has no delete permissions
  if (capability === 'no') return false;
  
  // Platform Admin can delete everything
  if (capability === 'platform') return true;
  
  // Super Admin can delete everything in their organization
  if (capability === 'organization' && goal.client_id === user.client_id) return true;
  
  // Partner Business Admin can delete goals in managed clients
  if (capability === 'managed_clients' && context.partnerClientIds?.includes(goal.client_id)) return true;
  
  // HR Admin can delete only HR-owned goals
  if (capability === 'hr_owned' && goal.created_by === user.email) return true;
  
  // Team Leader can delete own and direct reports' goals
  if (capability === 'own_direct_reports') {
    if (goal.created_by === user.email) return true;
    if (context.subordinateEmails?.includes(goal.created_by)) return true;
  }
  
  // Program Admin can delete program goals
  if (capability === 'programs' && context.managedProgramIds?.includes(goal.program_id)) return true;
  
  // Individual can delete own goals (as creator or owner)
  if (capability === 'own_and_owner') {
    if (goal.created_by === user.email) return true;
    if (goal.members?.some(m => m.user_email === user.email && m.role === 'owner')) return true;
  }
  
  return false;
}

/**
 * Check if user can invite collaborators to a goal
 */
export function canInviteCollaborators(userRole, goal, user, context = {}) {
  const permissions = GOAL_PERMISSIONS[userRole];
  if (!permissions) return false;
  
  const capability = permissions.canInvite;
  
  // Analyst has no invite permissions
  if (capability === 'no') return false;
  
  if (capability === 'yes') return canEditGoal(userRole, goal, user, context);
  if (capability === 'own') return goal.created_by === user.email;
  if (capability === 'own_and_direct_reports') {
    return goal.created_by === user.email || context.subordinateEmails?.includes(goal.created_by);
  }
  if (capability === 'programs') return context.managedProgramIds?.includes(goal.program_id);
  if (capability === 'hr_only') return goal.created_by === user.email;
  
  return false;
}

/**
 * Get analytics scope description for role
 */
export function getAnalyticsScope(userRole) {
  const permissions = GOAL_PERMISSIONS[userRole];
  return permissions?.analyticsScope || 'none';
}

/**
 * Get permission description for role
 */
export function getGoalPermissionDescription(userRole) {
  const permissions = GOAL_PERMISSIONS[userRole];
  return permissions?.description || 'No permissions';
}

/**
 * Helper to build context object from user and auth data
 */
export function buildGoalPermissionContext(user, authData = {}) {
  return {
    subordinateEmails: authData.subordinate_emails || user.subordinate_emails || [],
    managedProgramIds: authData.managed_program_ids || user.managed_program_ids || [],
    partnerClientIds: authData.partner_client_ids || user.partner_client_ids || [],
    department: user.department,
    client_id: user.client_id
  };
}