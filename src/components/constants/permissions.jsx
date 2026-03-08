// Permission constants for the addon permission system
// These are used by CustomRoles to grant additional permissions beyond the base app_role

// Experience Management Permissions
export const EXPERIENCE_PERMISSIONS = [
  // Personal participation
  'experiences.view_personal',
  'experiences.take',
  
  // Team oversight
  'experiences.view_team',
  'experiences.track_team_progress',
  
  // Organizational management
  'experiences.manage_org',
  'experiences.create_journey',
  'experiences.create_onboarding',
  'experiences.create_forms',
  'experiences.create_assessments',
  'experiences.deploy',
  'experiences.view_analytics'
];

// Team Leader Add-on Permissions
export const TEAM_LEADER_PERMISSIONS = [
  'team.dashboard.view',
  'team.assessments.view',
  'team.journeys.view',
  'team.development.view',
  'team.performance.view',
  'team.insights.view',
  'team.goals.view',
  'team.learning.view',
  // Team-level experience permissions
  'experiences.view_team',
  'experiences.track_team_progress'
];

// Analyst Add-on Permissions
export const ANALYST_PERMISSIONS = [
  'analytics.view_client',
  'analytics.view_org',
  'analytics.export',
  'analytics.assessments.view',
  'analytics.journeys.view',
  'analytics.development.view',
  'analytics.performance.view',
  'analytics.insights.view',
  // Leadership Index Analytics
  'leadership_index.view_analytics'
];

// Program Manager (Admin Level 1) Core Permissions
export const PROGRAM_MANAGER_PERMISSIONS = [
  // Class Management
  'classes.view',
  'classes.create',
  'classes.edit',
  'classes.delete',
  'classes.schedule',
  'classes.manage_enrollment',
  'classes.mark_attendance',
  'classes.issue_certificates',
  
  // Program & Journey Management
  'programs.view',
  'programs.create',
  'programs.edit',
  'programs.manage_participants',
  'journeys.view',
  'journeys.create',
  'journeys.edit',
  'journeys.assign',
  'journeys.manage',
  
  // Coaching
  'coaching.view',
  'coaching.create',
  'coaching.manage',
  'coaching.action_plans.create',
  'coaching.action_plans.manage',
  'coaching.goals.create',
  'coaching.goals.manage',
  'coaching.sessions.schedule',
  'coaching.sessions.manage',
  'coaching.engagements.create',
  'coaching.engagements.manage',
  
  // Cohort Management
  'cohorts.view',
  'cohorts.create',
  'cohorts.edit',
  'cohorts.manage_participants',
  
  // Certificate Management
  'certificates.view',
  'certificates.issue',
  'certificates.revoke',
  
  // Analytics (scoped to their programs/coachees)
  'analytics.program.view',
  'analytics.coaching.view',
  'analytics.engagement.view',
  'analytics.content.view',
  
  // Reports
  'reports.program.view',
  'reports.program.create',
  'reports.program.schedule',
  'reports.program.download',
  
  // Goals (for coachees)
  'goals.view',
  'goals.create',
  'goals.assign',
  
  // Program Goals Oversight
  'program_goals.view',
  'program_goals.manage',
  'program_goals.approve',
  'program_goals.comment',
  
  // Program Performance Reports
  'program_performance.view',
  'program_performance.export',
  'program_performance.reports',
  
  // Learning
  'learning.view',
  'learning.assign',
  'learning.track_progress',
  
  // Assessments
  'assessments.view',
  'assessments.view_results',
  
  // Experience Management (Program Admin focus)
  'experiences.manage_org',
  'experiences.create_journey',
  'experiences.create_onboarding',
  'experiences.deploy',
  'experiences.view_analytics'
];

// Program Admin Add-on Permissions (legacy - for backwards compatibility)
export const PROGRAM_ADMIN_PERMISSIONS = [
  'programs.view',
  'programs.create',
  'programs.edit',
  'programs.delete',
  'programs.manage_participants',
  'programs.analytics.view',
  'cohorts.view',
  'cohorts.create',
  'cohorts.edit',
  'cohorts.manage_participants'
];

