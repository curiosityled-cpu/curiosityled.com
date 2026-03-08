/**
 * Atreus Configuration
 * Central source of truth for all Atreus behavior
 * 
 * When adding new pages or features:
 * 1. Add page type to PAGE_TYPES
 * 2. Add greeting to PAGE_GREETINGS
 * 3. Add suggestions to PAGE_SUGGESTIONS
 * 4. Add any role-specific overrides to ROLE_OVERRIDES
 * 5. Run validation: validateAtreusConfig()
 */

export const ROLE_TYPES = {
  PLATFORM_ADMIN: 'Platform Admin',
  SUPER_ADMIN: 'Super Administrator',
  PARTNER_ADMIN: 'Partner Business Administrator',
  HR_ADMIN: 'Admin Level 2',
  PROGRAM_MANAGER: 'Admin Level 1',
  MANAGER_OF_MANAGERS: 'User Level 2',
  ORG_LEADER: 'User Level 3',
  INDIVIDUAL_CONTRIBUTOR: 'User Level 1'
};

export const PAGE_TYPES = {
  // Dashboard variations
  DASHBOARD: 'dashboard',
  DASHBOARD_JOURNEYS: 'dashboard-journeys',
  DASHBOARD_ASSESSMENTS: 'dashboard-assessments',
  DASHBOARD_LEARNING: 'dashboard-learning',
  DASHBOARD_GOALS: 'dashboard-goals',
  DASHBOARD_INSIGHTS: 'dashboard-insights',
  
  // Assessment pages
  ASSESSMENT_OVERVIEW: 'assessment-overview',
  ASSESSMENT_TAKING: 'assessment-taking',
  ASSESSMENT_RESULTS: 'assessment-results',
  HR_ASSESSMENT_DASHBOARD: 'hr-assessment-dashboard',
  
  // Learning pages
  LEARNING_LIBRARY: 'learning-library',
  LEARNING_ANALYTICS_DASHBOARD: 'learning-analytics-dashboard', // NEW
  
  // Goals pages
  GOALS_OVERVIEW: 'goals-overview', // 'GOALS' page type removed
  GOALS_ANALYTICS_DASHBOARD: 'goals-analytics-dashboard', // NEW
  
  // Career pages
  CAREER_PATH_EXPLORER: 'career-path-explorer',
  CAREER_PATH_DETAILS: 'career-path-details',
  CAREER_PATH_CREATOR: 'career-path-creator',
  
  // Onboarding pages
  // 'ONBOARDING' page type removed
  ONBOARDING_BUILDER: 'onboarding-builder',
  ONBOARDING_PROGRESS: 'onboarding-progress',
  MY_ONBOARDING: 'my-onboarding',
  
  // Admin pages
  COMMAND_CENTER: 'command-center',
  USER_MANAGEMENT: 'user-management',
  WHITE_LABEL_SETTINGS: 'white-label-settings', // Renamed from WHITE_LABEL
  BUSINESS_MANAGER: 'business-manager',
  
  // Profile pages
  PROFILE: 'profile',
  SETTINGS: 'settings',
  NOTIFICATIONS: 'notifications',
  BILLING: 'billing',
  
  // Portal pages
  SUPER_ADMIN_PORTAL: 'super-admin-portal',
  PARTNER_PORTAL: 'partner-portal',
  
  // Email & Communication
  EMAIL_TEMPLATES: 'email-templates',
  
  // Gamification Management
  GAMIFICATION_MANAGER: 'gamification-manager',
  ACHIEVEMENTS: 'achievements',
  
  // Form Management
  FORM_BUILDER: 'form-builder',
  FORM_BUILDER_DASHBOARD: 'form-builder-dashboard',
  
  // Request System
  REQUEST_DASHBOARD: 'request-dashboard',
  MY_REQUESTS: 'my-requests',
  
  // Journey & Experience pages
  MY_JOURNEYS_OVERVIEW: 'my-journeys-overview',
  JOURNEY_BUILDER: 'journey-builder',
  JOURNEY_DETAILS: 'journey-details',
  EXPERIENCE_MANAGEMENT: 'experience-management',
  EXPERIENCE_ANALYTICS: 'experience-analytics',
  MY_EXPERIENCES: 'my-experiences',
  TEAM_EXPERIENCES: 'team-experiences',
  
  // Learning Analytics
  LEARNING_ANALYTICS_DASHBOARD: 'learning-analytics-dashboard',
  
  // Privacy & Security
  PRIVACY_SETTINGS: 'privacy-settings',
  SECURITY_AUDIT: 'security-audit',
  
  // Role & Competency Management
  ROLE_MANAGEMENT: 'role-management',
  ROLE_SELECTOR: 'role-selector',
  COMPETENCY_MANAGEMENT: 'competency-management',
  
  // Analytics Dashboards
  ASSESSMENT_ANALYTICS_DASHBOARD: 'assessment-analytics-dashboard',
  LEADERSHIP_INDEX_ANALYTICS: 'leadership-index-analytics',
  
  // Additional Forms
  FORM_SUBMISSIONS: 'form-submissions',
  PUBLIC_REQUEST_SUBMISSION: 'public-request-submission'
};

