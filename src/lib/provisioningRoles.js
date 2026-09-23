/**
 * Shared role hierarchy for the unified provisioning UI.
 * Mirrors the ROLE_RANK map in provisioningCreateBatch (backend).
 * An admin can assign roles at or below their own rank.
 */

export const ROLE_RANK = {
  'User Level 1': 1,
  'User Level 2': 2,
  'Analyst': 3,
  'HRBP': 3,
  'Leadership Coach': 3,
  'Consultant': 3,
  'Admin Level 1': 4,
  'Admin Level 2': 5,
  'Super Administrator': 6,
  'Partner Business Administrator': 7,
  'Platform Admin': 8,
};

export const ALL_ROLES = Object.keys(ROLE_RANK);

export const ROLE_GROUPS = [
  {
    label: 'Individual',
    roles: ['User Level 1', 'User Level 2', 'Analyst', 'HRBP'],
  },
  {
    label: 'Practitioner',
    roles: ['Leadership Coach', 'Consultant'],
  },
  {
    label: 'Admin',
    roles: ['Admin Level 1', 'Admin Level 2', 'Super Administrator'],
  },
  {
    label: 'Platform',
    roles: ['Partner Business Administrator', 'Platform Admin'],
  },
];

export const FRIENDLY_ROLE_LABELS = {
  'User Level 1': 'User',
  'User Level 2': 'Team Leader',
  'Analyst': 'Analyst',
  'HRBP': 'HR Business Partner',
  'Leadership Coach': 'Leadership Coach',
  'Consultant': 'Consultant',
  'Admin Level 1': 'Program Admin',
  'Admin Level 2': 'HR Admin',
  'Super Administrator': 'Super Administrator',
  'Partner Business Administrator': 'Partner Administrator',
  'Platform Admin': 'Platform Admin',
};

export const getRoleRank = (role) => ROLE_RANK[role] ?? 0;

/**
 * Returns the list of roles the given admin app_role is allowed to assign.
 * Roles above the admin's rank are excluded.
 */
export const getAssignableRoles = (adminRole) => {
  const adminRank = getRoleRank(adminRole);
  return ALL_ROLES.filter((role) => ROLE_RANK[role] <= adminRank);
};

/**
 * Returns roles from a group that the admin is allowed to assign.
 */
export const getAssignableRolesInGroup = (adminRole, group) =>
  group.roles.filter((role) => ROLE_RANK[role] <= getRoleRank(adminRole));

/**
 * Whether a specific role is assignable by the given admin.
 */
export const canAssignRole = (adminRole, targetRole) =>
  getRoleRank(targetRole) <= getRoleRank(adminRole);