// HR Admin Add-on Permissions
export const HR_ADMIN_PERMISSIONS = [
  'users.view',
  'users.create',
  'users.edit',
  'users.delete',
  'roles.view',
  'roles.assign',
  'settings.view',
  'settings.edit',
  'content.view',
  'content.create',
  'content.edit',
  'content.delete',
  'content.publish',
  // Experience Management (HR Admin full access)
  'experiences.manage_org',
  'experiences.create_journey',
  'experiences.create_onboarding',
  'experiences.create_forms',
  'experiences.create_assessments',
  'experiences.deploy',
  'experiences.view_analytics',
  // Leadership Index Assessment Permissions
  'leadership_index.assign',
  'leadership_index.approve_requests',
  'leadership_index.view_analytics'
];

// User Add-on Permissions (for admins who want to see their own personal progress)
export const USER_PERMISSIONS = [
  'personal.dashboard.view',
  'personal.assessments.view',
  'personal.journeys.view',
  'personal.development.view',
  'personal.performance.view',
  'personal.insights.view',
  'personal.goals.view',
  'personal.learning.view',
  // Personal experience participation
  'experiences.view_personal',
  'experiences.take'
];

// Predefined Add-on Role Templates
export const ADDON_ROLE_TEMPLATES = [
  {
    role_name: 'User Add-on',
    role_key: 'user_addon',
    description: 'Grants access to personal dashboard, assessments, journeys, and progress tracking (for admins who also want to participate as learners)',
    permissions: USER_PERMISSIONS,
    is_system_role: true,
    is_addon: true,
    color: '#6366F1' // indigo
  },
  {
    role_name: 'Team Leader Add-on',
    role_key: 'team_leader_addon',
    description: 'Grants access to view and analyze team data across all sections (dashboard, assessments, journeys, development, performance, insights)',
    permissions: TEAM_LEADER_PERMISSIONS,
    is_system_role: true,
    is_addon: true,
    color: '#3B82F6' // blue
  },
  {
    role_name: 'Analyst Add-on',
    role_key: 'analyst_addon',
    description: 'Grants access to organizational analytics and reporting across all sections',
    permissions: ANALYST_PERMISSIONS,
    is_system_role: true,
    is_addon: true,
    color: '#8B5CF6' // purple
  },
  {
    role_name: 'Program Admin Add-on',
    role_key: 'program_admin_addon',
    description: 'Grants access to create and manage programs, cohorts, and participants',
    permissions: PROGRAM_ADMIN_PERMISSIONS,
    is_system_role: true,
    is_addon: true,
    color: '#10B981' // green
  },
  {
    role_name: 'HR Admin Add-on',
    role_key: 'hr_admin_addon',
    description: 'Grants access to user management, role assignment, and content administration',
    permissions: HR_ADMIN_PERMISSIONS,
    is_system_role: true,
    is_addon: true,
    color: '#F59E0B' // amber
  },
  {
    role_name: 'Full Program Manager Add-on',
    role_key: 'program_manager_addon',
    description: 'Full Program Manager capabilities: class management, coaching, journeys, certificates, and scoped analytics',
    permissions: PROGRAM_MANAGER_PERMISSIONS,
    is_system_role: true,
    is_addon: true,
    color: '#0EA5E9' // sky blue
  }
];

// All permission categories for the system
export const PERMISSION_CATEGORIES = [
  { key: 'experiences', label: 'Experience Management', description: 'Create, deploy, and manage organizational experiences (journeys, onboarding, forms, assessments)' },
  { key: 'classes', label: 'Class Management', description: 'ILT, workshops, scheduling, enrollment, attendance' },
  { key: 'coaching', label: 'Coaching', description: '1:1 coaching, team interventions, action plans' },
  { key: 'programs', label: 'Programs', description: 'Leadership development programs' },
  { key: 'journeys', label: 'Journeys', description: 'Learning journeys creation and assignment' },
  { key: 'cohorts', label: 'Cohorts', description: 'Cohort management and participants' },
  { key: 'certificates', label: 'Certificates', description: 'Issue and manage completion certificates' },
  { key: 'analytics', label: 'Analytics', description: 'View and export analytics data' },
  { key: 'reports', label: 'Reports', description: 'Create, schedule, and download reports' },
  { key: 'users', label: 'Users', description: 'User management and permissions' },
  { key: 'content', label: 'Content', description: 'Learning resources and content' },
  { key: 'goals', label: 'Goals', description: 'Goals and performance tracking' },
  { key: 'program_goals', label: 'Program Goals', description: 'Program goals oversight and management' },
  { key: 'program_performance', label: 'Program Performance', description: 'Program performance reports and analytics' },
  { key: 'assessments', label: 'Assessments', description: 'Leadership assessments' },
  { key: 'leadership_index', label: 'Leadership Index', description: 'Leadership Index assessment management and analytics' },
  { key: 'learning', label: 'Learning', description: 'Learning assignments and progress' },
  { key: 'settings', label: 'Settings', description: 'System settings and configuration' },
  { key: 'billing', label: 'Billing', description: 'Billing and subscription management' },
  { key: 'roles', label: 'Roles', description: 'Role management and assignment' }
];