export const PAGE_GREETINGS = {
  [PAGE_TYPES.DASHBOARD]: (user, role) => {
    const roleSpecific = {
      [ROLE_TYPES.PLATFORM_ADMIN]: 'As a Platform Admin, I can help you monitor platform-wide metrics, manage organizations, and analyze system health.',
      [ROLE_TYPES.SUPER_ADMIN]: 'As an Organization Admin, I can help you oversee your organization\'s leadership development programs and user analytics.',
      [ROLE_TYPES.HR_ADMIN]: 'As an HR Admin, I can help you manage assessments, track learning engagement, and support your team\'s development.',
      [ROLE_TYPES.PROGRAM_MANAGER]: 'As a Program Manager, I can help you design and deploy leadership programs for your teams.',
      [ROLE_TYPES.ORG_LEADER]: 'As an Organizational Leader, I can help you understand team dynamics, succession planning, and strategic leadership development.',
      [ROLE_TYPES.MANAGER_OF_MANAGERS]: 'As a Manager of Managers, I can help you develop your team leads, track their progress, and build organizational capability.',
      [ROLE_TYPES.INDIVIDUAL_CONTRIBUTOR]: 'Welcome! I can help you navigate your leadership journey, set goals, and find learning resources.'
    };
    const greeting = roleSpecific[role] || 'Welcome! I\'m here to help you with your leadership development journey.';
    return `Hi ${user.first_name || user.full_name?.split(' ')[0] || 'there'}! I'm Atreus, your AI leadership coach. I can see you're on your main dashboard. ${greeting}`;
  },
  
  [PAGE_TYPES.DASHBOARD_JOURNEYS]: (firstName) =>
    `Hi ${firstName}! Looking at your leadership journeys? I can help you navigate career paths, understand role requirements, or create development plans.`,
  
  [PAGE_TYPES.DASHBOARD_ASSESSMENTS]: (firstName) =>
    `Hi ${firstName}! Ready to explore assessments? I can guide you through taking an assessment, explain your results, or help you act on insights.`,
  
  [PAGE_TYPES.DASHBOARD_LEARNING]: (firstName) =>
    `Hi ${firstName}! Time to learn! I can recommend resources based on your profile, help you find specific topics, or track your learning progress.`,
  
  [PAGE_TYPES.DASHBOARD_GOALS]: (firstName) =>
    `Hi ${firstName}! Let's focus on your goals. I can help you create meaningful development goals, track progress, or align them with your career path.`,
  
  [PAGE_TYPES.DASHBOARD_INSIGHTS]: (firstName) =>
    `Hi ${firstName}! Looking for insights? I can analyze your development data, identify trends, or suggest focus areas.`,
  
  [PAGE_TYPES.ASSESSMENT_OVERVIEW]: (firstName) =>
    `Hi ${firstName}! Ready to take your Leadership Index assessment? I can explain what to expect, how long it takes, and what you'll learn.`,
  
  [PAGE_TYPES.ASSESSMENT_TAKING]: (firstName) =>
    `Hi ${firstName}! I see you're taking an assessment. Take your time and answer honestly. I'll be here when you're done to discuss your results!`,
  
  [PAGE_TYPES.ASSESSMENT_RESULTS]: (firstName) =>
    `Hi ${firstName}! Congratulations on completing your assessment! Let's explore your results and create an action plan.`,
  
  [PAGE_TYPES.HR_ASSESSMENT_DASHBOARD]: (firstName, role) =>
    role === ROLE_TYPES.PLATFORM_ADMIN || role === ROLE_TYPES.SUPER_ADMIN ?
      `Hi ${firstName}! You're viewing the Assessments Dashboard. I can help you analyze org-wide data, identify trends, or export reports.` :
      `Hi ${firstName}! Welcome to the Assessments Dashboard.`,
  
  [PAGE_TYPES.LEARNING_LIBRARY]: (firstName) =>
    `Hi ${firstName}! Welcome to the learning library. I can recommend resources based on your competencies, help you search, or track your progress.`,
  
  [PAGE_TYPES.GOALS_OVERVIEW]: (firstName) => // Changed from GOALS to GOALS_OVERVIEW
    `Hi ${firstName}! Let's work on your development goals. I can help you create, update, or align goals with your career aspirations.`,

  [PAGE_TYPES.GOALS_ANALYTICS_DASHBOARD]: (user, role) => { // NEW
    return `Hi ${user.first_name || user.full_name?.split(' ')[0]}! I can see you're reviewing goals analytics. I can help you analyze goal completion trends, identify users who need support, or drill into department-specific performance.`;
  },
  
  [PAGE_TYPES.CAREER_PATH_EXPLORER]: (firstName) =>
    `Hi ${firstName}! Exploring career opportunities? I can help you understand different paths, assess your readiness, or create a development roadmap.`,
  
  [PAGE_TYPES.CAREER_PATH_DETAILS]: (firstName) =>
    `Hi ${firstName}! Looking at a specific career path? I can assess your readiness, show skill gaps, or recommend learning resources.`,
  
  [PAGE_TYPES.CAREER_PATH_CREATOR]: (firstName) =>
    `Hi ${firstName}! Creating a career path? I can help you define competencies, set milestones, or structure the development journey.`,
  
  [PAGE_TYPES.ONBOARDING_BUILDER]: (firstName) =>
    `Hi ${firstName}! Building an onboarding plan? I can help you create milestones, assign learning, or customize the journey.`,
  
  [PAGE_TYPES.MY_ONBOARDING]: (firstName) =>
    `Hi ${firstName}! Tracking your onboarding? I can show you what's next, help you complete tasks, or answer questions.`,
  
  [PAGE_TYPES.COMMAND_CENTER]: (firstName, role) =>
    `Hi ${firstName}! You're in the Command Center. I can help you ${getCommandCenterHelp(role)}.`,
  
  [PAGE_TYPES.USER_MANAGEMENT]: (firstName) =>
    `Hi ${firstName}! Managing users? I can help you invite team members, assign roles, or bulk import from CSV.`,
  
  [PAGE_TYPES.WHITE_LABEL_SETTINGS]: (firstName, role) => // Renamed from WHITE_LABEL
    `Hi ${firstName}! Configuring branding? I can suggest color schemes, help with logos, or guide you through white label customization.`,
  
  [PAGE_TYPES.BUSINESS_MANAGER]: (firstName, role) =>
    role === ROLE_TYPES.PLATFORM_ADMIN ?
      `Hi ${firstName}! Managing your business? I can help you add clients, configure partners, or track revenue.` :
      `Hi ${firstName}! You're in Business Manager. I can help you manage your organization's settings.`,
  
  [PAGE_TYPES.PROFILE]: (firstName) =>
    `Hi ${firstName}! Managing your profile? I can help you update information, configure notifications, or review your development journey.`,
  
  [PAGE_TYPES.SETTINGS]: (firstName) =>
    `Hi ${firstName}! In Settings? I can help you configure notifications, set up integrations, or manage preferences.`,
  
  [PAGE_TYPES.NOTIFICATIONS]: (firstName) =>
    `Hi ${firstName}! Checking notifications? I can help you manage alerts, mark as read, or configure notification preferences.`,
  
  [PAGE_TYPES.BILLING]: (firstName) =>
    `Hi ${firstName}! Managing billing? I can help you view your subscription, see invoices, or update payment details.`,
  
  [PAGE_TYPES.SUPER_ADMIN_PORTAL]: (firstName) =>
    `Hi ${firstName}! Welcome to the Super Admin Portal. I can help you with organization-level management and analytics.`,
  
  [PAGE_TYPES.PARTNER_PORTAL]: (firstName) =>
    `Hi ${firstName}! Welcome to the Partner Portal. I can help you manage partner clients and configurations.`,
  
  [PAGE_TYPES.EMAIL_TEMPLATES]: (firstName, role) =>
    role === ROLE_TYPES.PLATFORM_ADMIN ?
      `Hi ${firstName}! Managing email templates? I can help you generate templates with AI, suggest subject lines, or explain template variables.` :
      `Hi ${firstName}! Welcome to Email Templates.`,
  
  [PAGE_TYPES.GAMIFICATION_MANAGER]: (firstName) =>
    `Hi ${firstName}! Setting up gamification? I can design badge structures, suggest point values, create competitions, or optimize your gamification strategy.`,
  
  [PAGE_TYPES.ACHIEVEMENTS]: (firstName) =>
    `Hi ${firstName}! Checking your achievements? I can explain badge criteria, suggest strategies to level up faster, or show your leaderboard standing.`,
  
  [PAGE_TYPES.FORM_BUILDER]: (firstName) =>
    `Hi ${firstName}! Building a form? I can help you design questions, add conditional logic, or suggest form structure.`,
  
  [PAGE_TYPES.FORM_BUILDER_DASHBOARD]: (firstName) =>
    `Hi ${firstName}! Managing forms? I can help you analyze submissions, export data, or create new forms.`,
  
  [PAGE_TYPES.REQUEST_DASHBOARD]: (firstName, role) =>
    ['Admin Level 1', 'Admin Level 2', 'Super Administrator'].includes(role) ?
      `Hi ${firstName}! Reviewing requests? I can help you triage, assign, analyze trends, or automate workflows.` :
      `Hi ${firstName}! Tracking requests? I can help you submit, track status, or view analytics.`,
  
  [PAGE_TYPES.MY_REQUESTS]: (firstName) =>
    `Hi ${firstName}! Tracking your requests? I can help you submit new requests, check status, or view history.`,
  
  [PAGE_TYPES.MY_JOURNEYS_OVERVIEW]: (firstName) =>
    `Hi ${firstName}! Exploring your journeys? I can show your progress, recommend next steps, or help you enroll in new paths.`,
  
  [PAGE_TYPES.JOURNEY_BUILDER]: (firstName) =>
    `Hi ${firstName}! Building a learning journey? I can help structure content, select resources, set prerequisites, or add milestones.`,
  
  [PAGE_TYPES.JOURNEY_DETAILS]: (firstName) =>
    `Hi ${firstName}! Reviewing a journey? I can explain the path, show prerequisites, estimate completion time, or help you enroll.`,
  
  [PAGE_TYPES.EXPERIENCE_MANAGEMENT]: (firstName) =>
    `Hi ${firstName}! Managing experiences? I can help you create journeys, assign onboarding plans, build forms, or analyze engagement.`,
  
  [PAGE_TYPES.EXPERIENCE_ANALYTICS]: (firstName) =>
    `Hi ${firstName}! Analyzing experiences? I can help you understand engagement metrics, identify trends, or export reports.`,
  
  [PAGE_TYPES.MY_EXPERIENCES]: (firstName) =>
    `Hi ${firstName}! Exploring your experiences? I can show what's assigned, recommend next steps, or track your progress.`,
  
  [PAGE_TYPES.TEAM_EXPERIENCES]: (firstName) =>
    `Hi ${firstName}! Reviewing team experiences? I can show team progress, identify who needs support, or suggest assignments.`,
  
  [PAGE_TYPES.LEARNING_ANALYTICS_DASHBOARD]: (firstName) =>
    `Hi ${firstName}! Analyzing learning data? I can help you understand engagement trends, identify skill gaps, or export learning reports.`,
  
  [PAGE_TYPES.PRIVACY_SETTINGS]: (firstName) =>
    `Hi ${firstName}! Managing privacy? I can explain privacy controls, help you download your data, or configure retention settings.`,
  
  [PAGE_TYPES.ROLE_MANAGEMENT]: (firstName) =>
    `Hi ${firstName}! Managing roles? I can help you create custom roles, explain permissions, or bulk assign roles to users.`,
  
  [PAGE_TYPES.ROLE_SELECTOR]: (firstName) =>
    `Hi ${firstName}! Switching roles? I can explain what each role can do or help you select the right view for your current task.`,
  
  [PAGE_TYPES.SECURITY_AUDIT]: (firstName, role) =>
    role === ROLE_TYPES.PLATFORM_ADMIN ?
      `Hi ${firstName}! Reviewing security? I can show login history, identify suspicious activity, analyze session patterns, and export audit logs.` :
      `Hi ${firstName}! Welcome to Security Audit.`,
  
  [PAGE_TYPES.COMPETENCY_MANAGEMENT]: (firstName) =>
    `Hi ${firstName}! Managing competencies? I can help you create competencies, define proficiency levels, map to assessments, link to roles, and suggest development paths.`,
  
  [PAGE_TYPES.ASSESSMENT_ANALYTICS_DASHBOARD]: (firstName) =>
    `Hi ${firstName}! Analyzing assessment data? I can interpret score distributions, identify competency gaps, compare cohorts, detect trends, and recommend development focus areas.`,
  
  [PAGE_TYPES.LEADERSHIP_INDEX_ANALYTICS]: (firstName) =>
    `Hi ${firstName}! Reviewing Leadership Index analytics? I can interpret organizational competency profiles, identify succession risks, benchmark against industry, and suggest strategic development priorities.`,
  
  [PAGE_TYPES.FORM_SUBMISSIONS]: (firstName) =>
    `Hi ${firstName}! Reviewing responses? I can analyze patterns, identify outliers, generate summary reports, and suggest follow-up actions.`,
  
  [PAGE_TYPES.PUBLIC_REQUEST_SUBMISSION]: (firstName) =>
    `Hi ${firstName}! Submitting a development request? I can help you structure your request, provide context, and suggest the right details to include.`
};

export const PAGE_SUGGESTIONS = {
  [PAGE_TYPES.DASHBOARD]: (role) => {
    const baseSuggestions = [
      { text: "Show me my recent activity", icon: "🕒" }, // Added icon
      { text: "What should I focus on this week?", icon: "💡" } // Added icon
    ];

    const roleSuggestions = {
      [ROLE_TYPES.PLATFORM_ADMIN]: [
        { text: "Show me platform analytics", icon: "📊" },
        { text: "Take me to user management", icon: "👥" },
        { text: "View assessment dashboard", icon: "📈" }
      ],
      [ROLE_TYPES.SUPER_ADMIN]: [
        { text: "Show me organization metrics", icon: "📈" },
        { text: "View team performance", icon: "👥" },
        { text: "Access assessment analytics", icon: "📊" }
      ],
      [ROLE_TYPES.HR_ADMIN]: [
        { text: "Show me team assessment data", icon: "📊" },
        { text: "View learning engagement metrics", icon: "📈" },
        { text: "Help me design a development program", icon: "🎯" }
      ],
      [ROLE_TYPES.PROGRAM_MANAGER]: [
        { text: "Show me my program cohorts", icon: "🧑‍🤝‍🧑" },
        { text: "Help me assign learning resources", icon: "📚" },
        { text: "View program engagement metrics", icon: "📈" }
      ],
      [ROLE_TYPES.ORG_LEADER]: [
        { text: "Show me organizational insights", icon: "💡" },
        { text: "View succession planning data", icon: "🌳" },
        { text: "Analyze team competency gaps", icon: "🔍" }
      ],
      [ROLE_TYPES.MANAGER_OF_MANAGERS]: [
        { text: "Show me my team's goals", icon: "🎯" },
        { text: "View team development progress", icon: "📈" },
        { text: "Help me set team objectives", icon: "✔️" }
      ],
      [ROLE_TYPES.INDIVIDUAL_CONTRIBUTOR]: [
        { text: "Show me my development plan", icon: "🗺️" },
        { text: "Help me set a development goal", icon: "🎯" },
        { text: "Recommend learning resources", icon: "📚" }
      ]
    };

    return [...baseSuggestions, ...(roleSuggestions[role] || [])];
  },
  
  [PAGE_TYPES.DASHBOARD_JOURNEYS]: {
    default: [
      { text: "Explore career paths", icon: "🗺️" },
      { text: "View my onboarding progress", icon: "🚀" },
      { text: "Compare different roles", icon: "🔀" }
    ]
  },
  
  [PAGE_TYPES.DASHBOARD_ASSESSMENTS]: {
    default: [
      { text: "Take a leadership assessment", icon: "📝" },
      { text: "View my assessment results", icon: "📊" },
      { text: "Compare my scores over time", icon: "📈" }
    ]
  },
  
  [PAGE_TYPES.DASHBOARD_LEARNING]: {
    default: [
      { text: "Browse learning library", icon: "📚" },
      { text: "View my assigned learning", icon: "📖" },
      { text: "Track learning progress", icon: "✅" }
    ]
  },
  
  [PAGE_TYPES.DASHBOARD_GOALS]: {
    default: [
      { text: "View all my goals", icon: "🎯" },
      { text: "Create a new goal", icon: "➕" },
      { text: "Update goal progress", icon: "📈" }
    ]
  },
  
  [PAGE_TYPES.DASHBOARD_INSIGHTS]: {
    default: [
      { text: "Show development trends", icon: "📊" },
      { text: "Compare to benchmarks", icon: "📉" },
      { text: "Get AI recommendations", icon: "✨" }
    ]
  },
  
  [PAGE_TYPES.WHITE_LABEL_SETTINGS]: { // Renamed from WHITE_LABEL
    default: [
      { text: "Suggest a professional color palette", icon: "🎨" },
      { text: "Help me choose fonts", icon: "✍️" },
      { text: "Explain logo requirements", icon: "🖼️" },
      { text: "Show branding best practices", icon: "✨" }
    ]
  },
  
  [PAGE_TYPES.USER_MANAGEMENT]: {
    default: [
      { text: "How do I invite users?", icon: "✉️" },
      { text: "Explain user roles", icon: "👤" },
      { text: "Bulk import from CSV", icon: "📄" }
    ],
    [ROLE_TYPES.PLATFORM_ADMIN]: [
      { text: "How do I invite users?", icon: "✉️" },
      { text: "Explain user roles", icon: "👤" },
      { text: "Bulk import from CSV", icon: "📄" },
      { text: "Create an onboarding plan", icon: "🚀" }
    ],
    [ROLE_TYPES.SUPER_ADMIN]: [
      { text: "How do I invite users?", icon: "✉️" },
      { text: "Explain user roles", icon: "👤" },
      { text: "Bulk import from CSV", icon: "📄" },
      { text: "Create an onboarding plan", icon: "🚀" }
    ],
    [ROLE_TYPES.PROGRAM_MANAGER]: [
      { text: "How do I invite users?", icon: "✉️" },
      { text: "Explain user roles", icon: "👤" },
      { text: "Bulk import from CSV", icon: "📄" },
      { text: "Create an onboarding plan", icon: "🚀" }
    ]
  },
  
  [PAGE_TYPES.HR_ASSESSMENT_DASHBOARD]: {
    default: [
      { text: "Take the assessment", icon: "📝" },
      { text: "Learn about assessments", icon: "❓" },
      { text: "View sample questions", icon: "👀" }
    ],
    [ROLE_TYPES.PLATFORM_ADMIN]: [
      { text: "Show at-risk participants", icon: "⚠️" },
      { text: "Export assessment data", icon: "📥" },
      { text: "View completion rates", icon: "📊" },
      { text: "Send reminder emails", icon: "📧" }
    ],
    [ROLE_TYPES.SUPER_ADMIN]: [
      { text: "Show at-risk participants", icon: "⚠️" },
      { text: "Export assessment data", icon: "📥" },
      { text: "View completion rates", icon: "📊" },
      { text: "Send reminder emails", icon: "📧" }
    ],
    [ROLE_TYPES.HR_ADMIN]: [
      { text: "Show at-risk participants", icon: "⚠️" },
      { text: "Export assessment data", icon: "📥" },
      { text: "View completion rates", icon: "📊" },
      { text: "Send reminder emails", icon: "📧" }
    ]
  },
  
  [PAGE_TYPES.ASSESSMENT_TAKING]: {
    default: [
      { text: "Tips for honest responses", icon: "💡" },
      { text: "How long will this take?", icon: "⏱️" },
      { text: "Can I save and continue later?", icon: "💾" }
    ]
  },
  
  [PAGE_TYPES.ASSESSMENT_RESULTS]: {
    default: [
      { text: "Explain my competency scores", icon: "📊" },
      { text: "Create goals from my results", icon: "🎯" },
      { text: "Find learning resources", icon: "📚" },
      { text: "Download my assessment PDF", icon: "⬇️" },
      { text: "Compare to benchmarks", icon: "📉" }
    ]
  },
  
  [PAGE_TYPES.LEARNING_LIBRARY]: {
    default: [
      { text: "Recommend resources for me", icon: "✨" },
      { text: "Find leadership courses", icon: "📖" },
      { text: "Show trending resources", icon: "🔥" },
      { text: "Filter by my competencies", icon: "🎯" }
    ],
    [ROLE_TYPES.MANAGER_OF_MANAGERS]: [
      { text: "Recommend resources for me", icon: "✨" },
      { text: "Find leadership courses", icon: "📖" },
      { text: "Show trending resources", icon: "🔥" },
      { text: "Filter by my competencies", icon: "🎯" },
      { text: "Assign learning to my team", icon: "👥" }
    ],
    [ROLE_TYPES.PROGRAM_MANAGER]: [
      { text: "Recommend resources for me", icon: "✨" },
      { text: "Find leadership courses", icon: "📖" },
      { text: "Show trending resources", icon: "🔥" },
      { text: "Filter by my competencies", icon: "🎯" },
      { text: "Assign learning to my team", icon: "👥" }
    ],
    [ROLE_TYPES.HR_ADMIN]: [
      { text: "Recommend resources for me", icon: "✨" },
      { text: "Find leadership courses", icon: "📖" },
      { text: "Show trending resources", icon: "🔥" },
      { text: "Filter by my competencies", icon: "🎯" },
      { text: "Assign learning to my team", icon: "👥" }
    ]
  },
  
  [PAGE_TYPES.GOALS_OVERVIEW]: { // Changed from GOALS to GOALS_OVERVIEW
    default: [
      { text: "Help me create a SMART goal", icon: "🎯" },
      { text: "Update my progress", icon: "📈" },
      { text: "Show overdue goals", icon: "⚠️" },
      { text: "Align goals with career path", icon: "🗺️" }
    ],
    [ROLE_TYPES.MANAGER_OF_MANAGERS]: [
      { text: "Help me create a SMART goal", icon: "🎯" },
      { text: "Update my progress", icon: "📈" },
      { text: "Show overdue goals", icon: "⚠️" },
      { text: "Cascade a goal to my team", icon: "📤" }
    ],
    [ROLE_TYPES.PROGRAM_MANAGER]: [
      { text: "Help me create a SMART goal", icon: "🎯" },
      { text: "Update my progress", icon: "📈" },
      { text: "Show overdue goals", icon: "⚠️" },
      { text: "Cascade a goal to my team", icon: "📤" }
    ]
  },

  [PAGE_TYPES.GOALS_ANALYTICS_DASHBOARD]: (role) => { // NEW
    return [
      { text: 'Show me overdue goals', icon: '⚠️' },
      { text: 'Analyze goal completion by department', icon: '📊' },
      { text: 'Who are the top goal achievers?', icon: '🏆' },
      { text: 'Export goals data', icon: '📥' },
      { text: 'Show me goals at risk', icon: '🚨' }
    ];
  },
  
  [PAGE_TYPES.BUSINESS_MANAGER]: {
    [ROLE_TYPES.PLATFORM_ADMIN]: [
      { text: "Add a new client", icon: "🏢" },
      { text: "Configure partner settings", icon: "🤝" },
      { text: "View revenue analytics", icon: "💰" },
      { text: "Manage subscriptions", icon: "💳" }
    ],
    [ROLE_TYPES.PARTNER_ADMIN]: [
      { text: "View my clients", icon: "🏢" },
      { text: "Configure my branding", icon: "🎨" },
      { text: "Add a new client", icon: "➕" }
    ]
  },
  
  [PAGE_TYPES.COMMAND_CENTER]: {
    default: [
      { text: "Show at-risk team members", icon: "⚠️" },
      { text: "Send a team nudge", icon: "📬" },
      { text: "Analyze cohort performance", icon: "📊" },
      { text: "Create an intervention plan", icon: "🎯" },
      { text: "Export team report", icon: "📥" }
    ]
  },
  
  [PAGE_TYPES.CAREER_PATH_EXPLORER]: {
    default: [
      { text: "Show my career readiness", icon: "🎯" },
      { text: "Compare career paths", icon: "🔀" },
      { text: "Create a development roadmap", icon: "🗺️" },
      { text: "Find skill gaps", icon: "🔍" }
    ]
  },
  
  [PAGE_TYPES.CAREER_PATH_DETAILS]: {
    default: [
      { text: "Assess my readiness for this role", icon: "📊" },
      { text: "Show required competencies", icon: "📋" },
      { text: "Find relevant learning", icon: "📚" },
      { text: "Create development plan", icon: "🗺️" }
    ]
  },
  
  [PAGE_TYPES.ONBOARDING_BUILDER]: {
    default: [
      { text: "Generate an onboarding plan", icon: "🚀" },
      { text: "Add milestones", icon: "🏁" },
      { text: "Assign learning resources", icon: "📚" },
      { text: "Set up check-ins", icon: "✅" }
    ]
  },
  
  [PAGE_TYPES.MY_ONBOARDING]: {
    default: [
      { text: "Show my progress", icon: "📈" },
      { text: "View upcoming milestones", icon: "🏁" },
      { text: "Complete a task", icon: "✅" },
      { text: "Ask for help", icon: "❓" }
    ]
  },
  
  [PAGE_TYPES.PROFILE]: {
    default: [
      { text: "Update my information", icon: "✏️" },
      { text: "Change notification settings", icon: "🔔" },
      { text: "View my development journey", icon: "🗺️" },
      { text: "Export my data", icon: "📥" }
    ]
  },
  
  [PAGE_TYPES.SETTINGS]: {
    default: [
      { text: "Configure notifications", icon: "🔔" },
      { text: "Set up integrations", icon: "🔌" },
      { text: "Manage preferences", icon: "⚙️" },
      { text: "Review privacy settings", icon: "🔒" }
    ]
  },
  
  [PAGE_TYPES.BILLING]: {
    default: [
      { text: "View my subscription", icon: "💳" },
      { text: "See invoice history", icon: "📄" },
      { text: "Upgrade my plan", icon: "⬆️" },
      { text: "Update payment method", icon: "💰" }
    ]
  },
  
  [PAGE_TYPES.NOTIFICATIONS]: {
    default: [
      { text: "Mark all as read", icon: "✅" },
      { text: "Configure notification types", icon: "🔔" },
      { text: "View important only", icon: "⚠️" }
    ]
  },
  
  [PAGE_TYPES.SUPER_ADMIN_PORTAL]: {
    default: [
      { text: "View all organizations", icon: "🏢" },
      { text: "Platform analytics", icon: "📊" },
      { text: "System configuration", icon: "⚙️" }
    ]
  },
  
  [PAGE_TYPES.PARTNER_PORTAL]: {
    default: [
      { text: "View partner dashboard", icon: "🤝" },
      { text: "Manage partner clients", icon: "🏢" },
      { text: "Configure partner branding", icon: "🎨" }
    ]
  },
  
  [PAGE_TYPES.EMAIL_TEMPLATES]: {
    default: [
      { text: "Generate a new template with AI", icon: "✨" },
      { text: "Show template best practices", icon: "📋" },
      { text: "Suggest subject lines", icon: "💡" },
      { text: "Preview template variables", icon: "🔍" }
    ],
    [ROLE_TYPES.PLATFORM_ADMIN]: [
      { text: "Generate a new template with AI", icon: "✨" },
      { text: "Show template best practices", icon: "📋" },
      { text: "Suggest subject lines", icon: "💡" },
      { text: "Seed default templates", icon: "🌱" }
    ]
  },
  
  [PAGE_TYPES.GAMIFICATION_MANAGER]: {
    [ROLE_TYPES.PLATFORM_ADMIN]: [
      { text: "Design badges for a program", icon: "🎨" },
      { text: "Suggest point values", icon: "💰" },
      { text: "Create a competition", icon: "🏆" },
      { text: "Optimize gamification structure", icon: "⚡" }
    ],
    [ROLE_TYPES.SUPER_ADMIN]: [
      { text: "Design badges for a program", icon: "🎨" },
      { text: "Suggest point values", icon: "💰" },
      { text: "Create a competition", icon: "🏆" }
    ]
  },
  
  [PAGE_TYPES.ACHIEVEMENTS]: {
    default: [
      { text: "How do I earn more badges?", icon: "🎖️" },
      { text: "Show me ways to level up faster", icon: "⚡" },
      { text: "What's my leaderboard standing?", icon: "🏅" },
      { text: "Explain my recent point activities", icon: "📈" }
    ]
  },
  
  [PAGE_TYPES.FORM_BUILDER]: {
    default: [
      { text: "Help me design this form", icon: "📝" },
      { text: "Suggest question types", icon: "❓" },
      { text: "Add conditional logic", icon: "🔀" },
      { text: "Preview form", icon: "👁️" }
    ]
  },
  
  [PAGE_TYPES.REQUEST_DASHBOARD]: {
    default: [
      { text: "Show requests needing attention", icon: "🚨" },
      { text: "Analyze request trends", icon: "📊" },
      { text: "Suggest assignment priorities", icon: "🎯" }
    ]
  },
  
  [PAGE_TYPES.MY_JOURNEYS_OVERVIEW]: {
    default: [
      { text: "Show my journey progress", icon: "🗺️" },
      { text: "Continue where I left off", icon: "▶️" },
      { text: "Explore new journeys", icon: "🔍" },
      { text: "Track completion status", icon: "✅" }
    ]
  },
  
  [PAGE_TYPES.JOURNEY_BUILDER]: {
    default: [
      { text: "Help me structure this journey", icon: "🏗️" },
      { text: "Suggest learning resources", icon: "📚" },
      { text: "Add milestones", icon: "🏁" },
      { text: "Preview journey", icon: "👁️" }
    ]
  },
  
  [PAGE_TYPES.EXPERIENCE_MANAGEMENT]: {
    [ROLE_TYPES.SUPER_ADMIN]: [
      { text: "View all experiences", icon: "🗺️" },
      { text: "Analyze engagement", icon: "📊" },
      { text: "Create new journey", icon: "➕" }
    ]
  },
  
  [PAGE_TYPES.PRIVACY_SETTINGS]: {
    default: [
      { text: "Explain privacy controls", icon: "🔒" },
      { text: "Download my data", icon: "📥" },
      { text: "View access logs", icon: "📋" },
      { text: "Configure data retention", icon: "⚙️" }
    ]
  },
  
  [PAGE_TYPES.ROLE_MANAGEMENT]: {
    [ROLE_TYPES.PLATFORM_ADMIN]: [
      { text: "Create custom role", icon: "➕" },
      { text: "Explain permission system", icon: "🔐" },
      { text: "Bulk assign roles", icon: "👥" },
      { text: "View role dependencies", icon: "🔗" }
    ]
  },
  
  [PAGE_TYPES.SECURITY_AUDIT]: {
    [ROLE_TYPES.PLATFORM_ADMIN]: [
      { text: "Show failed login attempts", icon: "🚫" },
      { text: "Identify suspicious activity", icon: "🔍" },
      { text: "View impersonation history", icon: "👤" },
      { text: "Export security audit log", icon: "📥" }
    ]
  },
  
  [PAGE_TYPES.COMPETENCY_MANAGEMENT]: {
    default: [
      { text: "Create new competency", icon: "➕" },
      { text: "Define proficiency levels", icon: "📊" },
      { text: "Map to assessments", icon: "🔗" },
      { text: "Link to roles", icon: "👥" },
      { text: "Suggest development paths", icon: "🗺️" }
    ]
  },
  
  [PAGE_TYPES.ASSESSMENT_ANALYTICS_DASHBOARD]: {
    default: [
      { text: "Interpret score distribution", icon: "📊" },
      { text: "Identify competency gaps", icon: "🔍" },
      { text: "Compare cohort performance", icon: "👥" },
      { text: "Detect trends", icon: "📈" },
      { text: "Generate benchmark report", icon: "📥" }
    ]
  },
  
  [PAGE_TYPES.LEADERSHIP_INDEX_ANALYTICS]: {
    default: [
      { text: "Show organizational competency profile", icon: "📊" },
      { text: "Identify succession risks", icon: "⚠️" },
      { text: "Benchmark against industry", icon: "📈" },
      { text: "Suggest strategic priorities", icon: "🎯" }
    ]
  },
  
  [PAGE_TYPES.FORM_SUBMISSIONS]: {
    default: [
      { text: "Analyze form submissions", icon: "📈" },
      { text: "Export response data", icon: "📥" },
      { text: "Identify response patterns", icon: "🔍" },
      { text: "Generate summary report", icon: "📊" }
    ]
  },
  
  [PAGE_TYPES.FORM_BUILDER_DASHBOARD]: {
    default: [
      { text: "Analyze submissions", icon: "📈" },
      { text: "Export response data", icon: "📥" },
      { text: "Identify trends", icon: "🔍" },
      { text: "Create new form", icon: "➕" }
    ]
  },
  
  [PAGE_TYPES.MY_REQUESTS]: {
    default: [
      { text: "Submit new request", icon: "➕" },
      { text: "Track my requests", icon: "📍" },
      { text: "View request history", icon: "📜" }
    ]
  },
  
  [PAGE_TYPES.REQUEST_DASHBOARD]: {
    [ROLE_TYPES.PROGRAM_MANAGER]: [
      { text: "Auto-triage new requests", icon: "🤖" },
      { text: "Show high-priority requests", icon: "🚨" },
      { text: "Suggest request assignments", icon: "👥" },
      { text: "Create intervention plan", icon: "📋" }
    ],
    [ROLE_TYPES.HR_ADMIN]: [
      { text: "Auto-triage new requests", icon: "🤖" },
      { text: "Analyze request trends", icon: "📊" },
      { text: "Bulk update statuses", icon: "⚡" },
      { text: "Export request analytics", icon: "📥" }
    ],
    [ROLE_TYPES.SUPER_ADMIN]: [
      { text: "Auto-triage new requests", icon: "🤖" },
      { text: "Analyze request trends", icon: "📊" },
      { text: "Bulk update statuses", icon: "⚡" },
      { text: "Export request analytics", icon: "📥" }
    ],
    default: [
      { text: "Submit new request", icon: "➕" },
      { text: "Track my requests", icon: "📍" },
      { text: "View request history", icon: "📜" }
    ]
  },
  
  [PAGE_TYPES.LEARNING_ANALYTICS_DASHBOARD]: {
    [ROLE_TYPES.HR_ADMIN]: [
      { text: "Interpret engagement trends", icon: "📈" },
      { text: "Identify low performers", icon: "⚠️" },
      { text: "Compare department learning", icon: "🔍" },
      { text: "Export learning report", icon: "📥" }
    ],
    [ROLE_TYPES.PROGRAM_MANAGER]: [
      { text: "Show my cohort's progress", icon: "👥" },
      { text: "Identify struggling learners", icon: "⚠️" },
      { text: "Recommend interventions", icon: "💡" },
      { text: "Generate completion forecast", icon: "🔮" }
    ],
    default: [
      { text: "Show learning trends", icon: "📈" },
      { text: "View my progress", icon: "📊" },
      { text: "Find skill gaps", icon: "🔍" }
    ]
  },
  
  [PAGE_TYPES.JOURNEY_DETAILS]: {
    default: [
      { text: "Explain the path structure", icon: "🗺️" },
      { text: "Show prerequisites", icon: "🔐" },
      { text: "Estimate completion time", icon: "⏱️" },
      { text: "Help me enroll", icon: "✅" }
    ]
  },
  
  [PAGE_TYPES.EXPERIENCE_ANALYTICS]: {
    default: [
      { text: "Interpret engagement metrics", icon: "📊" },
      { text: "Identify trends", icon: "📈" },
      { text: "Compare programs", icon: "🔍" },
      { text: "Generate report", icon: "📥" }
    ]
  },
  
  [PAGE_TYPES.MY_EXPERIENCES]: {
    default: [
      { text: "Show what's assigned to me", icon: "📋" },
      { text: "Recommend next steps", icon: "💡" },
      { text: "Track my progress", icon: "📊" },
      { text: "Suggest focus areas", icon: "🎯" }
    ]
  },
  
  [PAGE_TYPES.TEAM_EXPERIENCES]: {
    default: [
      { text: "Show team progress", icon: "👥" },
      { text: "Identify who needs support", icon: "⚠️" },
      { text: "Suggest assignments", icon: "📚" },
      { text: "Analyze team engagement", icon: "📈" }
    ]
  },
  
  [PAGE_TYPES.PUBLIC_REQUEST_SUBMISSION]: {
    default: [
      { text: "Help me structure my request", icon: "📝" },
      { text: "What details should I include?", icon: "❓" },
      { text: "Explain the process", icon: "🔄" }
    ]
  }
};