// Base role permission mappings (existing from useAuth)
export const BASE_ROLE_PERMISSIONS = {
  'Platform Admin': ['*'], // All permissions
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
    // Org analytics permissions (Super Admins see org-scoped analytics, not team by default)
    'analytics.view_org', 'analytics.assessments.view', 'analytics.journeys.view',
    'analytics.development.view', 'analytics.performance.view', 'analytics.insights.view',
    // Experience Management (Super Admin full access)
    'experiences.manage_org',
    'experiences.create_journey',
    'experiences.create_onboarding',
    'experiences.create_forms',
    'experiences.create_assessments',
    'experiences.deploy',
    'experiences.view_analytics'
    // NOTE: Team permissions removed - Super Admins need Team Leader Add-on for team view
    // NOTE: Personal dashboard permissions removed - Super Admins need User Add-on to see their own progress
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
    // Team permissions
    'team.dashboard.view', 'team.assessments.view', 'team.journeys.view',
    'team.development.view', 'team.performance.view', 'team.insights.view',
    'team.goals.view', 'team.learning.view',
    // Org analytics permissions
    'analytics.view_org', 'analytics.assessments.view', 'analytics.journeys.view',
    'analytics.development.view', 'analytics.performance.view', 'analytics.insights.view',
    // Experience Management (Partner Admin full access)
    'experiences.manage_org',
    'experiences.create_journey',
    'experiences.create_onboarding',
    'experiences.create_forms',
    'experiences.create_assessments',
    'experiences.deploy',
    'experiences.view_analytics'
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
    // NOTE: Team permissions removed - Admin Level 2 needs Team Leader Add-on for team views
    // Org analytics permissions
    'analytics.view_org', 'analytics.assessments.view', 'analytics.journeys.view',
    'analytics.development.view', 'analytics.performance.view', 'analytics.insights.view',
    // Experience Management (HR Admin full access)
    'experiences.manage_org',
    'experiences.create_journey',
    'experiences.create_onboarding',
    'experiences.create_forms',
    'experiences.create_assessments',
    'experiences.deploy',
    'experiences.view_analytics',
    // Leadership Index Assessment Permissions (HR Admin role)
    'leadership_index.assign',
    'leadership_index.approve_requests',
    'leadership_index.view_analytics'
  ],
  'Admin Level 1': [
    // Class Management
    'classes.view', 'classes.create', 'classes.edit', 'classes.delete',
    'classes.schedule', 'classes.manage_enrollment', 'classes.mark_attendance', 'classes.issue_certificates',
    
    // Program & Journey Management
    'programs.view', 'programs.create', 'programs.edit', 'programs.manage_participants',
    'journeys.view', 'journeys.create', 'journeys.edit', 'journeys.assign', 'journeys.manage',
    
    // Coaching
    'coaching.view', 'coaching.create', 'coaching.manage',
    'coaching.action_plans.create', 'coaching.action_plans.manage',
    'coaching.goals.create', 'coaching.goals.manage',
    'coaching.sessions.schedule', 'coaching.sessions.manage',
    'coaching.engagements.create', 'coaching.engagements.manage',
    
    // Cohort Management
    'cohorts.view', 'cohorts.create', 'cohorts.edit', 'cohorts.manage_participants',
    
    // Certificate Management
    'certificates.view', 'certificates.issue', 'certificates.revoke',
    
    // Analytics (scoped to managed programs/coachees)
    'analytics.view_team', 'analytics.program.view', 'analytics.coaching.view',
    'analytics.engagement.view', 'analytics.content.view',
    
    // Reports
    'reports.program.view', 'reports.program.create', 'reports.program.schedule', 'reports.program.download',
    
    // Goals, Learning, Assessments
    'assessments.view', 'assessments.view_results',
    'learning.view', 'learning.assign', 'learning.track_progress',
    'goals.view', 'goals.create', 'goals.assign',
    
    // Program Goals Oversight
    'program_goals.view', 'program_goals.manage', 'program_goals.approve', 'program_goals.comment',
    
    // Program Performance Reports
    'program_performance.view', 'program_performance.export', 'program_performance.reports',
    
    // NOTE: Team permissions removed - Admin Level 1 needs Team Leader Add-on for team views
    
    // Experience Management (Program Manager)
    'experiences.manage_org',
    'experiences.create_journey',
    'experiences.create_onboarding',
    'experiences.deploy',
    'experiences.view_analytics'
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
    // Org analytics permissions
    'analytics.assessments.view', 'analytics.journeys.view',
    'analytics.development.view', 'analytics.performance.view', 'analytics.insights.view',
    // Leadership Index Analytics
    'leadership_index.view_analytics'
  ],
  'User Level 2': [
    'analytics.view_team',
    'users.view',
    'content.view',
    'learning.view',
    'goals.view',
    // Team permissions for Team Leader
    'team.dashboard.view', 'team.assessments.view', 'team.journeys.view',
    'team.development.view', 'team.performance.view', 'team.insights.view',
    'team.goals.view', 'team.learning.view',
    // Personal permissions (User Level 2 has both personal and team access)
    'personal.dashboard.view', 'personal.assessments.view', 'personal.journeys.view',
    'personal.development.view', 'personal.performance.view', 'personal.insights.view',
    'personal.goals.view', 'personal.learning.view',
    // Experience permissions
    'experiences.view_personal',
    'experiences.take',
    'experiences.view_team',
    'experiences.track_team_progress'
  ],
  'User Level 1': [
    'content.view',
    'learning.view',
    'goals.view',
    // Personal permissions (User Level 1 has personal access)
    'personal.dashboard.view', 'personal.assessments.view', 'personal.journeys.view',
    'personal.development.view', 'personal.performance.view', 'personal.insights.view',
    'personal.goals.view', 'personal.learning.view',
    // Personal experience participation
    'experiences.view_personal',
    'experiences.take'
  ]
};