// Helper functions
function getRoleGreeting(role) {
  const greetings = {
    [ROLE_TYPES.PLATFORM_ADMIN]: "As a Platform Admin, you have full access to all platform features.",
    [ROLE_TYPES.SUPER_ADMIN]: "As an Organization Admin, you can manage your organization's users and settings.",
    [ROLE_TYPES.PARTNER_ADMIN]: "As a Partner Admin, you can manage your partner's clients and branding.",
    [ROLE_TYPES.HR_ADMIN]: "As an HR Admin, you have access to organizational analytics and reporting.",
    [ROLE_TYPES.PROGRAM_MANAGER]: "As a Program Manager, you can manage cohorts and track participant progress.",
    [ROLE_TYPES.MANAGER_OF_MANAGERS]: "As a senior leader, you can monitor your management team's development.",
    [ROLE_TYPES.ORG_LEADER]: "As an organizational leader, you can view enterprise-wide insights.",
    [ROLE_TYPES.INDIVIDUAL_CONTRIBUTOR]: "I'm here to help you with your leadership development journey."
  };
  return greetings[role] || greetings[ROLE_TYPES.INDIVIDUAL_CONTRIBUTOR];
}

function getCommandCenterHelp(role) {
  const helps = {
    [ROLE_TYPES.PLATFORM_ADMIN]: "monitor platform-wide performance and interventions",
    [ROLE_TYPES.SUPER_ADMIN]: "monitor organizational performance and send interventions",
    [ROLE_TYPES.PROGRAM_MANAGER]: "manage cohorts and track participant progress",
    [ROLE_TYPES.HR_ADMIN]: "analyze org-wide analytics and identify trends",
    [ROLE_TYPES.MANAGER_OF_MANAGERS]: "monitor your management team's development",
    [ROLE_TYPES.ORG_LEADER]: "view enterprise-wide leadership insights"
  };
  return helps[role] || "analyze team performance";
}

// Validation function
export function validateAtreusConfig() {
  const errors = [];
  const warnings = [];
  
  // Check all page types have greetings
  Object.values(PAGE_TYPES).forEach(pageType => {
    if (!PAGE_GREETINGS[pageType]) {
      errors.push(`Missing greeting for page type: ${pageType}`);
    }
  });
  
  // Check all page types have suggestions
  Object.values(PAGE_TYPES).forEach(pageType => {
    if (!PAGE_SUGGESTIONS[pageType]) {
      warnings.push(`Missing suggestions for page type: ${pageType}`);
    }
  });
  
  // Check all greetings have corresponding page types
  Object.keys(PAGE_GREETINGS).forEach(pageType => {
    if (!Object.values(PAGE_TYPES).includes(pageType)) {
      warnings.push(`Greeting defined for unknown page type: ${pageType}`);
    }
  });
  
  // Check all suggestions have corresponding page types
  Object.keys(PAGE_SUGGESTIONS).forEach(pageType => {
    if (!Object.values(PAGE_TYPES).includes(pageType)) {
      warnings.push(`Suggestions defined for unknown page type: ${pageType}`);
    }
  });
  
  return { errors, warnings, isValid: errors.length === 0 };
}