// View scope definitions for the toggle component
export const VIEW_SCOPES = {
  MY: 'my',
  TEAM: 'team',
  ORG: 'org'
};

// Section-specific view configurations
export const SECTION_VIEW_CONFIG = {
  dashboard: {
    label: 'Dashboard',
    views: {
      my: { label: 'My Dashboard', permission: null }, // Always available
      team: { label: 'Team Dashboard', permission: 'team.dashboard.view' },
      org: { label: 'Org Analytics', permission: 'analytics.view_org' }
    }
  },
  journeys: {
    label: 'Journeys',
    views: {
      my: { label: 'My Journeys', permission: null },
      team: { label: 'Team Journeys', permission: 'team.journeys.view' },
      org: { label: 'Journey Analytics', permission: 'analytics.journeys.view' }
    }
  },
  assessments: {
    label: 'Assessments',
    views: {
      my: { label: 'My Assessment', permission: null },
      team: { label: 'Team Assessments', permission: 'team.assessments.view' },
      org: { label: 'Assessment Analytics', permission: 'analytics.assessments.view' }
    }
  },
  development: {
    label: 'Development',
    views: {
      my: { label: 'My Learning', permission: null },
      team: { label: 'Team Development', permission: 'team.development.view' },
      org: { label: 'Learning Analytics', permission: 'analytics.development.view' }
    }
  },
  performance: {
    label: 'Performance',
    views: {
      my: { label: 'My Goals', permission: null },
      team: { label: 'Team Goals', permission: 'team.performance.view' },
      org: { label: 'Performance Analytics', permission: 'analytics.performance.view' }
    }
  },
  insights: {
    label: 'Insights',
    views: {
      my: { label: 'My Insights', permission: null },
      team: { label: 'Team Insights', permission: 'team.insights.view' },
      org: { label: 'Org Insights', permission: 'analytics.insights.view' }
    }
  },
  experiences: {
    label: 'Experiences',
    views: {
      my: { label: 'My Experiences', permission: null },
      team: { label: 'Team Experiences', permission: 'experiences.view_team' },
      org: { label: 'Org Experiences', permission: 'experiences.view_analytics' }
    }
  }
};

// LocalStorage key for persisting view preferences
export const VIEW_PREFERENCES_KEY = 'curiosity_led_view_preferences';